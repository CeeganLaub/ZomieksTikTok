// Server actions for shortlist management
"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { shortlist, users, userProfiles, subscriptions, categories } from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

function generateId(): string {
  return crypto.randomUUID();
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface ShortlistEntry {
  id: string;
  shortlistedUserId: string;
  categoryId: string | null;
  notes: string | null;
  priority: number;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  profile: {
    bio: string | null;
    skills: string | null;
    hourlyRate: number | null;
  } | null;
  category: {
    id: string;
    name: string;
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
  
  // Check if subscription is active and paid
  if (subscription.plan === "free") return false;
  
  // Check if active
  if (subscription.status !== "active") return false;
  
  // Check period dates
  const now = new Date();
  if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < now) {
    return false;
  }
  
  return true;
}

/**
 * Add user to shortlist
 */
export async function addToShortlist(
  shortlistedUserId: string,
  categoryId?: string,
  notes?: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  if (shortlistedUserId === session.userId) {
    return { success: false, error: "You cannot add yourself to your shortlist" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Check paid subscription
    const isPaid = await checkPaidSubscription(db, session.userId);
    if (!isPaid) {
      return { success: false, error: "Upgrade to Pro to use shortlist and outsourcing features" };
    }

    // Check if already shortlisted
    const existing = await db.query.shortlist.findFirst({
      where: and(
        eq(shortlist.userId, session.userId),
        eq(shortlist.shortlistedUserId, shortlistedUserId),
        categoryId ? eq(shortlist.categoryId, categoryId) : undefined
      ),
    });

    if (existing) {
      return { success: false, error: "User already in your shortlist" };
    }

    // Verify user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, shortlistedUserId),
    });

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // Add to shortlist
    const now = new Date().toISOString();
    await db.insert(shortlist).values({
      id: generateId(),
      userId: session.userId,
      shortlistedUserId,
      categoryId: categoryId || null,
      notes: notes || null,
      priority: 0,
      createdAt: now,
    });

    revalidatePath("/dashboard/shortlist");
    return { success: true };
  } catch (error) {
    console.error("Add to shortlist error:", error);
    return { success: false, error: "Failed to add to shortlist" };
  }
}

/**
 * Remove user from shortlist
 */
export async function removeFromShortlist(
  shortlistId: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Verify ownership
    const entry = await db.query.shortlist.findFirst({
      where: and(
        eq(shortlist.id, shortlistId),
        eq(shortlist.userId, session.userId)
      ),
    });

    if (!entry) {
      return { success: false, error: "Shortlist entry not found" };
    }

    await db.delete(shortlist).where(eq(shortlist.id, shortlistId));

    revalidatePath("/dashboard/shortlist");
    return { success: true };
  } catch (error) {
    console.error("Remove from shortlist error:", error);
    return { success: false, error: "Failed to remove from shortlist" };
  }
}

/**
 * Update shortlist entry (notes, priority, category)
 */
export async function updateShortlistEntry(
  shortlistId: string,
  updates: {
    notes?: string;
    priority?: number;
    categoryId?: string | null;
  }
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Verify ownership
    const entry = await db.query.shortlist.findFirst({
      where: and(
        eq(shortlist.id, shortlistId),
        eq(shortlist.userId, session.userId)
      ),
    });

    if (!entry) {
      return { success: false, error: "Shortlist entry not found" };
    }

    await db
      .update(shortlist)
      .set({
        notes: updates.notes !== undefined ? updates.notes : entry.notes,
        priority: updates.priority !== undefined ? updates.priority : entry.priority,
        categoryId: updates.categoryId !== undefined ? updates.categoryId : entry.categoryId,
      })
      .where(eq(shortlist.id, shortlistId));

    revalidatePath("/dashboard/shortlist");
    return { success: true };
  } catch (error) {
    console.error("Update shortlist entry error:", error);
    return { success: false, error: "Failed to update shortlist entry" };
  }
}

/**
 * Get user's shortlist
 */
export async function getShortlist(
  categoryId?: string
): Promise<ShortlistEntry[]> {
  const session = await getServerSession();

  if (!session) {
    return [];
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const conditions = [eq(shortlist.userId, session.userId)];

    if (categoryId) {
      conditions.push(eq(shortlist.categoryId, categoryId));
    }

    const entries = await db.query.shortlist.findMany({
      where: and(...conditions),
      orderBy: [desc(shortlist.priority), desc(shortlist.createdAt)],
    });

    // Get user details for each entry
    const enrichedEntries = await Promise.all(
      entries.map(async (entry) => {
        const user = await db.query.users.findFirst({
          where: eq(users.id, entry.shortlistedUserId),
        });

        const profile = await db.query.userProfiles.findFirst({
          where: eq(userProfiles.userId, entry.shortlistedUserId),
        });

        let category = null;
        if (entry.categoryId) {
          category = await db.query.categories.findFirst({
            where: eq(categories.id, entry.categoryId),
          });
        }

        return {
          id: entry.id,
          shortlistedUserId: entry.shortlistedUserId,
          categoryId: entry.categoryId,
          notes: entry.notes,
          priority: entry.priority || 0,
          createdAt: entry.createdAt,
          user: {
            id: user?.id || "",
            name: user?.name || null,
            email: user?.email || "",
            avatar: user?.avatarUrl || null,
          },
          profile: profile ? {
            bio: profile.bio,
            skills: profile.skills,
            hourlyRate: profile.hourlyRate,
          } : null,
          category: category ? {
            id: category.id,
            name: category.name,
          } : null,
        };
      })
    );

    return enrichedEntries;
  } catch (error) {
    console.error("Get shortlist error:", error);
    return [];
  }
}

/**
 * Get shortlisted users by category (for outsourcing)
 */
export async function getShortlistByCategory(
  categoryId: string
): Promise<ShortlistEntry[]> {
  return getShortlist(categoryId);
}

/**
 * Check if user is in shortlist
 */
export async function isInShortlist(
  shortlistedUserId: string,
  categoryId?: string
): Promise<boolean> {
  const session = await getServerSession();

  if (!session) {
    return false;
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const conditions = [
      eq(shortlist.userId, session.userId),
      eq(shortlist.shortlistedUserId, shortlistedUserId),
    ];

    if (categoryId) {
      conditions.push(eq(shortlist.categoryId, categoryId));
    }

    const entry = await db.query.shortlist.findFirst({
      where: and(...conditions),
    });

    return !!entry;
  } catch (error) {
    console.error("Check shortlist error:", error);
    return false;
  }
}

/**
 * Get all categories for shortlist filtering
 */
export async function getCategories() {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    return await db.query.categories.findMany({
      where: eq(categories.isActive, true),
      orderBy: [categories.name],
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return [];
  }
}
