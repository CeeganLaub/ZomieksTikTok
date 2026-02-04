// Unified Payment Service
// Handles OZOW and PayFast payments

import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { orders, milestones, transactions, users } from "@/lib/db/schema";
import { createOzowPayment } from "./ozow";
import { createPayFastPayment } from "./payfast";
import { triggerPaymentReceivedEmail, triggerMilestoneReleasedEmail } from "@/lib/orders/email-triggers";
import type { PaymentProvider, PaymentRequest, PaymentResult } from "./config";

function generateId(): string {
  return crypto.randomUUID();
}

function generateReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ZOM-${timestamp}-${random}`;
}

export interface InitiatePaymentInput {
  orderId: string;
  milestoneId?: string;
  provider: PaymentProvider;
  buyerEmail: string;
  buyerName?: string;
}

/**
 * Initiate a payment for an order or milestone
 */
export async function initiatePayment(
  db: ReturnType<typeof createDb>,
  input: InitiatePaymentInput,
  baseUrl: string
): Promise<PaymentResult> {
  // Get order
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, input.orderId),
  });

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  let amount: number;
  let description: string;

  // If milestone payment
  if (input.milestoneId) {
    const milestone = await db.query.milestones.findFirst({
      where: eq(milestones.id, input.milestoneId),
    });

    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    if (milestone.status !== "pending") {
      return { success: false, error: "Milestone already funded" };
    }

    amount = milestone.amount;
    description = `Milestone: ${milestone.title}`;
  } else {
    // Full order payment
    if (order.status !== "pending_payment") {
      return { success: false, error: "Order already paid" };
    }

    amount = order.totalAmount;
    description = `Order ${order.orderNumber}`;
  }

  const reference = generateReference();
  const now = new Date().toISOString();

  // Create pending transaction
  const transactionId = generateId();
  await db.insert(transactions).values({
    id: transactionId,
    orderId: order.id,
    milestoneId: input.milestoneId || null,
    userId: order.buyerId,
    type: input.milestoneId ? "escrow_fund" : "payment",
    amount,
    currency: "ZAR",
    provider: input.provider,
    providerReference: reference,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });

  // Create payment request
  const paymentRequest: PaymentRequest = {
    orderId: order.id,
    milestoneId: input.milestoneId,
    amount,
    description,
    reference,
    buyerEmail: input.buyerEmail,
    buyerName: input.buyerName,
    provider: input.provider,
  };

  // Route to appropriate provider
  let result: PaymentResult;

  if (input.provider === "ozow") {
    result = await createOzowPayment(paymentRequest, baseUrl);
  } else if (input.provider === "payfast") {
    result = await createPayFastPayment(paymentRequest, baseUrl);
  } else {
    return { success: false, error: "Invalid payment provider" };
  }

  // Update transaction with result
  if (!result.success) {
    await db
      .update(transactions)
      .set({
        status: "failed",
        errorMessage: result.error,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(transactions.id, transactionId));
  }

  return result;
}

/**
 * Handle successful payment webhook
 */
export async function handlePaymentSuccess(
  db: ReturnType<typeof createDb>,
  data: {
    reference: string;
    providerTransactionId: string;
    orderId: string;
    milestoneId: string | null;
    amount: number;
    provider: PaymentProvider;
  }
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  // Find the pending transaction
  const existingTransaction = await db.query.transactions.findFirst({
    where: eq(transactions.providerReference, data.reference),
  });

  if (!existingTransaction) {
    return { success: false, error: "Transaction not found" };
  }

  if (existingTransaction.status === "completed") {
    // Already processed
    return { success: true };
  }

  // Update transaction status
  await db
    .update(transactions)
    .set({
      status: "completed",
      providerReference: data.providerTransactionId,
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(transactions.id, existingTransaction.id));

  // Get order details for notifications
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, data.orderId),
  });

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  // Get buyer and seller info
  const [buyer, seller] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, order.buyerId) }),
    db.query.users.findFirst({ where: eq(users.id, order.sellerId) }),
  ]);

  // Update milestone if this was a milestone payment
  if (data.milestoneId) {
    const milestone = await db.query.milestones.findFirst({
      where: eq(milestones.id, data.milestoneId),
    });

    await db
      .update(milestones)
      .set({
        status: "funded",
        fundedAt: now,
        updatedAt: now,
      })
      .where(eq(milestones.id, data.milestoneId));

    // Check if this is the first milestone - start the order
    if (order.status === "pending_payment") {
      await db
        .update(orders)
        .set({
          status: "in_progress",
          updatedAt: now,
        })
        .where(eq(orders.id, data.orderId));
    }

    // Send milestone funded notification
    if (buyer && seller && milestone) {
      await triggerMilestoneReleasedEmail(db, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        milestoneTitle: milestone.title,
        amount: data.amount,
        sellerId: seller.id,
      });
    }
  } else {
    // Full order payment - update order status
    await db
      .update(orders)
      .set({
        status: "pending_requirements",
        updatedAt: now,
      })
      .where(eq(orders.id, data.orderId));

    // Send payment received notification
    if (buyer && seller) {
      await triggerPaymentReceivedEmail(db, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: data.amount,
        sellerId: seller.id,
      });
    }
  }

  return { success: true };
}

/**
 * Handle failed/cancelled payment
 */
export async function handlePaymentFailure(
  db: ReturnType<typeof createDb>,
  reference: string,
  reason: string
): Promise<void> {
  const now = new Date().toISOString();

  await db
    .update(transactions)
    .set({
      status: "failed",
      errorMessage: reason,
      updatedAt: now,
    })
    .where(eq(transactions.providerReference, reference));
}

/**
 * Get payment status by reference
 */
export async function getPaymentStatus(
  db: ReturnType<typeof createDb>,
  reference: string
): Promise<{
  found: boolean;
  status?: string;
  orderId?: string;
  milestoneId?: string | null;
}> {
  const transaction = await db.query.transactions.findFirst({
    where: eq(transactions.providerReference, reference),
  });

  if (!transaction) {
    return { found: false };
  }

  return {
    found: true,
    status: transaction.status,
    orderId: transaction.orderId || undefined,
    milestoneId: transaction.milestoneId,
  };
}

// Export everything from sub-modules
export * from "./config";
export * from "./ozow";
export * from "./payfast";
