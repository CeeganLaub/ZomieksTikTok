// Server actions for outsourcing
"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc, or } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { 
  outsourceRequests, 
  outsourceInvitations, 
  orders, 
  users, 
  subscriptions,
  categories 
} from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { notify } from "@/lib/notifications";

function generateId(): string {
  return crypto.randomUUID();
}

export interface ActionResult {
  success: boolean;
  error?: string;
  outsourceRequestId?: string;
}

export interface OutsourceRequestWithDetails {
  id: string;
  originalOrderId: string;
  title: string;
  description: string;
  requirements: string | null;
  amount: number;
  currency: string;
  deliveryDays: number;
  deadline: string | null;
  status: string;
  isAnonymous: boolean;
  createdAt: string;
  category: {
    id: string;
    name: string;
  } | null;
  originalOrder: {
    orderNumber: string;
    totalAmount: number;
    deliveryDeadline: string | null;
  } | null;
  invitations: Array<{
    id: string;
    invitedUserId: string;
    status: string;
    userName: string | null;
    createdAt: string;
  }>;
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

/**
 * Check if user has paid subscription (required for outsourcing)
 */
async function checkPaidSubscription(
  db: ReturnType<typeof createDb>,
  userId: string
): Promise<boolean> {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (!subscription) return false;
  
  if (subscription.plan === "free") return false;
  if (subscription.status !== "active") return false;
  
  const now = new Date();
  if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < now) {
    return false;
  }
  
  return true;
}

/**
 * Create an outsource request for an order
 */
export async function createOutsourceRequest(data: {
  originalOrderId: string;
  categoryId?: string;
  title: string;
  description: string;
  requirements?: string;
  amount: number;
  deliveryDays: number;
  inviteUserIds?: string[]; // Optional: invite specific shortlisted users
}): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Check paid subscription
    const isPaid = await checkPaidSubscription(db, session.userId);
    if (!isPaid) {
      return { success: false, error: "Upgrade to Pro to use outsourcing features" };
    }

    // Verify order ownership (must be seller on the order)
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, data.originalOrderId),
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.sellerId !== session.userId) {
      return { success: false, error: "You can only outsource orders where you are the seller" };
    }

    // Check order status - can only outsource active orders
    const validStatuses = ["in_progress", "pending_requirements"];
    if (!validStatuses.includes(order.status)) {
      return { success: false, error: "Order cannot be outsourced in its current status" };
    }

    // Check if already outsourced
    const existingOutsource = await db.query.outsourceRequests.findFirst({
      where: and(
        eq(outsourceRequests.originalOrderId, data.originalOrderId),
        or(
          eq(outsourceRequests.status, "open"),
          eq(outsourceRequests.status, "assigned"),
          eq(outsourceRequests.status, "in_progress")
        )
      ),
    });

    if (existingOutsource) {
      return { success: false, error: "This order already has an active outsource request" };
    }

    const now = new Date().toISOString();
    const deadline = order.deliveryDeadline || 
      new Date(Date.now() + data.deliveryDays * 24 * 60 * 60 * 1000).toISOString();

    const outsourceRequestId = generateId();

    // Create outsource request
    await db.insert(outsourceRequests).values({
      id: outsourceRequestId,
      originalOrderId: data.originalOrderId,
      outsourcerId: session.userId,
      categoryId: data.categoryId || null,
      title: data.title,
      description: data.description,
      requirements: data.requirements || null,
      amount: data.amount,
      currency: "ZAR",
      deliveryDays: data.deliveryDays,
      deadline,
      status: "open",
      isAnonymous: true, // Always anonymous to end client
      createdAt: now,
      updatedAt: now,
    });

    // Create invitations if specific users provided
    if (data.inviteUserIds && data.inviteUserIds.length > 0) {
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

      for (const userId of data.inviteUserIds) {
        await db.insert(outsourceInvitations).values({
          id: generateId(),
          outsourceRequestId,
          invitedUserId: userId,
          status: "pending",
          createdAt: now,
          expiresAt,
        });

        // Send notification to invited user
        await notify(db, {
          userId,
          type: "system",
          title: "New Outsource Opportunity",
          message: `You've been invited to work on: ${data.title}`,
          entityType: "outsource_request",
          entityId: outsourceRequestId,
          sendEmail: true,
          emailData: {
            title: data.title,
            amount: (data.amount / 100).toFixed(2),
            deliveryDays: data.deliveryDays,
          },
        });
      }
    }

    revalidatePath("/dashboard/outsourcing");
    return { success: true, outsourceRequestId };
  } catch (error) {
    console.error("Create outsource request error:", error);
    return { success: false, error: "Failed to create outsource request" };
  }
}

/**
 * Invite shortlisted users to an outsource request
 */
export async function inviteToOutsource(
  outsourceRequestId: string,
  userIds: string[],
  message?: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Verify ownership
    const request = await db.query.outsourceRequests.findFirst({
      where: and(
        eq(outsourceRequests.id, outsourceRequestId),
        eq(outsourceRequests.outsourcerId, session.userId)
      ),
    });

    if (!request) {
      return { success: false, error: "Outsource request not found" };
    }

    if (request.status !== "open") {
      return { success: false, error: "Outsource request is no longer open" };
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    for (const userId of userIds) {
      // Check if already invited
      const existingInvite = await db.query.outsourceInvitations.findFirst({
        where: and(
          eq(outsourceInvitations.outsourceRequestId, outsourceRequestId),
          eq(outsourceInvitations.invitedUserId, userId)
        ),
      });

      if (existingInvite) continue;

      await db.insert(outsourceInvitations).values({
        id: generateId(),
        outsourceRequestId,
        invitedUserId: userId,
        status: "pending",
        message: message || null,
        createdAt: now,
        expiresAt,
      });

      // Send notification
      await notify(db, {
        userId,
        type: "system",
        title: "New Outsource Invitation",
        message: `You've been invited to work on: ${request.title}`,
        entityType: "outsource_request",
        entityId: outsourceRequestId,
        sendEmail: true,
        emailData: {
          title: request.title,
          amount: (request.amount / 100).toFixed(2),
          deliveryDays: request.deliveryDays,
        },
      });
    }

    revalidatePath("/dashboard/outsourcing");
    return { success: true };
  } catch (error) {
    console.error("Invite to outsource error:", error);
    return { success: false, error: "Failed to send invitations" };
  }
}

/**
 * Accept an outsource invitation
 */
export async function acceptOutsourceInvitation(
  invitationId: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Get invitation
    const invitation = await db.query.outsourceInvitations.findFirst({
      where: and(
        eq(outsourceInvitations.id, invitationId),
        eq(outsourceInvitations.invitedUserId, session.userId)
      ),
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    if (invitation.status !== "pending") {
      return { success: false, error: "Invitation is no longer pending" };
    }

    // Check if expired
    if (new Date(invitation.expiresAt) < new Date()) {
      await db
        .update(outsourceInvitations)
        .set({ status: "expired" })
        .where(eq(outsourceInvitations.id, invitationId));
      return { success: false, error: "Invitation has expired" };
    }

    // Get the outsource request
    const request = await db.query.outsourceRequests.findFirst({
      where: eq(outsourceRequests.id, invitation.outsourceRequestId),
    });

    if (!request) {
      return { success: false, error: "Outsource request not found" };
    }

    if (request.status !== "open") {
      return { success: false, error: "Outsource request is no longer available" };
    }

    const now = new Date().toISOString();

    // Accept invitation
    await db
      .update(outsourceInvitations)
      .set({ status: "accepted", respondedAt: now })
      .where(eq(outsourceInvitations.id, invitationId));

    // Update outsource request
    await db
      .update(outsourceRequests)
      .set({
        outsourcedToId: session.userId,
        status: "assigned",
        updatedAt: now,
      })
      .where(eq(outsourceRequests.id, request.id));

    // Reject all other pending invitations for this request
    await db
      .update(outsourceInvitations)
      .set({ status: "rejected", respondedAt: now })
      .where(
        and(
          eq(outsourceInvitations.outsourceRequestId, request.id),
          eq(outsourceInvitations.status, "pending")
        )
      );

    // Notify the outsourcer
    await notify(db, {
      userId: request.outsourcerId,
      type: "system",
      title: "Outsource Accepted!",
      message: `Your outsource request "${request.title}" has been accepted!`,
      entityType: "outsource_request",
      entityId: request.id,
      sendEmail: true,
      emailData: {
        title: request.title,
      },
    });

    revalidatePath("/dashboard/outsourcing");
    revalidatePath("/dashboard/outsource/invitations");
    return { success: true };
  } catch (error) {
    console.error("Accept outsource invitation error:", error);
    return { success: false, error: "Failed to accept invitation" };
  }
}

/**
 * Reject an outsource invitation
 */
export async function rejectOutsourceInvitation(
  invitationId: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const invitation = await db.query.outsourceInvitations.findFirst({
      where: and(
        eq(outsourceInvitations.id, invitationId),
        eq(outsourceInvitations.invitedUserId, session.userId)
      ),
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    if (invitation.status !== "pending") {
      return { success: false, error: "Invitation is no longer pending" };
    }

    await db
      .update(outsourceInvitations)
      .set({ status: "rejected", respondedAt: new Date().toISOString() })
      .where(eq(outsourceInvitations.id, invitationId));

    revalidatePath("/dashboard/outsource/invitations");
    return { success: true };
  } catch (error) {
    console.error("Reject outsource invitation error:", error);
    return { success: false, error: "Failed to reject invitation" };
  }
}

/**
 * Cancel an outsource request
 */
export async function cancelOutsourceRequest(
  outsourceRequestId: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const request = await db.query.outsourceRequests.findFirst({
      where: and(
        eq(outsourceRequests.id, outsourceRequestId),
        eq(outsourceRequests.outsourcerId, session.userId)
      ),
    });

    if (!request) {
      return { success: false, error: "Outsource request not found" };
    }

    if (request.status === "completed" || request.status === "cancelled") {
      return { success: false, error: "Cannot cancel this request" };
    }

    // If assigned, notify the worker
    if (request.outsourcedToId && request.status !== "open") {
      await notify(db, {
        userId: request.outsourcedToId,
        type: "system",
        title: "Outsource Cancelled",
        message: `The outsource request "${request.title}" has been cancelled.`,
        entityType: "outsource_request",
        entityId: request.id,
        sendEmail: true,
        emailData: {
          title: request.title,
        },
      });
    }

    await db
      .update(outsourceRequests)
      .set({ status: "cancelled", updatedAt: new Date().toISOString() })
      .where(eq(outsourceRequests.id, outsourceRequestId));

    revalidatePath("/dashboard/outsourcing");
    return { success: true };
  } catch (error) {
    console.error("Cancel outsource request error:", error);
    return { success: false, error: "Failed to cancel request" };
  }
}

/**
 * Mark outsource as delivered (by the worker)
 */
export async function markOutsourceDelivered(
  outsourceRequestId: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const request = await db.query.outsourceRequests.findFirst({
      where: and(
        eq(outsourceRequests.id, outsourceRequestId),
        eq(outsourceRequests.outsourcedToId, session.userId)
      ),
    });

    if (!request) {
      return { success: false, error: "Outsource request not found" };
    }

    if (request.status !== "in_progress" && request.status !== "assigned") {
      return { success: false, error: "Cannot mark as delivered" };
    }

    await db
      .update(outsourceRequests)
      .set({ status: "delivered", updatedAt: new Date().toISOString() })
      .where(eq(outsourceRequests.id, outsourceRequestId));

    // Notify outsourcer
    await notify(db, {
      userId: request.outsourcerId,
      type: "order_delivered",
      title: "Outsource Delivered!",
      message: `Work on "${request.title}" has been delivered.`,
      entityType: "outsource_request",
      entityId: request.id,
      sendEmail: true,
      emailData: {
        title: request.title,
      },
    });

    revalidatePath("/dashboard/outsourcing");
    return { success: true };
  } catch (error) {
    console.error("Mark outsource delivered error:", error);
    return { success: false, error: "Failed to mark as delivered" };
  }
}

/**
 * Complete outsource (by the outsourcer - releases payment)
 */
export async function completeOutsource(
  outsourceRequestId: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const request = await db.query.outsourceRequests.findFirst({
      where: and(
        eq(outsourceRequests.id, outsourceRequestId),
        eq(outsourceRequests.outsourcerId, session.userId)
      ),
    });

    if (!request) {
      return { success: false, error: "Outsource request not found" };
    }

    if (request.status !== "delivered") {
      return { success: false, error: "Work must be delivered before completing" };
    }

    const now = new Date().toISOString();

    await db
      .update(outsourceRequests)
      .set({ 
        status: "completed", 
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(outsourceRequests.id, outsourceRequestId));

    // Notify worker
    if (request.outsourcedToId) {
      await notify(db, {
        userId: request.outsourcedToId,
        type: "payment_received",
        title: "Payment Released!",
        message: `R${(request.amount / 100).toFixed(2)} released for "${request.title}"`,
        entityType: "outsource_request",
        entityId: request.id,
        sendEmail: true,
        emailData: {
          title: request.title,
          amount: (request.amount / 100).toFixed(2),
        },
      });
    }

    revalidatePath("/dashboard/outsourcing");
    return { success: true };
  } catch (error) {
    console.error("Complete outsource error:", error);
    return { success: false, error: "Failed to complete outsource" };
  }
}

/**
 * Get user's outsource requests (as outsourcer)
 */
export async function getMyOutsourceRequests(): Promise<OutsourceRequestWithDetails[]> {
  const session = await getServerSession();

  if (!session) {
    return [];
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const requests = await db.query.outsourceRequests.findMany({
      where: eq(outsourceRequests.outsourcerId, session.userId),
      orderBy: [desc(outsourceRequests.createdAt)],
    });

    return await enrichOutsourceRequests(db, requests);
  } catch (error) {
    console.error("Get outsource requests error:", error);
    return [];
  }
}

/**
 * Get outsource invitations for user
 */
export async function getMyOutsourceInvitations() {
  const session = await getServerSession();

  if (!session) {
    return [];
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const invitations = await db.query.outsourceInvitations.findMany({
      where: eq(outsourceInvitations.invitedUserId, session.userId),
      orderBy: [desc(outsourceInvitations.createdAt)],
    });

    // Enrich with request details
    const enriched = await Promise.all(
      invitations.map(async (inv) => {
        const request = await db.query.outsourceRequests.findFirst({
          where: eq(outsourceRequests.id, inv.outsourceRequestId),
        });

        let category = null;
        if (request?.categoryId) {
          category = await db.query.categories.findFirst({
            where: eq(categories.id, request.categoryId),
          });
        }

        return {
          ...inv,
          request: request ? {
            id: request.id,
            title: request.title,
            description: request.description,
            amount: request.amount,
            currency: request.currency,
            deliveryDays: request.deliveryDays,
            deadline: request.deadline,
            status: request.status,
            category: category ? { id: category.id, name: category.name } : null,
          } : null,
        };
      })
    );

    return enriched.filter((inv) => inv.request !== null);
  } catch (error) {
    console.error("Get outsource invitations error:", error);
    return [];
  }
}

/**
 * Get outsource work assigned to user
 */
export async function getMyOutsourceWork() {
  const session = await getServerSession();

  if (!session) {
    return [];
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const requests = await db.query.outsourceRequests.findMany({
      where: eq(outsourceRequests.outsourcedToId, session.userId),
      orderBy: [desc(outsourceRequests.createdAt)],
    });

    return await enrichOutsourceRequests(db, requests);
  } catch (error) {
    console.error("Get outsource work error:", error);
    return [];
  }
}

/**
 * Get outsource request by ID
 */
export async function getOutsourceRequestById(
  id: string
): Promise<OutsourceRequestWithDetails | null> {
  const session = await getServerSession();

  if (!session) {
    return null;
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const request = await db.query.outsourceRequests.findFirst({
      where: eq(outsourceRequests.id, id),
    });

    if (!request) return null;

    // Check if user has access (outsourcer, assigned worker, or invited)
    const isOutsourcer = request.outsourcerId === session.userId;
    const isWorker = request.outsourcedToId === session.userId;

    if (!isOutsourcer && !isWorker) {
      // Check if invited
      const invitation = await db.query.outsourceInvitations.findFirst({
        where: and(
          eq(outsourceInvitations.outsourceRequestId, id),
          eq(outsourceInvitations.invitedUserId, session.userId)
        ),
      });

      if (!invitation) return null;
    }

    const enriched = await enrichOutsourceRequests(db, [request]);
    return enriched[0] || null;
  } catch (error) {
    console.error("Get outsource request error:", error);
    return null;
  }
}

/**
 * Helper to enrich outsource requests with related data
 */
async function enrichOutsourceRequests(
  db: ReturnType<typeof createDb>,
  requests: Array<typeof outsourceRequests.$inferSelect>
): Promise<OutsourceRequestWithDetails[]> {
  return Promise.all(
    requests.map(async (request) => {
      // Get category
      let category = null;
      if (request.categoryId) {
        category = await db.query.categories.findFirst({
          where: eq(categories.id, request.categoryId),
        });
      }

      // Get original order
      let originalOrder = null;
      if (request.originalOrderId) {
        const order = await db.query.orders.findFirst({
          where: eq(orders.id, request.originalOrderId),
        });
        if (order) {
          originalOrder = {
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            deliveryDeadline: order.deliveryDeadline,
          };
        }
      }

      // Get invitations
      const invitations = await db.query.outsourceInvitations.findMany({
        where: eq(outsourceInvitations.outsourceRequestId, request.id),
      });

      const enrichedInvitations = await Promise.all(
        invitations.map(async (inv) => {
          const user = await db.query.users.findFirst({
            where: eq(users.id, inv.invitedUserId),
          });
          return {
            id: inv.id,
            invitedUserId: inv.invitedUserId,
            status: inv.status,
            userName: user?.name || null,
            createdAt: inv.createdAt,
          };
        })
      );

      // Get assigned worker
      let assignedTo = null;
      if (request.outsourcedToId) {
        const worker = await db.query.users.findFirst({
          where: eq(users.id, request.outsourcedToId),
        });
        if (worker) {
          assignedTo = {
            id: worker.id,
            name: worker.name,
            email: worker.email,
          };
        }
      }

      return {
        id: request.id,
        originalOrderId: request.originalOrderId,
        title: request.title,
        description: request.description,
        requirements: request.requirements,
        amount: request.amount,
        currency: request.currency || "ZAR",
        deliveryDays: request.deliveryDays,
        deadline: request.deadline,
        status: request.status,
        isAnonymous: request.isAnonymous,
        createdAt: request.createdAt,
        category: category ? { id: category.id, name: category.name } : null,
        originalOrder,
        invitations: enrichedInvitations,
        assignedTo,
      };
    })
  );
}
