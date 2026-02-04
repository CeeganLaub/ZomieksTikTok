// Server actions for orders and milestones
"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc, or } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { orders, milestones, transactions, services, projects, bids, orderDeliveries, revisionRequests, users } from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { calculateFees } from "@/lib/utils";
import { 
  triggerOrderCreatedEmail, 
  triggerOrderDeliveredEmail, 
  triggerOrderCompletedEmail,
  triggerMilestoneReleasedEmail 
} from "@/lib/orders/email-triggers";

function generateId(): string {
  return crypto.randomUUID();
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ZOM-${timestamp}-${random}`;
}

export interface MilestoneData {
  title: string;
  description?: string;
  amount: number;
  dueDate?: string;
}

export interface CreateOrderFromServiceData {
  serviceId: string;
  serviceTier: "basic" | "standard" | "premium";
  requirements?: string;
}

export interface CreateOrderFromBidData {
  bidId: string;
  milestones: MilestoneData[];
}

export interface ActionResult {
  success: boolean;
  error?: string;
  orderId?: string;
}

/**
 * Create order from service purchase
 */
export async function createOrderFromService(
  data: CreateOrderFromServiceData
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const service = await db.query.services.findFirst({
      where: eq(services.id, data.serviceId),
    });

    if (!service) {
      return { success: false, error: "Service not found" };
    }

    if (service.sellerId === session.userId) {
      return { success: false, error: "You cannot purchase your own service" };
    }

    // Get pricing for selected tier
    const pricingTiers = service.pricingTiers ? JSON.parse(service.pricingTiers) : null;
    let subtotal = 0;
    let deliveryDays = service.deliveryDays;

    if (pricingTiers && pricingTiers[data.serviceTier]) {
      subtotal = pricingTiers[data.serviceTier].price;
      deliveryDays = pricingTiers[data.serviceTier].deliveryDays || service.deliveryDays;
    } else {
      return { success: false, error: "Selected tier not available" };
    }

    const fees = calculateFees(subtotal);
    const orderId = generateId();
    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();
    const deliveryDeadline = new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000).toISOString();

    // Create order
    await db.insert(orders).values({
      id: orderId,
      orderNumber,
      buyerId: session.userId,
      sellerId: service.sellerId,
      orderType: "service",
      serviceId: service.id,
      serviceTier: data.serviceTier,
      requirements: data.requirements || null,
      subtotal,
      buyerFee: fees.buyerFee,
      sellerFee: fees.sellerFee,
      totalAmount: fees.buyerTotal,
      sellerEarnings: fees.sellerReceives,
      currency: "ZAR",
      deliveryDays,
      deliveryDeadline,
      status: "pending_payment",
      createdAt: now,
      updatedAt: now,
    });

    // Get buyer and seller info for notification
    const [buyer, seller] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, session.userId) }),
      db.query.users.findFirst({ where: eq(users.id, service.sellerId) }),
    ]);

    // Send order created notifications
    if (buyer && seller) {
      await triggerOrderCreatedEmail(db, {
        orderId,
        orderNumber,
        totalAmount: fees.buyerTotal,
        sellerId: seller.id,
        buyerId: buyer.id,
        serviceTitle: service.title,
      });
    }

    revalidatePath("/dashboard/orders");
    return { success: true, orderId };
  } catch (error) {
    console.error("Create order from service error:", error);
    return { success: false, error: "Failed to create order" };
  }
}

/**
 * Create order from accepted bid (project-based with milestones)
 */
export async function createOrderFromBid(
  data: CreateOrderFromBidData
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  if (!data.milestones.length) {
    return { success: false, error: "At least one milestone is required" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const bid = await db.query.bids.findFirst({
      where: eq(bids.id, data.bidId),
    });

    if (!bid) {
      return { success: false, error: "Bid not found" };
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, bid.projectId),
    });

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    if (project.buyerId !== session.userId) {
      return { success: false, error: "You don't own this project" };
    }

    // Calculate totals from milestones
    const subtotal = data.milestones.reduce((sum, m) => sum + m.amount, 0);
    const fees = calculateFees(subtotal);
    const orderId = generateId();
    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();
    const deliveryDeadline = new Date(Date.now() + bid.deliveryDays * 24 * 60 * 60 * 1000).toISOString();

    // Create order
    await db.insert(orders).values({
      id: orderId,
      orderNumber,
      buyerId: session.userId,
      sellerId: bid.bidderId,
      orderType: "project",
      projectId: project.id,
      bidId: bid.id,
      subtotal,
      buyerFee: fees.buyerFee,
      sellerFee: fees.sellerFee,
      totalAmount: fees.buyerTotal,
      sellerEarnings: fees.sellerReceives,
      currency: "ZAR",
      deliveryDays: bid.deliveryDays,
      deliveryDeadline,
      status: "pending_payment",
      createdAt: now,
      updatedAt: now,
    });

    // Create milestones
    for (let i = 0; i < data.milestones.length; i++) {
      const m = data.milestones[i];
      await db.insert(milestones).values({
        id: generateId(),
        orderId,
        title: m.title,
        description: m.description || null,
        amount: m.amount,
        sortOrder: i + 1,
        dueDate: m.dueDate || null,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update bid status
    await db
      .update(bids)
      .set({ status: "accepted", updatedAt: now })
      .where(eq(bids.id, bid.id));

    // Get buyer and seller info for notification
    const [buyer, seller] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, session.userId) }),
      db.query.users.findFirst({ where: eq(users.id, bid.bidderId) }),
    ]);

    // Send order created notifications
    if (buyer && seller) {
      await triggerOrderCreatedEmail(db, {
        orderId,
        orderNumber,
        totalAmount: fees.buyerTotal,
        sellerId: seller.id,
        buyerId: buyer.id,
        projectTitle: project.title,
      });
    }

    revalidatePath("/dashboard/orders");
    return { success: true, orderId };
  } catch (error) {
    console.error("Create order from bid error:", error);
    return { success: false, error: "Failed to create order" };
  }
}

/**
 * Get user's orders (as buyer or seller)
 */
export async function getUserOrders() {
  const session = await getServerSession();

  if (!session) {
    return [];
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    return await db.query.orders.findMany({
      where: or(
        eq(orders.buyerId, session.userId),
        eq(orders.sellerId, session.userId)
      ),
      orderBy: [desc(orders.createdAt)],
    });
  } catch (error) {
    console.error("Get user orders error:", error);
    return [];
  }
}

/**
 * Get order by ID with milestones
 */
export async function getOrderById(orderId: string) {
  const session = await getServerSession();

  if (!session) {
    return null;
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        or(
          eq(orders.buyerId, session.userId),
          eq(orders.sellerId, session.userId)
        )
      ),
    });

    if (!order) return null;

    // Get milestones for project orders
    let orderMilestones: (typeof milestones.$inferSelect)[] = [];
    if (order.orderType === "project") {
      orderMilestones = await db.query.milestones.findMany({
        where: eq(milestones.orderId, orderId),
        orderBy: [milestones.sortOrder],
      });
    }

    return { ...order, milestones: orderMilestones };
  } catch (error) {
    console.error("Get order error:", error);
    return null;
  }
}

/**
 * Fund a milestone (buyer action) - for project orders
 */
export async function fundMilestone(
  milestoneId: string,
  provider: "ozow" | "payfast"
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const milestone = await db.query.milestones.findFirst({
      where: eq(milestones.id, milestoneId),
    });

    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, milestone.orderId),
    });

    if (!order || order.buyerId !== session.userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (milestone.status !== "pending") {
      return { success: false, error: "Milestone is not pending" };
    }

    // TODO: Integrate with OZOW/PayFast payment gateway
    // For now, simulate payment success

    const now = new Date().toISOString();

    // Create transaction record
    await db.insert(transactions).values({
      id: generateId(),
      orderId: milestone.orderId,
      milestoneId,
      userId: session.userId,
      type: "escrow_fund",
      amount: milestone.amount,
      currency: "ZAR",
      provider,
      status: "completed",
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });

    // Update milestone status
    await db
      .update(milestones)
      .set({ status: "funded", fundedAt: now, updatedAt: now })
      .where(eq(milestones.id, milestoneId));

    // Update order status if first funding
    if (order.status === "pending_payment") {
      await db
        .update(orders)
        .set({ status: "in_progress", updatedAt: now })
        .where(eq(orders.id, order.id));
    }

    revalidatePath(`/dashboard/orders/${order.id}`);
    return { success: true };
  } catch (error) {
    console.error("Fund milestone error:", error);
    return { success: false, error: "Failed to fund milestone" };
  }
}

/**
 * Pay for full order (buyer action) - for service orders
 */
export async function payForOrder(
  orderId: string,
  provider: "ozow" | "payfast"
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.buyerId !== session.userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (order.status !== "pending_payment") {
      return { success: false, error: "Order is not pending payment" };
    }

    // TODO: Integrate with payment gateway
    const now = new Date().toISOString();

    // Create payment transaction
    await db.insert(transactions).values({
      id: generateId(),
      orderId,
      userId: session.userId,
      type: "payment",
      amount: order.totalAmount,
      currency: "ZAR",
      provider,
      status: "completed",
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });

    // Update order status
    await db
      .update(orders)
      .set({ status: "pending_requirements", updatedAt: now })
      .where(eq(orders.id, orderId));

    revalidatePath(`/dashboard/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("Pay for order error:", error);
    return { success: false, error: "Failed to process payment" };
  }
}

/**
 * Submit requirements (buyer action)
 */
export async function submitRequirements(
  orderId: string,
  requirements: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order || order.buyerId !== session.userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (order.status !== "pending_requirements") {
      return { success: false, error: "Order is not awaiting requirements" };
    }

    const now = new Date().toISOString();

    await db
      .update(orders)
      .set({
        requirements,
        status: "in_progress",
        updatedAt: now,
      })
      .where(eq(orders.id, orderId));

    revalidatePath(`/dashboard/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("Submit requirements error:", error);
    return { success: false, error: "Failed to submit requirements" };
  }
}

/**
 * Submit delivery (seller action)
 */
export async function submitDelivery(
  orderId: string,
  message: string,
  milestoneId?: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order || order.sellerId !== session.userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (order.status !== "in_progress" && order.status !== "revision_requested") {
      return { success: false, error: "Order is not in progress" };
    }

    const now = new Date().toISOString();
    const deliveryId = generateId();

    // Create delivery record
    await db.insert(orderDeliveries).values({
      id: deliveryId,
      orderId,
      milestoneId: milestoneId || null,
      message,
      deliveryType: order.revisionsUsed && order.revisionsUsed > 0 ? "revision" : "initial",
      createdAt: now,
    });

    // Update order status
    await db
      .update(orders)
      .set({ status: "delivered", deliveredAt: now, updatedAt: now })
      .where(eq(orders.id, orderId));

    // Update milestone if provided
    if (milestoneId) {
      await db
        .update(milestones)
        .set({ status: "delivered", deliveredAt: now, updatedAt: now })
        .where(eq(milestones.id, milestoneId));
    }

    // Get buyer and seller info for notification
    const [buyer, seller] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, order.buyerId) }),
      db.query.users.findFirst({ where: eq(users.id, order.sellerId) }),
    ]);

    // Get milestone title if this is a milestone delivery
    let milestoneTitle = "Order Delivery";
    if (milestoneId) {
      const milestone = await db.query.milestones.findFirst({
        where: eq(milestones.id, milestoneId),
      });
      if (milestone) {
        milestoneTitle = milestone.title;
      }
    }

    // Send delivery notification to buyer
    if (buyer && seller) {
      await triggerOrderDeliveredEmail(db, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        sellerId: seller.id,
        buyerId: buyer.id,
        milestoneTitle,
      });
    }

    revalidatePath(`/dashboard/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("Submit delivery error:", error);
    return { success: false, error: "Failed to submit delivery" };
  }
}

/**
 * Accept delivery and release funds (buyer action)
 */
export async function acceptDelivery(
  orderId: string,
  milestoneId?: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order || order.buyerId !== session.userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (order.status !== "delivered") {
      return { success: false, error: "Order has not been delivered" };
    }

    const now = new Date().toISOString();

    // If milestone-based (project order)
    if (milestoneId) {
      const milestone = await db.query.milestones.findFirst({
        where: eq(milestones.id, milestoneId),
      });

      if (!milestone || milestone.status !== "delivered") {
        return { success: false, error: "Milestone not delivered" };
      }

      // Release funds for milestone
      await db.insert(transactions).values({
        id: generateId(),
        orderId,
        milestoneId,
        userId: order.sellerId,
        type: "escrow_release",
        amount: milestone.amount,
        currency: "ZAR",
        provider: "manual",
        status: "completed",
        createdAt: now,
        updatedAt: now,
        completedAt: now,
      });

      await db
        .update(milestones)
        .set({ status: "released", releasedAt: now, updatedAt: now })
        .where(eq(milestones.id, milestoneId));

      // Check if all milestones are released
      const allMilestones = await db.query.milestones.findMany({
        where: eq(milestones.orderId, orderId),
      });

      const allReleased = allMilestones.every(
        (m) => m.id === milestoneId || m.status === "released"
      );

      if (allReleased) {
        await db
          .update(orders)
          .set({ status: "completed", completedAt: now, acceptedAt: now, updatedAt: now })
          .where(eq(orders.id, orderId));
      } else {
        // Continue with next milestone
        await db
          .update(orders)
          .set({ status: "in_progress", updatedAt: now })
          .where(eq(orders.id, orderId));
      }
    } else {
      // Service order - release full payment
      await db.insert(transactions).values({
        id: generateId(),
        orderId,
        userId: order.sellerId,
        type: "escrow_release",
        amount: order.sellerEarnings,
        currency: "ZAR",
        provider: "manual",
        status: "completed",
        createdAt: now,
        updatedAt: now,
        completedAt: now,
      });

      await db
        .update(orders)
        .set({ status: "completed", completedAt: now, acceptedAt: now, updatedAt: now })
        .where(eq(orders.id, orderId));
    }

    // Get buyer and seller info for notification
    const [buyer, seller] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, order.buyerId) }),
      db.query.users.findFirst({ where: eq(users.id, order.sellerId) }),
    ]);

    // Send notifications for milestone release or order completion
    if (buyer && seller) {
      if (milestoneId) {
        const milestone = await db.query.milestones.findFirst({
          where: eq(milestones.id, milestoneId),
        });

        if (milestone) {
          await triggerMilestoneReleasedEmail(db, {
            orderId: order.id,
            orderNumber: order.orderNumber,
            milestoneTitle: milestone.title,
            amount: milestone.amount,
            sellerId: seller.id,
          });
        }
      } else {
        // Order completed notification for service orders
        await triggerOrderCompletedEmail(db, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          sellerEarnings: order.sellerEarnings,
          sellerId: seller.id,
          buyerId: buyer.id,
        });
      }
    }

    revalidatePath(`/dashboard/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("Accept delivery error:", error);
    return { success: false, error: "Failed to accept delivery" };
  }
}

/**
 * Request revision (buyer action)
 */
export async function requestRevision(
  orderId: string,
  reason: string,
  details?: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order || order.buyerId !== session.userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (order.status !== "delivered") {
      return { success: false, error: "Order has not been delivered" };
    }

    const revisionsAllowed = order.revisionsAllowed || 2;
    const revisionsUsed = order.revisionsUsed || 0;

    if (revisionsUsed >= revisionsAllowed) {
      return { success: false, error: "No revisions remaining" };
    }

    // Get latest delivery
    const latestDelivery = await db.query.orderDeliveries.findFirst({
      where: eq(orderDeliveries.orderId, orderId),
      orderBy: [desc(orderDeliveries.createdAt)],
    });

    if (!latestDelivery) {
      return { success: false, error: "No delivery found" };
    }

    const now = new Date().toISOString();

    // Create revision request
    await db.insert(revisionRequests).values({
      id: generateId(),
      orderId,
      deliveryId: latestDelivery.id,
      reason,
      details: details || null,
      status: "pending",
      createdAt: now,
    });

    // Update order
    await db
      .update(orders)
      .set({
        status: "revision_requested",
        revisionsUsed: revisionsUsed + 1,
        updatedAt: now,
      })
      .where(eq(orders.id, orderId));

    revalidatePath(`/dashboard/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("Request revision error:", error);
    return { success: false, error: "Failed to request revision" };
  }
}

/**
 * Cancel order (buyer or seller action - with conditions)
 */
export async function cancelOrder(
  orderId: string,
  reason: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    const isBuyer = order.buyerId === session.userId;
    const isSeller = order.sellerId === session.userId;

    if (!isBuyer && !isSeller) {
      return { success: false, error: "Unauthorized" };
    }

    // Only allow cancellation before work starts
    const cancellableStatuses = ["pending_payment", "pending_requirements"];
    if (!cancellableStatuses.includes(order.status)) {
      return { success: false, error: "Order cannot be cancelled at this stage" };
    }

    const now = new Date().toISOString();

    await db
      .update(orders)
      .set({
        status: "cancelled",
        cancelledBy: session.userId,
        cancellationReason: reason,
        updatedAt: now,
      })
      .where(eq(orders.id, orderId));

    revalidatePath(`/dashboard/orders/${orderId}`);
    revalidatePath("/dashboard/orders");
    return { success: true };
  } catch (error) {
    console.error("Cancel order error:", error);
    return { success: false, error: "Failed to cancel order" };
  }
}
