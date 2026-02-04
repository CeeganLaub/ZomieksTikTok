// Server actions for subscription management
"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { subscriptions, users, transactions } from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { notify } from "@/lib/notifications";
import { createPayFastPayment } from "@/lib/payments/payfast";
import { PAYFAST_CONFIG } from "@/lib/payments/config";

function generateId(): string {
  return crypto.randomUUID();
}

export interface ActionResult {
  success: boolean;
  error?: string;
  paymentUrl?: string;
  subscriptionId?: string;
}

export interface SubscriptionDetails {
  id: string;
  plan: "free" | "monthly" | "annual";
  status: "active" | "cancelled" | "expired" | "past_due";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  bidsUsed: number;
  servicesUsed: number;
  canUpgrade: boolean;
  canCancel: boolean;
  daysRemaining: number;
}

// Plan pricing in ZAR cents
export const PLAN_PRICES = {
  monthly: 9900, // R99
  annual: 99900, // R999 (2 months free)
} as const;

export const PLAN_FEATURES = {
  free: {
    maxBids: 5,
    maxServices: 1,
    canOutsource: false,
    canShortlist: false,
  },
  monthly: {
    maxBids: null, // unlimited
    maxServices: null, // unlimited
    canOutsource: true,
    canShortlist: true,
  },
  annual: {
    maxBids: null,
    maxServices: null,
    canOutsource: true,
    canShortlist: true,
  },
} as const;

/**
 * Get current subscription details
 */
export async function getSubscription(): Promise<SubscriptionDetails | null> {
  const session = await getServerSession();

  if (!session) {
    return null;
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.userId),
    });

    if (!subscription) {
      // Create free subscription
      const now = new Date().toISOString();
      const freeId = generateId();
      
      await db.insert(subscriptions).values({
        id: freeId,
        userId: session.userId,
        plan: "free",
        status: "active",
        bidsUsed: 0,
        servicesUsed: 0,
        currentPeriodStart: now,
        currentPeriodEnd: now, // Free plan has no end
        createdAt: now,
        updatedAt: now,
      });

      return {
        id: freeId,
        plan: "free",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: now,
        cancelledAt: null,
        bidsUsed: 0,
        servicesUsed: 0,
        canUpgrade: true,
        canCancel: false,
        daysRemaining: 0,
      };
    }

    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelledAt: subscription.cancelledAt,
      bidsUsed: subscription.bidsUsed,
      servicesUsed: subscription.servicesUsed,
      canUpgrade: subscription.plan === "free" || (subscription.plan === "monthly" && subscription.status === "active"),
      canCancel: subscription.plan !== "free" && subscription.status === "active" && !subscription.cancelledAt,
      daysRemaining,
    };
  } catch (error) {
    console.error("Get subscription error:", error);
    return null;
  }
}

/**
 * Create checkout session for subscription
 */
export async function createCheckoutSession(
  plan: "monthly" | "annual"
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Check current subscription
    const currentSub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.userId),
    });

    if (currentSub && currentSub.plan !== "free" && currentSub.status === "active") {
      return { success: false, error: "You already have an active subscription" };
    }

    const amount = PLAN_PRICES[plan];
    const reference = `SUB-${plan.toUpperCase()}-${Date.now()}-${session.userId.slice(0, 8)}`;
    const baseUrl = "https://zomieks.co.za"; // TODO: Get from environment

    // Use mock checkout in development or when PayFast not configured
    if (!PAYFAST_CONFIG.merchantId || PAYFAST_CONFIG.isTest) {
      const paymentUrl = `/dashboard/subscription/checkout?plan=${plan}&ref=${reference}&amount=${amount}`;
      return { success: true, paymentUrl };
    }

    // Create real PayFast payment
    const paymentResult = await createPayFastPayment(
      {
        reference,
        orderId: reference,
        amount,
        description: `Zomieks Pro ${plan === "annual" ? "Annual" : "Monthly"} Subscription`,
        buyerEmail: user.email,
        buyerName: user.name || undefined,
        provider: "payfast",
      },
      baseUrl
    );

    if (!paymentResult.success || !paymentResult.redirectUrl) {
      return { success: false, error: paymentResult.error || "Failed to create payment" };
    }

    return { success: true, paymentUrl: paymentResult.redirectUrl };
  } catch (error) {
    console.error("Create checkout session error:", error);
    return { success: false, error: "Failed to create checkout session" };
  }
}

/**
 * Confirm subscription payment (called after PayFast webhook or mock payment)
 */
export async function confirmSubscription(
  plan: "monthly" | "annual",
  paymentReference: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const now = new Date();
    const periodEnd = new Date();
    
    if (plan === "monthly") {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Get current subscription
    const currentSub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.userId),
    });

    if (currentSub) {
      // Update existing subscription
      await db
        .update(subscriptions)
        .set({
          plan,
          status: "active",
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
          paymentReference,
          cancelledAt: null,
          updatedAt: now.toISOString(),
        })
        .where(eq(subscriptions.id, currentSub.id));
    } else {
      // Create new subscription
      await db.insert(subscriptions).values({
        id: generateId(),
        userId: session.userId,
        plan,
        status: "active",
        bidsUsed: 0,
        servicesUsed: 0,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        paymentReference,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    // Record transaction
    await db.insert(transactions).values({
      id: generateId(),
      userId: session.userId,
      type: "subscription",
      amount: PLAN_PRICES[plan],
      currency: "ZAR",
      provider: "payfast",
      providerReference: paymentReference,
      status: "completed",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: now.toISOString(),
    });

    // Notify user
    await notify(db, {
      userId: session.userId,
      type: "system",
      title: "Subscription Activated!",
      message: `Your ${plan} Pro subscription is now active. Enjoy unlimited access!`,
      sendEmail: true,
      emailData: { plan },
    });

    revalidatePath("/dashboard/subscription");
    return { success: true };
  } catch (error) {
    console.error("Confirm subscription error:", error);
    return { success: false, error: "Failed to confirm subscription" };
  }
}

/**
 * Cancel subscription (at period end)
 */
export async function cancelSubscription(): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.userId),
    });

    if (!subscription) {
      return { success: false, error: "No subscription found" };
    }

    if (subscription.plan === "free") {
      return { success: false, error: "Cannot cancel free plan" };
    }

    if (subscription.cancelledAt) {
      return { success: false, error: "Subscription is already cancelled" };
    }

    const now = new Date().toISOString();

    await db
      .update(subscriptions)
      .set({
        cancelledAt: now,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, subscription.id));

    await notify(db, {
      userId: session.userId,
      type: "system",
      title: "Subscription Cancelled",
      message: `Your subscription will end on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}. You can resubscribe anytime.`,
      sendEmail: true,
    });

    revalidatePath("/dashboard/subscription");
    return { success: true };
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return { success: false, error: "Failed to cancel subscription" };
  }
}

/**
 * Reactivate cancelled subscription
 */
export async function reactivateSubscription(): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.userId),
    });

    if (!subscription) {
      return { success: false, error: "No subscription found" };
    }

    if (!subscription.cancelledAt) {
      return { success: false, error: "Subscription is not cancelled" };
    }

    // Check if still within period
    if (new Date(subscription.currentPeriodEnd) < new Date()) {
      return { success: false, error: "Subscription has expired. Please subscribe again." };
    }

    await db
      .update(subscriptions)
      .set({
        cancelledAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscriptions.id, subscription.id));

    await notify(db, {
      userId: session.userId,
      type: "system",
      title: "Subscription Reactivated",
      message: "Your Pro subscription is active again!",
      sendEmail: true,
    });

    revalidatePath("/dashboard/subscription");
    return { success: true };
  } catch (error) {
    console.error("Reactivate subscription error:", error);
    return { success: false, error: "Failed to reactivate subscription" };
  }
}

/**
 * Get subscription usage
 */
export async function getSubscriptionUsage(): Promise<{
  bidsUsed: number;
  bidsLimit: number | null;
  servicesUsed: number;
  servicesLimit: number | null;
  canOutsource: boolean;
}> {
  const session = await getServerSession();

  if (!session) {
    return {
      bidsUsed: 0,
      bidsLimit: 5,
      servicesUsed: 0,
      servicesLimit: 1,
      canOutsource: false,
    };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.userId),
    });

    if (!subscription) {
      return {
        bidsUsed: 0,
        bidsLimit: 5,
        servicesUsed: 0,
        servicesLimit: 1,
        canOutsource: false,
      };
    }

    const features = PLAN_FEATURES[subscription.plan];

    return {
      bidsUsed: subscription.bidsUsed,
      bidsLimit: features.maxBids,
      servicesUsed: subscription.servicesUsed,
      servicesLimit: features.maxServices,
      canOutsource: features.canOutsource,
    };
  } catch (error) {
    console.error("Get subscription usage error:", error);
    return {
      bidsUsed: 0,
      bidsLimit: 5,
      servicesUsed: 0,
      servicesLimit: 1,
      canOutsource: false,
    };
  }
}
