// Server actions for ID verification
"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { userVerifications, users } from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

function generateId(): string {
  return crypto.randomUUID();
}

export interface VerificationFormData {
  documentType: "id_card" | "passport" | "drivers_license";
  documentKey: string;
  selfieKey: string;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Get presigned URL for uploading verification documents to R2
 */
export async function getUploadUrl(
  fileType: "document" | "selfie",
  contentType: string
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  // Validate content type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(contentType)) {
    return { success: false, error: "Invalid file type. Allowed: JPEG, PNG, WebP, PDF" };
  }

  try {
    const { env } = await getCloudflareContext();

    // Generate a unique key for the file
    const extension = contentType.split("/")[1] || "bin";
    const key = `verifications/${session.userId}/${fileType}_${Date.now()}.${extension}`;

    // Create placeholder in R2 (actual upload will replace this)
    await env.R2.put(key, "", {
      httpMetadata: { contentType },
    });

    return {
      success: true,
      key,
      url: `/api/upload/${key}`,
    };
  } catch (error) {
    console.error("Get upload URL error:", error);
    return { success: false, error: "Failed to generate upload URL" };
  }
}

/**
 * Submit ID verification request
 */
export async function submitVerification(data: VerificationFormData): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Check for existing pending verification
    const existing = await db.query.userVerifications.findFirst({
      where: eq(userVerifications.userId, session.userId),
    });

    if (existing && existing.status === "pending") {
      return { success: false, error: "You already have a pending verification request" };
    }

    if (existing && existing.status === "approved") {
      return { success: false, error: "You are already verified" };
    }

    const now = new Date().toISOString();

    if (existing) {
      // Update existing rejected verification
      await db
        .update(userVerifications)
        .set({
          documentType: data.documentType,
          documentUrl: data.documentKey,
          selfieUrl: data.selfieKey,
          status: "pending",
          rejectionReason: null,
          reviewedAt: null,
          reviewedBy: null,
        })
        .where(eq(userVerifications.userId, session.userId));
    } else {
      // Create new verification
      await db.insert(userVerifications).values({
        id: generateId(),
        userId: session.userId,
        documentType: data.documentType,
        documentUrl: data.documentKey,
        selfieUrl: data.selfieKey,
        status: "pending",
        createdAt: now,
      });
    }

    revalidatePath("/dashboard/verification");
    return { success: true };
  } catch (error) {
    console.error("Submit verification error:", error);
    return { success: false, error: "Failed to submit verification" };
  }
}

/**
 * Get current user's verification status
 */
export async function getVerificationStatus() {
  const session = await getServerSession();

  if (!session) {
    return null;
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    return await db.query.userVerifications.findFirst({
      where: eq(userVerifications.userId, session.userId),
    });
  } catch (error) {
    console.error("Get verification status error:", error);
    return null;
  }
}

/**
 * Admin: Approve verification
 */
export async function approveVerification(verificationId: string): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session || (session.role !== "admin" && session.role !== "moderator")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const verification = await db.query.userVerifications.findFirst({
      where: eq(userVerifications.id, verificationId),
    });

    if (!verification) {
      return { success: false, error: "Verification not found" };
    }

    const now = new Date().toISOString();

    // Update verification status
    await db
      .update(userVerifications)
      .set({
        status: "approved",
        reviewedAt: now,
        reviewedBy: session.userId,
      })
      .where(eq(userVerifications.id, verificationId));

    // Update user's verified status
    await db
      .update(users)
      .set({
        isIdVerified: true,
        updatedAt: now,
      })
      .where(eq(users.id, verification.userId));

    revalidatePath("/admin/verifications");
    return { success: true };
  } catch (error) {
    console.error("Approve verification error:", error);
    return { success: false, error: "Failed to approve verification" };
  }
}

/**
 * Admin: Reject verification
 */
export async function rejectVerification(
  verificationId: string,
  reason: string
): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session || (session.role !== "admin" && session.role !== "moderator")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const now = new Date().toISOString();

    await db
      .update(userVerifications)
      .set({
        status: "rejected",
        rejectionReason: reason,
        reviewedAt: now,
        reviewedBy: session.userId,
      })
      .where(eq(userVerifications.id, verificationId));

    revalidatePath("/admin/verifications");
    return { success: true };
  } catch (error) {
    console.error("Reject verification error:", error);
    return { success: false, error: "Failed to reject verification" };
  }
}
