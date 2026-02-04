// Server actions for projects and bids
"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc, ne } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { projects, bids, subscriptions, categories } from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

function generateId(): string {
  return crypto.randomUUID();
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export interface ProjectFormData {
  title: string;
  categoryId: string;
  description: string;
  budgetType: "fixed" | "hourly";
  budgetMin: number;
  budgetMax: number;
  deadline?: string;
  expectedDuration?: string;
  skills?: string[];
}

export interface BidFormData {
  projectId: string;
  amount: number;
  proposal: string;
  deliveryDays: number;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  id?: string;
}

/**
 * Create a new project
 */
export async function createProject(data: ProjectFormData): Promise<ActionResult> {
  const session = await getServerSession();
  
  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  if (!session.isIdVerified) {
    return { success: false, error: "You must verify your ID to post projects" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Validate category
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, data.categoryId),
    });

    if (!category) {
      return { success: false, error: "Invalid category" };
    }

    const projectId = generateId();
    const slug = generateSlug(data.title) + "-" + projectId.slice(0, 8);
    const now = new Date().toISOString();

    await db.insert(projects).values({
      id: projectId,
      buyerId: session.userId,
      categoryId: data.categoryId,
      title: data.title.trim(),
      slug,
      description: data.description.trim(),
      budgetType: data.budgetType,
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax,
      currency: "ZAR",
      deadline: data.deadline || null,
      expectedDuration: data.expectedDuration || null,
      skills: data.skills ? JSON.stringify(data.skills) : null,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });

    revalidatePath("/dashboard/projects");
    revalidatePath("/browse/projects");
    return { success: true, id: projectId };
  } catch (error) {
    console.error("Create project error:", error);
    return { success: false, error: "Failed to create project" };
  }
}

/**
 * Submit a bid on a project
 */
export async function submitBid(data: BidFormData): Promise<ActionResult> {
  const session = await getServerSession();
  
  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  if (!session.isIdVerified) {
    return { success: false, error: "You must verify your ID to submit bids" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Check project exists and is open
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, data.projectId),
        eq(projects.status, "open")
      ),
    });

    if (!project) {
      return { success: false, error: "Project not found or not accepting bids" };
    }

    // Can't bid on own project
    if (project.buyerId === session.userId) {
      return { success: false, error: "You cannot bid on your own project" };
    }

    // Check if already bid
    const existingBid = await db.query.bids.findFirst({
      where: and(
        eq(bids.projectId, data.projectId),
        eq(bids.bidderId, session.userId)
      ),
    });

    if (existingBid) {
      return { success: false, error: "You have already submitted a bid on this project" };
    }

    // Check subscription limits for free users
    const userSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.userId),
    });

    if (!userSubscription) {
      return { success: false, error: "Subscription not found" };
    }

    if (userSubscription.plan === "free" && userSubscription.bidsUsed >= 5) {
      return { success: false, error: "You've reached your free bid limit. Upgrade to submit more bids." };
    }

    const bidId = generateId();
    const now = new Date().toISOString();

    await db.insert(bids).values({
      id: bidId,
      projectId: data.projectId,
      bidderId: session.userId,
      amount: data.amount,
      currency: "ZAR",
      proposal: data.proposal.trim(),
      deliveryDays: data.deliveryDays,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Update bid count on project
    await db
      .update(projects)
      .set({ 
        bidCount: (project.bidCount ?? 0) + 1,
        updatedAt: now,
      })
      .where(eq(projects.id, data.projectId));

    // Increment bids used for free tier
    if (userSubscription.plan === "free") {
      await db
        .update(subscriptions)
        .set({ 
          bidsUsed: userSubscription.bidsUsed + 1,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, userSubscription.id));
    }

    revalidatePath(`/projects/${project.slug}`);
    revalidatePath("/dashboard/bids");
    return { success: true, id: bidId };
  } catch (error) {
    console.error("Submit bid error:", error);
    return { success: false, error: "Failed to submit bid" };
  }
}

/**
 * Get user's projects (as buyer)
 */
export async function getUserProjects() {
  const session = await getServerSession();
  
  if (!session) {
    return [];
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    return await db.query.projects.findMany({
      where: eq(projects.buyerId, session.userId),
      orderBy: [desc(projects.createdAt)],
    });
  } catch (error) {
    console.error("Get user projects error:", error);
    return [];
  }
}

/**
 * Get user's bids
 */
export async function getUserBids() {
  const session = await getServerSession();
  
  if (!session) {
    return [];
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    return await db.query.bids.findMany({
      where: eq(bids.bidderId, session.userId),
      orderBy: [desc(bids.createdAt)],
    });
  } catch (error) {
    console.error("Get user bids error:", error);
    return [];
  }
}

/**
 * Get open projects for browsing
 */
export async function getOpenProjects() {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    return await db.query.projects.findMany({
      where: eq(projects.status, "open"),
      orderBy: [desc(projects.createdAt)],
      limit: 50,
    });
  } catch (error) {
    console.error("Get open projects error:", error);
    return [];
  }
}

/**
 * Get project by slug with bids
 */
export async function getProjectBySlug(slug: string) {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, slug),
    });

    if (!project) return null;

    // Increment view count
    await db
      .update(projects)
      .set({ viewCount: (project.viewCount ?? 0) + 1 })
      .where(eq(projects.id, project.id));

    return {
      ...project,
      skills: project.skills ? JSON.parse(project.skills) : [],
      attachments: project.attachments ? JSON.parse(project.attachments) : [],
    };
  } catch (error) {
    console.error("Get project error:", error);
    return null;
  }
}

/**
 * Get bids for a project (only visible to project owner)
 */
export async function getProjectBids(projectId: string) {
  const session = await getServerSession();
  
  if (!session) {
    return [];
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Verify user owns the project
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectId),
        eq(projects.buyerId, session.userId)
      ),
    });

    if (!project) {
      return [];
    }

    return await db.query.bids.findMany({
      where: eq(bids.projectId, projectId),
      orderBy: [desc(bids.createdAt)],
    });
  } catch (error) {
    console.error("Get project bids error:", error);
    return [];
  }
}

/**
 * Accept a bid
 */
export async function acceptBid(bidId: string): Promise<ActionResult> {
  const session = await getServerSession();
  
  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Get the bid
    const bid = await db.query.bids.findFirst({
      where: eq(bids.id, bidId),
    });

    if (!bid) {
      return { success: false, error: "Bid not found" };
    }

    // Verify user owns the project
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, bid.projectId),
        eq(projects.buyerId, session.userId)
      ),
    });

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    const now = new Date().toISOString();

    // Update the bid
    await db
      .update(bids)
      .set({ status: "accepted", updatedAt: now })
      .where(eq(bids.id, bidId));

    // Reject other bids
    await db
      .update(bids)
      .set({ status: "rejected", updatedAt: now })
      .where(and(
        eq(bids.projectId, bid.projectId),
        ne(bids.id, bidId)
      ));

    // Update project status
    await db
      .update(projects)
      .set({ 
        status: "in_progress",
        awardedBidId: bidId,
        awardedAt: now,
        updatedAt: now,
      })
      .where(eq(projects.id, bid.projectId));

    // TODO: Create order from accepted bid

    revalidatePath(`/projects/${project.slug}`);
    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error) {
    console.error("Accept bid error:", error);
    return { success: false, error: "Failed to accept bid" };
  }
}
