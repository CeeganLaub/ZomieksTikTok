// Server actions for admin operations
"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc, count, sql, or, like } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { 
  users, 
  userVerifications, 
  userProfiles,
  subscriptions,
  orders,
  services,
  projects,
  reviews,
  disputes,
  categories,
  auditLogs,
  platformSettings,
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
}

/**
 * Check if current user is admin
 */
async function requireAdmin(db: ReturnType<typeof createDb>) {
  const session = await getServerSession();
  
  if (!session) {
    throw new Error("Authentication required");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!user || user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return { session, user };
}

/**
 * Log admin action
 */
async function logAction(
  db: ReturnType<typeof createDb>,
  actorId: string,
  actorEmail: string,
  action: string,
  entityType: string,
  entityId: string,
  changes?: Record<string, { old: unknown; new: unknown }>,
  metadata?: Record<string, unknown>
) {
  await db.insert(auditLogs).values({
    id: generateId(),
    actorId,
    actorEmail,
    action,
    entityType,
    entityId,
    changes: changes ? JSON.stringify(changes) : null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    createdAt: new Date().toISOString(),
  });
}

// ==================== PLATFORM STATS ====================

export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  pendingVerifications: number;
  totalOrders: number;
  completedOrders: number;
  activeDisputes: number;
  totalRevenue: number;
  totalServices: number;
  totalProjects: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);
    await requireAdmin(db);

    const [
      usersCount,
      verifiedUsersCount,
      pendingVerificationsCount,
      ordersCount,
      completedOrdersCount,
      disputesCount,
      revenueResult,
      servicesCount,
      projectsCount,
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(userVerifications).where(eq(userVerifications.status, "approved")),
      db.select({ count: count() }).from(userVerifications).where(eq(userVerifications.status, "pending")),
      db.select({ count: count() }).from(orders),
      db.select({ count: count() }).from(orders).where(eq(orders.status, "completed")),
      db.select({ count: count() }).from(disputes).where(or(eq(disputes.status, "open"), eq(disputes.status, "under_review"))),
      db.select({ sum: sql<number>`SUM(seller_fee + buyer_fee)` }).from(orders).where(eq(orders.status, "completed")),
      db.select({ count: count() }).from(services).where(eq(services.status, "active")),
      db.select({ count: count() }).from(projects),
    ]);

    // Active users = logged in within 30 days (simplified)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const activeUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.lastLoginAt} >= ${thirtyDaysAgo}`);

    return {
      totalUsers: usersCount[0]?.count || 0,
      activeUsers: activeUsersResult[0]?.count || 0,
      verifiedUsers: verifiedUsersCount[0]?.count || 0,
      pendingVerifications: pendingVerificationsCount[0]?.count || 0,
      totalOrders: ordersCount[0]?.count || 0,
      completedOrders: completedOrdersCount[0]?.count || 0,
      activeDisputes: disputesCount[0]?.count || 0,
      totalRevenue: revenueResult[0]?.sum || 0,
      totalServices: servicesCount[0]?.count || 0,
      totalProjects: projectsCount[0]?.count || 0,
    };
  } catch (error) {
    console.error("Get platform stats error:", error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      verifiedUsers: 0,
      pendingVerifications: 0,
      totalOrders: 0,
      completedOrders: 0,
      activeDisputes: 0,
      totalRevenue: 0,
      totalServices: 0,
      totalProjects: 0,
    };
  }
}

// ==================== USER MANAGEMENT ====================

export interface UserListItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isIdVerified: boolean;
  isSuspended: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  orderCount: number;
  reviewCount: number;
  avgRating: number | null;
}

export async function getUsers(options: {
  search?: string;
  filter?: "all" | "verified" | "suspended" | "admin";
  page?: number;
  limit?: number;
}): Promise<{ users: UserListItem[]; total: number }> {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);
    await requireAdmin(db);

    const page = options.page || 1;
    const limit = options.limit || 25;
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];
    
    if (options.search) {
      conditions.push(
        or(
          like(users.email, `%${options.search}%`),
          like(users.name, `%${options.search}%`)
        )
      );
    }

    if (options.filter === "verified") {
      conditions.push(eq(users.isIdVerified, true));
    } else if (options.filter === "suspended") {
      conditions.push(eq(users.isSuspended, true));
    } else if (options.filter === "admin") {
      conditions.push(eq(users.role, "admin"));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [usersList, totalResult] = await Promise.all([
      db.query.users.findMany({
        where: whereClause,
        orderBy: [desc(users.createdAt)],
        limit,
        offset,
      }),
      db.select({ count: count() }).from(users).where(whereClause),
    ]);

    // Enrich with stats
    const enrichedUsers = await Promise.all(
      usersList.map(async (user) => {
        const [orderCount, reviewStats] = await Promise.all([
          db.select({ count: count() }).from(orders).where(
            or(eq(orders.buyerId, user.id), eq(orders.sellerId, user.id))
          ),
          db.select({ 
            count: count(),
            avg: sql<number>`AVG(overall_rating)`,
          }).from(reviews).where(eq(reviews.revieweeId, user.id)),
        ]);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isIdVerified: user.isIdVerified,
          isSuspended: user.isSuspended,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          orderCount: orderCount[0]?.count || 0,
          reviewCount: reviewStats[0]?.count || 0,
          avgRating: reviewStats[0]?.avg || null,
        };
      })
    );

    return {
      users: enrichedUsers,
      total: totalResult[0]?.count || 0,
    };
  } catch (error) {
    console.error("Get users error:", error);
    return { users: [], total: 0 };
  }
}

export async function suspendUser(
  userId: string, 
  reason: string
): Promise<ActionResult> {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);
    const { user: admin } = await requireAdmin(db);

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    if (targetUser.role === "admin") {
      return { success: false, error: "Cannot suspend admin users" };
    }

    await db
      .update(users)
      .set({ 
        isSuspended: true, 
        suspendedReason: reason,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));

    await logAction(db, admin.id, admin.email, "user.suspend", "user", userId, {
      isSuspended: { old: false, new: true },
    }, { reason });

    await notify(db, {
      userId,
      type: "system",
      title: "Account Suspended",
      message: `Your account has been suspended. Reason: ${reason}`,
      sendEmail: true,
      emailData: { reason },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Suspend user error:", error);
    return { success: false, error: "Failed to suspend user" };
  }
}

export async function unsuspendUser(userId: string): Promise<ActionResult> {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);
    const { user: admin } = await requireAdmin(db);

    await db
      .update(users)
      .set({ 
        isSuspended: false, 
        suspendedReason: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));

    await logAction(db, admin.id, admin.email, "user.unsuspend", "user", userId, {
      isSuspended: { old: true, new: false },
    });

    await notify(db, {
      userId,
      type: "system",
      title: "Account Reinstated",
      message: "Your account suspension has been lifted. Welcome back!",
      sendEmail: true,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Unsuspend user error:", error);
    return { success: false, error: "Failed to unsuspend user" };
  }
}

// ==================== VERIFICATION QUEUE ====================

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  documentType: string;
  documentUrl: string | null;
  selfieUrl: string | null;
  status: string;
  createdAt: string;
  notes: string | null;
}

export async function getPendingVerifications(): Promise<VerificationRequest[]> {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);
    await requireAdmin(db);

    const verifications = await db.query.userVerifications.findMany({
      where: eq(userVerifications.status, "pending"),
      orderBy: [desc(userVerifications.createdAt)],
    });

    const enriched = await Promise.all(
      verifications.map(async (v) => {
        const user = await db.query.users.findFirst({
          where: eq(users.id, v.userId),
        });

        return {
          id: v.id,
          userId: v.userId,
          userName: user?.name || null,
          userEmail: user?.email || "",
          documentType: v.documentType,
          documentUrl: v.documentUrl,
          selfieUrl: v.selfieUrl,
          status: v.status,
          createdAt: v.createdAt,
          notes: v.notes,
        };
      })
    );

    return enriched;
  } catch (error) {
    console.error("Get pending verifications error:", error);
    return [];
  }
}

export async function approveVerification(
  verificationId: string
): Promise<ActionResult> {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);
    const { user: admin } = await requireAdmin(db);

    const verification = await db.query.userVerifications.findFirst({
      where: eq(userVerifications.id, verificationId),
    });

    if (!verification) {
      return { success: false, error: "Verification not found" };
    }

    const now = new Date().toISOString();

    await db
      .update(userVerifications)
      .set({ 
        status: "approved",
        reviewedBy: admin.id,
        reviewedAt: now,
      })
      .where(eq(userVerifications.id, verificationId));

    await db
      .update(users)
      .set({ 
        isIdVerified: true,
        updatedAt: now,
      })
      .where(eq(users.id, verification.userId));

    await logAction(db, admin.id, admin.email, "verification.approve", "user_verification", verificationId);

    await notify(db, {
      userId: verification.userId,
      type: "verification_approved",
      title: "ID Verification Approved!",
      message: "Your identity has been verified. You now have the Verified badge on your profile.",
      sendEmail: true,
    });

    revalidatePath("/admin/verifications");
    return { success: true };
  } catch (error) {
    console.error("Approve verification error:", error);
    return { success: false, error: "Failed to approve verification" };
  }
}

export async function rejectVerification(
  verificationId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);
    const { user: admin } = await requireAdmin(db);

    const verification = await db.query.userVerifications.findFirst({
      where: eq(userVerifications.id, verificationId),
    });

    if (!verification) {
      return { success: false, error: "Verification not found" };
    }

    const now = new Date().toISOString();

    await db
      .update(userVerifications)
      .set({ 
        status: "rejected",
        reviewedBy: admin.id,
        reviewedAt: now,
        notes: reason,
      })
      .where(eq(userVerifications.id, verificationId));

    await logAction(db, admin.id, admin.email, "verification.reject", "user_verification", verificationId, {}, { reason });

    await notify(db, {
      userId: verification.userId,
      type: "verification_rejected",
      title: "ID Verification Rejected",
      message: `Your verification was rejected. Reason: ${reason}. Please submit again.`,
      sendEmail: true,
      emailData: { reason },
    });

    revalidatePath("/admin/verifications");
    return { success: true };
  } catch (error) {
    console.error("Reject verification error:", error);
    return { success: false, error: "Failed to reject verification" };
  }
}

// ==================== DISPUTES ====================

export interface DisputeDetails {
  id: string;
  orderId: string;
  orderNumber: string;
  raisedBy: { id: string; name: string | null; email: string };
  against: { id: string; name: string | null; email: string };
  category: string;
  title: string;
  description: string;
  status: string;
  evidence: string[] | null;
  createdAt: string;
  orderAmount: number;
}

export async function getDisputes(
  status?: "open" | "under_review" | "resolved" | "escalated" | "closed"
): Promise<DisputeDetails[]> {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);
    await requireAdmin(db);

    const disputesList = await db.query.disputes.findMany({
      where: status ? eq(disputes.status, status) : undefined,
      orderBy: [desc(disputes.createdAt)],
    });

    const enriched = await Promise.all(
      disputesList.map(async (d) => {
        const [order, raisedBy, against] = await Promise.all([
          db.query.orders.findFirst({ where: eq(orders.id, d.orderId) }),
          db.query.users.findFirst({ where: eq(users.id, d.raisedById) }),
          db.query.users.findFirst({ where: eq(users.id, d.againstId) }),
        ]);

        return {
          id: d.id,
          orderId: d.orderId,
          orderNumber: order?.orderNumber || "",
          raisedBy: {
            id: raisedBy?.id || "",
            name: raisedBy?.name || null,
            email: raisedBy?.email || "",
          },
          against: {
            id: against?.id || "",
            name: against?.name || null,
            email: against?.email || "",
          },
          category: d.category,
          title: d.title,
          description: d.description,
          status: d.status,
          evidence: d.evidence ? JSON.parse(d.evidence) : null,
          createdAt: d.createdAt,
          orderAmount: order?.totalAmount || 0,
        };
      })
    );

    return enriched;
  } catch (error) {
    console.error("Get disputes error:", error);
    return [];
  }
}

export async function resolveDispute(
  disputeId: string,
  resolution: "refund_full" | "refund_partial" | "release_funds" | "no_action" | "other",
  notes: string,
  partialAmount?: number
): Promise<ActionResult> {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);
    const { user: admin } = await requireAdmin(db);

    const dispute = await db.query.disputes.findFirst({
      where: eq(disputes.id, disputeId),
    });

    if (!dispute) {
      return { success: false, error: "Dispute not found" };
    }

    const now = new Date().toISOString();

    await db
      .update(disputes)
      .set({
        status: "resolved",
        resolution,
        resolutionNotes: notes,
        resolutionAmount: partialAmount || null,
        resolvedBy: admin.id,
        resolvedAt: now,
        updatedAt: now,
      })
      .where(eq(disputes.id, disputeId));

    await logAction(db, admin.id, admin.email, "dispute.resolve", "dispute", disputeId, {
      status: { old: dispute.status, new: "resolved" },
    }, { resolution, notes });

    // Notify both parties
    await notify(db, {
      userId: dispute.raisedById,
      type: "dispute_resolved",
      title: "Dispute Resolved",
      message: `Your dispute has been resolved. Resolution: ${resolution.replace("_", " ")}`,
      entityType: "dispute",
      entityId: disputeId,
      sendEmail: true,
    });

    await notify(db, {
      userId: dispute.againstId,
      type: "dispute_resolved",
      title: "Dispute Resolved",
      message: `A dispute against you has been resolved. Resolution: ${resolution.replace("_", " ")}`,
      entityType: "dispute",
      entityId: disputeId,
      sendEmail: true,
    });

    revalidatePath("/admin/disputes");
    return { success: true };
  } catch (error) {
    console.error("Resolve dispute error:", error);
    return { success: false, error: "Failed to resolve dispute" };
  }
}

// ==================== CATEGORIES ====================

export async function getCategories() {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);
    await requireAdmin(db);

    return await db.query.categories.findMany({
      orderBy: [categories.name],
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return [];
  }
}

export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  icon?: string;
}): Promise<ActionResult> {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);
    const { user: admin } = await requireAdmin(db);

    const now = new Date().toISOString();
    const id = generateId();

    await db.insert(categories).values({
      id,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      parentId: data.parentId || null,
      icon: data.icon || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await logAction(db, admin.id, admin.email, "category.create", "category", id, {}, { name: data.name });

    revalidatePath("/admin/categories");
    return { success: true };
  } catch (error) {
    console.error("Create category error:", error);
    return { success: false, error: "Failed to create category" };
  }
}

export async function updateCategory(
  id: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
    icon?: string;
    isActive?: boolean;
  }
): Promise<ActionResult> {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);
    const { user: admin } = await requireAdmin(db);

    await db
      .update(categories)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(categories.id, id));

    await logAction(db, admin.id, admin.email, "category.update", "category", id, {}, data);

    revalidatePath("/admin/categories");
    return { success: true };
  } catch (error) {
    console.error("Update category error:", error);
    return { success: false, error: "Failed to update category" };
  }
}

// ==================== AUDIT LOGS ====================

export async function getAuditLogs(limit = 100) {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);
    await requireAdmin(db);

    return await db.query.auditLogs.findMany({
      orderBy: [desc(auditLogs.createdAt)],
      limit,
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    return [];
  }
}
