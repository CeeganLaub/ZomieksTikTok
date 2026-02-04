// Server actions for reviews and ratings
"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc, avg, count, sql } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { reviews, orders, users, userProfiles } from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { notify } from "@/lib/notifications";

function generateId(): string {
  return crypto.randomUUID();
}

export interface ActionResult {
  success: boolean;
  error?: string;
  reviewId?: string;
}

export interface ReviewWithDetails {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  reviewType: "buyer_to_seller" | "seller_to_buyer";
  overallRating: number;
  communicationRating: number | null;
  qualityRating: number | null;
  valueRating: number | null;
  timelinessRating: number | null;
  title: string | null;
  comment: string;
  sellerResponse: string | null;
  sellerResponseAt: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  order: {
    orderNumber: string;
    serviceTitle?: string;
    projectTitle?: string;
  } | null;
}

export interface UserStats {
  averageRating: number;
  totalReviews: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
  avgCommunication: number | null;
  avgQuality: number | null;
  avgValue: number | null;
  avgTimeliness: number | null;
  completedOrders: number;
  completionRate: number;
  responseTimeHours: number | null;
}

/**
 * Create a review for an order
 */
export async function createReview(data: {
  orderId: string;
  overallRating: number;
  communicationRating?: number;
  qualityRating?: number;
  valueRating?: number;
  timelinessRating?: number;
  title?: string;
  comment: string;
}): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  // Validate rating
  if (data.overallRating < 1 || data.overallRating > 5) {
    return { success: false, error: "Rating must be between 1 and 5" };
  }

  if (!data.comment || data.comment.trim().length < 10) {
    return { success: false, error: "Review must be at least 10 characters" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Get order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, data.orderId),
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Verify user is part of the order
    const isBuyer = order.buyerId === session.userId;
    const isSeller = order.sellerId === session.userId;

    if (!isBuyer && !isSeller) {
      return { success: false, error: "You are not part of this order" };
    }

    // Check order is completed
    if (order.status !== "completed") {
      return { success: false, error: "Can only review completed orders" };
    }

    // Check if already reviewed
    if (isBuyer && order.buyerHasReviewed) {
      return { success: false, error: "You have already reviewed this order" };
    }
    if (isSeller && order.sellerHasReviewed) {
      return { success: false, error: "You have already reviewed this order" };
    }

    const reviewType = isBuyer ? "buyer_to_seller" : "seller_to_buyer";
    const revieweeId = isBuyer ? order.sellerId : order.buyerId;

    const now = new Date().toISOString();
    const reviewId = generateId();

    // Create review
    await db.insert(reviews).values({
      id: reviewId,
      orderId: data.orderId,
      reviewerId: session.userId,
      revieweeId,
      reviewType,
      overallRating: data.overallRating,
      communicationRating: data.communicationRating || null,
      qualityRating: data.qualityRating || null,
      valueRating: data.valueRating || null,
      timelinessRating: data.timelinessRating || null,
      title: data.title || null,
      comment: data.comment.trim(),
      createdAt: now,
      updatedAt: now,
    });

    // Update order review flags
    await db
      .update(orders)
      .set({
        buyerHasReviewed: isBuyer ? true : order.buyerHasReviewed,
        sellerHasReviewed: isSeller ? true : order.sellerHasReviewed,
        updatedAt: now,
      })
      .where(eq(orders.id, data.orderId));

    // Notify the reviewee
    await notify(db, {
      userId: revieweeId,
      type: "review_received",
      title: "New Review Received",
      message: `You received a ${data.overallRating}-star review for order ${order.orderNumber}`,
      entityType: "review",
      entityId: reviewId,
      sendEmail: true,
      emailData: {
        rating: data.overallRating,
        orderNumber: order.orderNumber,
      },
    });

    revalidatePath(`/dashboard/orders/${data.orderId}`);
    revalidatePath(`/user/${revieweeId}`);
    return { success: true, reviewId };
  } catch (error) {
    console.error("Create review error:", error);
    return { success: false, error: "Failed to create review" };
  }
}

/**
 * Respond to a review (seller only)
 */
export async function respondToReview(
  reviewId: string,
  response: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  if (!response || response.trim().length < 10) {
    return { success: false, error: "Response must be at least 10 characters" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const review = await db.query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    // Only reviewee (seller receiving buyer_to_seller review) can respond
    if (review.revieweeId !== session.userId) {
      return { success: false, error: "Only the reviewed party can respond" };
    }

    if (review.reviewType !== "buyer_to_seller") {
      return { success: false, error: "Can only respond to buyer reviews" };
    }

    if (review.sellerResponse) {
      return { success: false, error: "You have already responded to this review" };
    }

    const now = new Date().toISOString();

    await db
      .update(reviews)
      .set({
        sellerResponse: response.trim(),
        sellerResponseAt: now,
        updatedAt: now,
      })
      .where(eq(reviews.id, reviewId));

    revalidatePath(`/user/${review.revieweeId}`);
    return { success: true };
  } catch (error) {
    console.error("Respond to review error:", error);
    return { success: false, error: "Failed to respond to review" };
  }
}

/**
 * Get reviews for a user (reviews they received)
 */
export async function getReviewsForUser(
  userId: string,
  reviewType?: "buyer_to_seller" | "seller_to_buyer",
  limit?: number
): Promise<ReviewWithDetails[]> {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const conditions = [
      eq(reviews.revieweeId, userId),
      eq(reviews.isVisible, true),
    ];

    if (reviewType) {
      conditions.push(eq(reviews.reviewType, reviewType));
    }

    const userReviews = await db.query.reviews.findMany({
      where: and(...conditions),
      orderBy: [desc(reviews.createdAt)],
      limit: limit || 50,
    });

    return await enrichReviews(db, userReviews);
  } catch (error) {
    console.error("Get reviews for user error:", error);
    return [];
  }
}

/**
 * Get reviews left by a user
 */
export async function getReviewsByUser(userId: string): Promise<ReviewWithDetails[]> {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const userReviews = await db.query.reviews.findMany({
      where: eq(reviews.reviewerId, userId),
      orderBy: [desc(reviews.createdAt)],
    });

    return await enrichReviews(db, userReviews);
  } catch (error) {
    console.error("Get reviews by user error:", error);
    return [];
  }
}

/**
 * Get reviews for an order
 */
export async function getOrderReviews(orderId: string): Promise<ReviewWithDetails[]> {
  const session = await getServerSession();

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Verify user has access to order
    if (session) {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });

      if (order && order.buyerId !== session.userId && order.sellerId !== session.userId) {
        return [];
      }
    }

    const orderReviews = await db.query.reviews.findMany({
      where: eq(reviews.orderId, orderId),
      orderBy: [desc(reviews.createdAt)],
    });

    return await enrichReviews(db, orderReviews);
  } catch (error) {
    console.error("Get order reviews error:", error);
    return [];
  }
}

/**
 * Check if user can review an order
 */
export async function canReviewOrder(orderId: string): Promise<{
  canReview: boolean;
  hasReviewed: boolean;
  reviewType: "buyer_to_seller" | "seller_to_buyer" | null;
}> {
  const session = await getServerSession();

  if (!session) {
    return { canReview: false, hasReviewed: false, reviewType: null };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return { canReview: false, hasReviewed: false, reviewType: null };
    }

    const isBuyer = order.buyerId === session.userId;
    const isSeller = order.sellerId === session.userId;

    if (!isBuyer && !isSeller) {
      return { canReview: false, hasReviewed: false, reviewType: null };
    }

    const reviewType = isBuyer ? "buyer_to_seller" : "seller_to_buyer";
    const hasReviewed = isBuyer ? order.buyerHasReviewed : order.sellerHasReviewed;
    const canReview = order.status === "completed" && !hasReviewed;

    return { canReview, hasReviewed, reviewType };
  } catch (error) {
    console.error("Can review order error:", error);
    return { canReview: false, hasReviewed: false, reviewType: null };
  }
}

/**
 * Get user statistics (ratings, completion rate, etc.)
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Get all visible reviews for user (as seller - buyer_to_seller reviews)
    const userReviews = await db.query.reviews.findMany({
      where: and(
        eq(reviews.revieweeId, userId),
        eq(reviews.reviewType, "buyer_to_seller"),
        eq(reviews.isVisible, true)
      ),
    });

    // Calculate rating stats
    const totalReviews = userReviews.length;
    let avgRating = 0;
    let avgCommunication: number | null = null;
    let avgQuality: number | null = null;
    let avgValue: number | null = null;
    let avgTimeliness: number | null = null;
    let fiveStarCount = 0;
    let fourStarCount = 0;
    let threeStarCount = 0;
    let twoStarCount = 0;
    let oneStarCount = 0;

    if (totalReviews > 0) {
      let sumRating = 0;
      let commSum = 0, commCount = 0;
      let qualSum = 0, qualCount = 0;
      let valSum = 0, valCount = 0;
      let timeSum = 0, timeCount = 0;

      for (const review of userReviews) {
        sumRating += review.overallRating;
        
        if (review.overallRating === 5) fiveStarCount++;
        else if (review.overallRating === 4) fourStarCount++;
        else if (review.overallRating === 3) threeStarCount++;
        else if (review.overallRating === 2) twoStarCount++;
        else if (review.overallRating === 1) oneStarCount++;

        if (review.communicationRating) { commSum += review.communicationRating; commCount++; }
        if (review.qualityRating) { qualSum += review.qualityRating; qualCount++; }
        if (review.valueRating) { valSum += review.valueRating; valCount++; }
        if (review.timelinessRating) { timeSum += review.timelinessRating; timeCount++; }
      }

      avgRating = Math.round((sumRating / totalReviews) * 10) / 10;
      if (commCount > 0) avgCommunication = Math.round((commSum / commCount) * 10) / 10;
      if (qualCount > 0) avgQuality = Math.round((qualSum / qualCount) * 10) / 10;
      if (valCount > 0) avgValue = Math.round((valSum / valCount) * 10) / 10;
      if (timeCount > 0) avgTimeliness = Math.round((timeSum / timeCount) * 10) / 10;
    }

    // Get order completion stats
    const completedOrders = await db
      .select({ count: count() })
      .from(orders)
      .where(and(
        eq(orders.sellerId, userId),
        eq(orders.status, "completed")
      ));

    const totalOrders = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.sellerId, userId));

    const completedCount = completedOrders[0]?.count || 0;
    const totalCount = totalOrders[0]?.count || 0;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

    // TODO: Calculate average response time from messages
    const responseTimeHours: number | null = null;

    return {
      averageRating: avgRating,
      totalReviews,
      fiveStarCount,
      fourStarCount,
      threeStarCount,
      twoStarCount,
      oneStarCount,
      avgCommunication,
      avgQuality,
      avgValue,
      avgTimeliness,
      completedOrders: completedCount,
      completionRate,
      responseTimeHours,
    };
  } catch (error) {
    console.error("Get user stats error:", error);
    return {
      averageRating: 0,
      totalReviews: 0,
      fiveStarCount: 0,
      fourStarCount: 0,
      threeStarCount: 0,
      twoStarCount: 0,
      oneStarCount: 0,
      avgCommunication: null,
      avgQuality: null,
      avgValue: null,
      avgTimeliness: null,
      completedOrders: 0,
      completionRate: 100,
      responseTimeHours: null,
    };
  }
}

/**
 * Helper to enrich reviews with user and order data
 */
async function enrichReviews(
  db: ReturnType<typeof createDb>,
  reviewList: Array<typeof reviews.$inferSelect>
): Promise<ReviewWithDetails[]> {
  return Promise.all(
    reviewList.map(async (review) => {
      // Get reviewer
      const reviewer = await db.query.users.findFirst({
        where: eq(users.id, review.reviewerId),
      });

      // Get order details
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, review.orderId),
      });

      let orderDetails: ReviewWithDetails["order"] = null;
      if (order) {
        orderDetails = {
          orderNumber: order.orderNumber,
        };

        // Get service title if service order
        if (order.serviceId) {
          const { services } = await import("@/lib/db/schema");
          const service = await db.query.services.findFirst({
            where: eq(services.id, order.serviceId),
          });
          if (service) {
            orderDetails.serviceTitle = service.title;
          }
        }

        // Get project title if project order
        if (order.projectId) {
          const { projects } = await import("@/lib/db/schema");
          const project = await db.query.projects.findFirst({
            where: eq(projects.id, order.projectId),
          });
          if (project) {
            orderDetails.projectTitle = project.title;
          }
        }
      }

      return {
        id: review.id,
        orderId: review.orderId,
        reviewerId: review.reviewerId,
        revieweeId: review.revieweeId,
        reviewType: review.reviewType as "buyer_to_seller" | "seller_to_buyer",
        overallRating: review.overallRating,
        communicationRating: review.communicationRating,
        qualityRating: review.qualityRating,
        valueRating: review.valueRating,
        timelinessRating: review.timelinessRating,
        title: review.title,
        comment: review.comment,
        sellerResponse: review.sellerResponse,
        sellerResponseAt: review.sellerResponseAt,
        createdAt: review.createdAt,
        reviewer: {
          id: reviewer?.id || "",
          name: reviewer?.name || null,
          avatarUrl: reviewer?.avatarUrl || null,
        },
        order: orderDetails,
      };
    })
  );
}
