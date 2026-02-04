// PayFast ITN (Instant Transaction Notification) Webhook Handler
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/lib/db";
import { orders, subscriptions, transactions } from "@/lib/db/schema";
import { verifyPayFastITN, parsePayFastITN } from "@/lib/payments/payfast";
import { notify } from "@/lib/notifications";

function generateId(): string {
  return crypto.randomUUID();
}

export async function POST(request: NextRequest) {
  try {
    // Get source IP for verification
    const sourceIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("cf-connecting-ip") ||
      "unknown";

    // Parse form data from PayFast
    const formData = await request.formData();
    const body: Record<string, string> = {};
    formData.forEach((value, key) => {
      body[key] = value.toString();
    });

    console.log("PayFast ITN received:", { sourceIp, body });

    // Verify the notification
    const verification = await verifyPayFastITN(body, sourceIp);
    if (!verification.valid) {
      console.error("PayFast ITN verification failed:", verification.error);
      return new NextResponse("INVALID", { status: 400 });
    }

    // Parse the ITN data
    const itnData = parsePayFastITN(body);
    const paymentReference = itnData.reference;

    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Handle subscription payments (reference starts with SUB-)
    if (paymentReference.startsWith("SUB-")) {
      await handleSubscriptionPayment(db, itnData, body);
      return new NextResponse("OK", { status: 200 });
    }

    // Handle order payments (reference starts with ORD-)
    if (paymentReference.startsWith("ORD-") || itnData.orderId) {
      await handleOrderPayment(db, itnData, body);
      return new NextResponse("OK", { status: 200 });
    }

    console.warn("Unknown payment reference format:", paymentReference);
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("PayFast ITN error:", error);
    return new NextResponse("ERROR", { status: 500 });
  }
}

/**
 * Handle subscription payment
 */
async function handleSubscriptionPayment(
  db: ReturnType<typeof createDb>,
  itnData: ReturnType<typeof parsePayFastITN>,
  rawBody: Record<string, string>
) {
  const userId = rawBody.custom_str1;
  const plan = rawBody.custom_str2 as "monthly" | "annual";

  if (!userId || !plan) {
    console.error("Missing userId or plan in subscription payment");
    return;
  }

  const now = new Date();

  if (itnData.status === "success") {
    // Calculate period end
    const periodEnd = new Date();
    if (plan === "monthly") {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Get existing subscription
    const existingSub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    if (existingSub) {
      // Update existing subscription
      await db
        .update(subscriptions)
        .set({
          plan,
          status: "active",
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
          paymentReference: itnData.transactionId,
          cancelledAt: null,
          updatedAt: now.toISOString(),
        })
        .where(eq(subscriptions.id, existingSub.id));
    } else {
      // Create new subscription
      await db.insert(subscriptions).values({
        id: generateId(),
        userId,
        plan,
        status: "active",
        bidsUsed: 0,
        servicesUsed: 0,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        paymentReference: itnData.transactionId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    // Record transaction
    await db.insert(transactions).values({
      id: generateId(),
      userId,
      type: "subscription",
      amount: itnData.amount,
      currency: "ZAR",
      provider: "payfast",
      providerReference: itnData.transactionId,
      status: "completed",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: now.toISOString(),
    });

    // Notify user
    await notify(db, {
      userId,
      type: "system",
      title: "Subscription Activated!",
      message: `Your ${plan} Pro subscription is now active. Enjoy unlimited access!`,
      sendEmail: true,
      emailData: { plan, transactionId: itnData.transactionId },
    });

    console.log("Subscription activated:", { userId, plan, transactionId: itnData.transactionId });
  } else if (itnData.status === "failed" || itnData.status === "cancelled") {
    // Notify user of failed payment
    await notify(db, {
      userId,
      type: "system",
      title: "Payment Failed",
      message: `Your subscription payment ${itnData.status}. Please try again.`,
      sendEmail: true,
    });

    console.log("Subscription payment failed:", { userId, plan, status: itnData.status });
  }
}

/**
 * Handle order/escrow payment
 */
async function handleOrderPayment(
  db: ReturnType<typeof createDb>,
  itnData: ReturnType<typeof parsePayFastITN>,
  rawBody: Record<string, string>
) {
  const orderId = itnData.orderId || rawBody.custom_str1;
  // milestoneId can be used for milestone-based payments in future
  // const milestoneId = itnData.milestoneId;

  if (!orderId) {
    console.error("Missing orderId in order payment");
    return;
  }

  const now = new Date();

  // Get order details
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    console.error("Order not found:", orderId);
    return;
  }

  if (itnData.status === "success") {
    // Update order status to in_progress
    await db
      .update(orders)
      .set({
        status: "in_progress",
        updatedAt: now.toISOString(),
      })
      .where(eq(orders.id, orderId));

    // Record escrow transaction
    await db.insert(transactions).values({
      id: generateId(),
      orderId,
      userId: order.buyerId,
      type: "escrow_fund",
      amount: itnData.amount,
      currency: "ZAR",
      provider: "payfast",
      providerReference: itnData.transactionId,
      status: "completed",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: now.toISOString(),
    });

    // Notify buyer
    await notify(db, {
      userId: order.buyerId,
      type: "payment_received",
      title: "Payment Successful",
      message: `Your payment for order #${orderId.slice(0, 8)} has been received. The seller can now start working!`,
      entityType: "order",
      entityId: orderId,
      sendEmail: true,
    });

    // Notify seller
    await notify(db, {
      userId: order.sellerId,
      type: "order_created",
      title: "New Order Started!",
      message: `Payment received for order #${orderId.slice(0, 8)}. You can now start working!`,
      entityType: "order",
      entityId: orderId,
      sendEmail: true,
    });

    console.log("Order payment completed:", { orderId, transactionId: itnData.transactionId });
  } else if (itnData.status === "failed" || itnData.status === "cancelled") {
    // Notify buyer of failed payment
    await notify(db, {
      userId: order.buyerId,
      type: "system",
      title: "Payment Failed",
      message: `Your payment for order #${orderId.slice(0, 8)} ${itnData.status}. Please try again.`,
      entityType: "order",
      entityId: orderId,
      sendEmail: true,
    });

    console.log("Order payment failed:", { orderId, status: itnData.status });
  }
}
