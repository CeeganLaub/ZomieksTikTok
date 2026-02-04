// Server actions for services
"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { services, categories, subscriptions } from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Generate UUID
function generateId(): string {
  return crypto.randomUUID();
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export interface PricingTier {
  name: string;
  price: number; // In cents
  deliveryDays: number;
  description: string;
  features: string[];
}

export interface ServiceFormData {
  title: string;
  categoryId: string;
  description: string;
  shortDescription?: string;
  basicTier: PricingTier;
  standardTier?: PricingTier;
  premiumTier?: PricingTier;
  tags?: string[];
  maxRevisions?: number;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  serviceId?: string;
}

/**
 * Create a new service
 */
export async function createService(data: ServiceFormData): Promise<ActionResult> {
  const session = await getServerSession();
  
  if (!session) {
    return { success: false, error: "You must be logged in" };
  }
  
  if (!session.isIdVerified) {
    return { success: false, error: "You must verify your ID to create services" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Check subscription limits for free users
    const userSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.userId),
    });

    if (!userSubscription) {
      return { success: false, error: "Subscription not found" };
    }

    if (userSubscription.plan === "free" && userSubscription.servicesUsed >= 1) {
      return { success: false, error: "You've reached your free service limit. Upgrade to create more services." };
    }

    // Validate category exists
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, data.categoryId),
    });

    if (!category) {
      return { success: false, error: "Invalid category" };
    }

    // Build pricing tiers JSON
    const pricingTiers = {
      basic: data.basicTier,
      ...(data.standardTier && { standard: data.standardTier }),
      ...(data.premiumTier && { premium: data.premiumTier }),
    };

    const serviceId = generateId();
    const slug = generateSlug(data.title) + "-" + serviceId.slice(0, 8);
    const now = new Date().toISOString();

    await db.insert(services).values({
      id: serviceId,
      sellerId: session.userId,
      categoryId: data.categoryId,
      title: data.title.trim(),
      slug,
      description: data.description.trim(),
      shortDescription: data.shortDescription?.trim(),
      pricingTiers: JSON.stringify(pricingTiers),
      tags: data.tags ? JSON.stringify(data.tags) : null,
      maxRevisions: data.maxRevisions ?? 2,
      deliveryDays: data.basicTier.deliveryDays,
      status: "active", // Auto-approve for now, can add review queue later
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Increment services used for free tier
    if (userSubscription.plan === "free") {
      await db
        .update(subscriptions)
        .set({ 
          servicesUsed: userSubscription.servicesUsed + 1,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, userSubscription.id));
    }

    revalidatePath("/dashboard/services");
    return { success: true, serviceId };
  } catch (error) {
    console.error("Create service error:", error);
    return { success: false, error: "Failed to create service" };
  }
}

/**
 * Update an existing service
 */
export async function updateService(
  serviceId: string,
  data: Partial<ServiceFormData>
): Promise<ActionResult> {
  const session = await getServerSession();
  
  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Verify ownership
    const service = await db.query.services.findFirst({
      where: and(
        eq(services.id, serviceId),
        eq(services.sellerId, session.userId)
      ),
    });

    if (!service) {
      return { success: false, error: "Service not found" };
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.title) {
      updates.title = data.title.trim();
      updates.slug = generateSlug(data.title) + "-" + serviceId.slice(0, 8);
    }
    if (data.categoryId) updates.categoryId = data.categoryId;
    if (data.description) updates.description = data.description.trim();
    if (data.shortDescription !== undefined) updates.shortDescription = data.shortDescription?.trim();
    if (data.tags) updates.tags = JSON.stringify(data.tags);
    if (data.maxRevisions !== undefined) updates.maxRevisions = data.maxRevisions;

    if (data.basicTier) {
      const existingTiers = JSON.parse(service.pricingTiers);
      const pricingTiers = {
        basic: data.basicTier,
        ...(data.standardTier ? { standard: data.standardTier } : existingTiers.standard ? { standard: existingTiers.standard } : {}),
        ...(data.premiumTier ? { premium: data.premiumTier } : existingTiers.premium ? { premium: existingTiers.premium } : {}),
      };
      updates.pricingTiers = JSON.stringify(pricingTiers);
      updates.deliveryDays = data.basicTier.deliveryDays;
    }

    await db.update(services).set(updates).where(eq(services.id, serviceId));

    revalidatePath("/dashboard/services");
    revalidatePath(`/services/${service.slug}`);
    return { success: true, serviceId };
  } catch (error) {
    console.error("Update service error:", error);
    return { success: false, error: "Failed to update service" };
  }
}

/**
 * Toggle service active status
 */
export async function toggleServiceStatus(serviceId: string): Promise<ActionResult> {
  const session = await getServerSession();
  
  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const service = await db.query.services.findFirst({
      where: and(
        eq(services.id, serviceId),
        eq(services.sellerId, session.userId)
      ),
    });

    if (!service) {
      return { success: false, error: "Service not found" };
    }

    await db
      .update(services)
      .set({ 
        isActive: !service.isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(services.id, serviceId));

    revalidatePath("/dashboard/services");
    return { success: true };
  } catch (error) {
    console.error("Toggle service error:", error);
    return { success: false, error: "Failed to update service" };
  }
}

/**
 * Delete a service
 */
export async function deleteService(serviceId: string): Promise<ActionResult> {
  const session = await getServerSession();
  
  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const service = await db.query.services.findFirst({
      where: and(
        eq(services.id, serviceId),
        eq(services.sellerId, session.userId)
      ),
    });

    if (!service) {
      return { success: false, error: "Service not found" };
    }

    // Check if service has active orders
    // TODO: Add order check when orders are implemented

    await db.delete(services).where(eq(services.id, serviceId));

    revalidatePath("/dashboard/services");
    return { success: true };
  } catch (error) {
    console.error("Delete service error:", error);
    return { success: false, error: "Failed to delete service" };
  }
}

/**
 * Get user's services
 */
export async function getUserServices() {
  const session = await getServerSession();
  
  if (!session) {
    return [];
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const userServices = await db.query.services.findMany({
      where: eq(services.sellerId, session.userId),
      orderBy: [desc(services.createdAt)],
    });

    return userServices.map((service) => ({
      ...service,
      pricingTiers: JSON.parse(service.pricingTiers) as {
        basic: PricingTier;
        standard?: PricingTier;
        premium?: PricingTier;
      },
      tags: service.tags ? JSON.parse(service.tags) : [],
      images: service.images ? JSON.parse(service.images) : [],
    }));
  } catch (error) {
    console.error("Get user services error:", error);
    return [];
  }
}

/**
 * Get service by slug (for public view)
 */
export async function getServiceBySlug(slug: string) {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const service = await db.query.services.findFirst({
      where: and(
        eq(services.slug, slug),
        eq(services.isActive, true),
        eq(services.status, "active")
      ),
    });

    if (!service) return null;

    // Increment view count
    await db
      .update(services)
      .set({ viewCount: (service.viewCount ?? 0) + 1 })
      .where(eq(services.id, service.id));

    return {
      ...service,
      pricingTiers: JSON.parse(service.pricingTiers),
      tags: service.tags ? JSON.parse(service.tags) : [],
      images: service.images ? JSON.parse(service.images) : [],
    };
  } catch (error) {
    console.error("Get service error:", error);
    return null;
  }
}

/**
 * Get all categories
 */
export async function getCategories() {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    return await db.query.categories.findMany({
      where: eq(categories.isActive, true),
      orderBy: [categories.sortOrder],
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return [];
  }
}
