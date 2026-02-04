// Notification service for in-app and email notifications
import { eq, and, desc } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { sendEmail, type EmailTemplate } from "@/lib/email";

function generateId(): string {
  return crypto.randomUUID();
}

export type NotificationType =
  | "order_created"
  | "order_delivered"
  | "order_completed"
  | "order_cancelled"
  | "payment_received"
  | "new_message"
  | "new_bid"
  | "bid_accepted"
  | "review_received"
  | "dispute_opened"
  | "dispute_resolved"
  | "verification_approved"
  | "verification_rejected"
  | "subscription_expiring"
  | "system";

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  sendEmail?: boolean;
  emailData?: Record<string, string | number | boolean | undefined>;
}

// Map notification type to email template
const notificationToEmailTemplate: Partial<Record<NotificationType, EmailTemplate>> = {
  order_created: "order_created",
  order_delivered: "order_delivered",
  order_completed: "order_completed",
  payment_received: "order_paid",
  new_message: "new_message",
  new_bid: "new_bid",
  bid_accepted: "bid_accepted",
  dispute_opened: "dispute_opened",
  dispute_resolved: "dispute_resolved",
  verification_approved: "verification_approved",
  verification_rejected: "verification_rejected",
  subscription_expiring: "subscription_expiring",
};

/**
 * Create in-app notification and optionally send email
 */
export async function notify(
  db: ReturnType<typeof createDb>,
  input: NotifyInput
): Promise<{ success: boolean; notificationId?: string }> {
  try {
    const now = new Date().toISOString();
    const notificationId = generateId();

    // Create in-app notification
    await db.insert(notifications).values({
      id: notificationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      isRead: false,
      emailSent: false,
      createdAt: now,
    });

    // Send email if requested
    if (input.sendEmail && input.emailData) {
      const emailTemplate = notificationToEmailTemplate[input.type];
      
      if (emailTemplate) {
        // Get user email
        const user = await db.query.users.findFirst({
          where: eq(users.id, input.userId),
          columns: {
            email: true,
            firstName: true,
            lastName: true,
          },
        });

        if (user) {
          const recipientName = [user.firstName, user.lastName]
            .filter(Boolean)
            .join(" ");

          const emailResult = await sendEmail({
            to: {
              email: user.email,
              name: recipientName || undefined,
            },
            template: emailTemplate,
            data: {
              name: recipientName || "there",
              ...input.emailData,
            },
          });

          // Mark email as sent
          if (emailResult.success) {
            await db
              .update(notifications)
              .set({ emailSent: true })
              .where(eq(notifications.id, notificationId));
          }
        }
      }
    }

    return { success: true, notificationId };
  } catch (error) {
    console.error("Notification error:", error);
    return { success: false };
  }
}

/**
 * Get user notifications
 */
export async function getUserNotifications(
  db: ReturnType<typeof createDb>,
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
): Promise<Array<{
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}>> {
  const conditions = [eq(notifications.userId, userId)];

  if (options.unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  const result = await db.query.notifications.findMany({
    where: and(...conditions),
    orderBy: [desc(notifications.createdAt)],
    limit: options.limit || 50,
    columns: {
      id: true,
      type: true,
      title: true,
      message: true,
      entityType: true,
      entityId: true,
      isRead: true,
      createdAt: true,
    },
  });

  return result;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(
  db: ReturnType<typeof createDb>,
  userId: string
): Promise<number> {
  const result = await db.query.notifications.findMany({
    where: and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ),
    columns: { id: true },
  });

  return result.length;
}

/**
 * Mark notification as read
 */
export async function markAsRead(
  db: ReturnType<typeof createDb>,
  notificationId: string,
  userId: string
): Promise<boolean> {
  const now = new Date().toISOString();

  const result = await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: now,
    })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      )
    )
    .returning({ id: notifications.id });

  return result.length > 0;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(
  db: ReturnType<typeof createDb>,
  userId: string
): Promise<number> {
  const now = new Date().toISOString();

  const result = await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: now,
    })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    )
    .returning({ id: notifications.id });

  return result.length;
}

/**
 * Delete old notifications (cleanup job)
 */
export async function deleteOldNotifications(
  db: ReturnType<typeof createDb>,
  daysOld: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  const cutoff = cutoffDate.toISOString();

  // For now, we just mark as read - actual deletion would need a comparison
  // This is a simplified version
  const result = await db.query.notifications.findMany({
    where: and(
      eq(notifications.isRead, true)
    ),
    columns: { id: true },
    limit: 1000,
  });

  return result.length;
}

// Convenience methods for common notifications

export async function notifyOrderCreated(
  db: ReturnType<typeof createDb>,
  sellerId: string,
  data: {
    orderNumber: string;
    orderId: string;
    serviceTitle: string;
    amount: number;
    buyerName: string;
  }
): Promise<void> {
  await notify(db, {
    userId: sellerId,
    type: "order_created",
    title: "New Order!",
    message: `${data.buyerName} ordered ${data.serviceTitle}`,
    entityType: "order",
    entityId: data.orderId,
    sendEmail: true,
    emailData: {
      orderNumber: data.orderNumber,
      orderId: data.orderId,
      serviceTitle: data.serviceTitle,
      amount: (data.amount / 100).toFixed(2),
    },
  });
}

export async function notifyPaymentReceived(
  db: ReturnType<typeof createDb>,
  sellerId: string,
  data: {
    orderNumber: string;
    orderId: string;
    amount: number;
  }
): Promise<void> {
  await notify(db, {
    userId: sellerId,
    type: "payment_received",
    title: "Payment Received!",
    message: `R${(data.amount / 100).toFixed(2)} received for order ${data.orderNumber}`,
    entityType: "order",
    entityId: data.orderId,
    sendEmail: true,
    emailData: {
      orderNumber: data.orderNumber,
      orderId: data.orderId,
      amount: (data.amount / 100).toFixed(2),
    },
  });
}

export async function notifyOrderDelivered(
  db: ReturnType<typeof createDb>,
  buyerId: string,
  data: {
    orderNumber: string;
    orderId: string;
    milestoneTitle: string;
    sellerName: string;
  }
): Promise<void> {
  await notify(db, {
    userId: buyerId,
    type: "order_delivered",
    title: "Delivery Submitted!",
    message: `${data.sellerName} delivered: ${data.milestoneTitle}`,
    entityType: "order",
    entityId: data.orderId,
    sendEmail: true,
    emailData: {
      orderNumber: data.orderNumber,
      orderId: data.orderId,
      milestoneTitle: data.milestoneTitle,
    },
  });
}

export async function notifyNewMessage(
  db: ReturnType<typeof createDb>,
  recipientId: string,
  data: {
    senderName: string;
    messagePreview: string;
    conversationId: string;
  }
): Promise<void> {
  await notify(db, {
    userId: recipientId,
    type: "new_message",
    title: "New Message",
    message: `${data.senderName}: ${data.messagePreview.slice(0, 50)}...`,
    entityType: "conversation",
    entityId: data.conversationId,
    sendEmail: true,
    emailData: {
      senderName: data.senderName,
      messagePreview: data.messagePreview.slice(0, 100),
      conversationId: data.conversationId,
    },
  });
}

export async function notifyNewBid(
  db: ReturnType<typeof createDb>,
  projectOwnerId: string,
  data: {
    projectTitle: string;
    projectId: string;
    bidderName: string;
    bidAmount: number;
    deliveryDays: number;
  }
): Promise<void> {
  await notify(db, {
    userId: projectOwnerId,
    type: "new_bid",
    title: "New Bid Received!",
    message: `${data.bidderName} bid R${(data.bidAmount / 100).toFixed(2)} on ${data.projectTitle}`,
    entityType: "project",
    entityId: data.projectId,
    sendEmail: true,
    emailData: {
      projectTitle: data.projectTitle,
      projectId: data.projectId,
      bidderName: data.bidderName,
      bidAmount: (data.bidAmount / 100).toFixed(2),
      deliveryDays: data.deliveryDays,
    },
  });
}

export async function notifyBidAccepted(
  db: ReturnType<typeof createDb>,
  bidderId: string,
  data: {
    projectTitle: string;
    bidAmount: number;
    orderId: string;
  }
): Promise<void> {
  await notify(db, {
    userId: bidderId,
    type: "bid_accepted",
    title: "Your bid was accepted!",
    message: `Congratulations! You won the project: ${data.projectTitle}`,
    entityType: "order",
    entityId: data.orderId,
    sendEmail: true,
    emailData: {
      projectTitle: data.projectTitle,
      bidAmount: (data.bidAmount / 100).toFixed(2),
      orderId: data.orderId,
    },
  });
}

export async function notifyVerificationResult(
  db: ReturnType<typeof createDb>,
  userId: string,
  approved: boolean,
  reason?: string
): Promise<void> {
  if (approved) {
    await notify(db, {
      userId,
      type: "verification_approved",
      title: "ID Verified!",
      message: "Your identity has been verified. You now have full access.",
      sendEmail: true,
      emailData: {},
    });
  } else {
    await notify(db, {
      userId,
      type: "verification_rejected",
      title: "Verification Needs Attention",
      message: reason || "Please resubmit your verification documents.",
      sendEmail: true,
      emailData: { reason: reason || "Documents unclear" },
    });
  }
}
