// Email triggers for order-related events
// These functions can be called from action files to send notifications

import { createDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  notifyOrderCreated,
  notifyPaymentReceived,
  notifyOrderDelivered,
  notifyBidAccepted,
  notify,
} from "@/lib/notifications";

/**
 * Send notifications when a new order is created
 */
export async function triggerOrderCreatedEmail(
  db: ReturnType<typeof createDb>,
  orderData: {
    sellerId: string;
    buyerId: string;
    orderId: string;
    orderNumber: string;
    serviceTitle?: string;
    projectTitle?: string;
    totalAmount: number;
  }
): Promise<void> {
  try {
    // Get buyer name
    const buyer = await db.query.users.findFirst({
      where: eq(users.id, orderData.buyerId),
      columns: { firstName: true, lastName: true },
    });

    const buyerName = [buyer?.firstName, buyer?.lastName]
      .filter(Boolean)
      .join(" ") || "A buyer";

    await notifyOrderCreated(db, orderData.sellerId, {
      orderNumber: orderData.orderNumber,
      orderId: orderData.orderId,
      serviceTitle: orderData.serviceTitle || orderData.projectTitle || "Your service",
      amount: orderData.totalAmount,
      buyerName,
    });
  } catch (error) {
    console.error("Failed to send order created notification:", error);
  }
}

/**
 * Send notifications when payment is received
 */
export async function triggerPaymentReceivedEmail(
  db: ReturnType<typeof createDb>,
  orderData: {
    sellerId: string;
    orderId: string;
    orderNumber: string;
    amount: number;
  }
): Promise<void> {
  try {
    await notifyPaymentReceived(db, orderData.sellerId, {
      orderNumber: orderData.orderNumber,
      orderId: orderData.orderId,
      amount: orderData.amount,
    });
  } catch (error) {
    console.error("Failed to send payment received notification:", error);
  }
}

/**
 * Send notifications when order is delivered
 */
export async function triggerOrderDeliveredEmail(
  db: ReturnType<typeof createDb>,
  deliveryData: {
    buyerId: string;
    sellerId: string;
    orderId: string;
    orderNumber: string;
    milestoneTitle: string;
  }
): Promise<void> {
  try {
    // Get seller name
    const seller = await db.query.users.findFirst({
      where: eq(users.id, deliveryData.sellerId),
      columns: { firstName: true, lastName: true },
    });

    const sellerName = [seller?.firstName, seller?.lastName]
      .filter(Boolean)
      .join(" ") || "The seller";

    await notifyOrderDelivered(db, deliveryData.buyerId, {
      orderNumber: deliveryData.orderNumber,
      orderId: deliveryData.orderId,
      milestoneTitle: deliveryData.milestoneTitle,
      sellerName,
    });
  } catch (error) {
    console.error("Failed to send order delivered notification:", error);
  }
}

/**
 * Send notifications when bid is accepted
 */
export async function triggerBidAcceptedEmail(
  db: ReturnType<typeof createDb>,
  bidData: {
    bidderId: string;
    projectTitle: string;
    bidAmount: number;
    orderId: string;
  }
): Promise<void> {
  try {
    await notifyBidAccepted(db, bidData.bidderId, {
      projectTitle: bidData.projectTitle,
      bidAmount: bidData.bidAmount,
      orderId: bidData.orderId,
    });
  } catch (error) {
    console.error("Failed to send bid accepted notification:", error);
  }
}

/**
 * Send notifications when milestone payment is released
 */
export async function triggerMilestoneReleasedEmail(
  db: ReturnType<typeof createDb>,
  milestoneData: {
    sellerId: string;
    orderId: string;
    orderNumber: string;
    milestoneTitle: string;
    amount: number;
  }
): Promise<void> {
  try {
    await notify(db, {
      userId: milestoneData.sellerId,
      type: "payment_received",
      title: "Payment Released!",
      message: `R${(milestoneData.amount / 100).toFixed(2)} released for "${milestoneData.milestoneTitle}"`,
      entityType: "order", 
      entityId: milestoneData.orderId,
      sendEmail: true,
      emailData: {
        orderNumber: milestoneData.orderNumber,
        orderId: milestoneData.orderId,
        milestoneTitle: milestoneData.milestoneTitle,
        amount: (milestoneData.amount / 100).toFixed(2),
      },
    });
  } catch (error) {
    console.error("Failed to send milestone released notification:", error);
  }
}

/**
 * Send notifications when order is completed
 */
export async function triggerOrderCompletedEmail(
  db: ReturnType<typeof createDb>,
  orderData: {
    buyerId: string;
    sellerId: string;
    orderId: string;
    orderNumber: string;
    totalAmount: number;
    sellerEarnings: number;
  }
): Promise<void> {
  try {
    // Notify buyer
    await notify(db, {
      userId: orderData.buyerId,
      type: "order_completed",
      title: "Order Completed!",
      message: `Order ${orderData.orderNumber} has been completed.`,
      entityType: "order",
      entityId: orderData.orderId,
      sendEmail: true,
      emailData: {
        orderNumber: orderData.orderNumber,
        orderId: orderData.orderId,
        amount: (orderData.totalAmount / 100).toFixed(2),
      },
    });

    // Notify seller
    await notify(db, {
      userId: orderData.sellerId,
      type: "order_completed",
      title: "Order Completed!",
      message: `Order ${orderData.orderNumber} is complete. You earned R${(orderData.sellerEarnings / 100).toFixed(2)}`,
      entityType: "order",
      entityId: orderData.orderId,
      sendEmail: true,
      emailData: {
        orderNumber: orderData.orderNumber,
        orderId: orderData.orderId,
        amount: (orderData.sellerEarnings / 100).toFixed(2),
      },
    });
  } catch (error) {
    console.error("Failed to send order completed notification:", error);
  }
}
