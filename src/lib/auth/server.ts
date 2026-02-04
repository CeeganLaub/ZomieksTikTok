// Session provider for getting current user session in server components
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies } from "next/headers";
import { Session, getSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function getServerSession(): Promise<Session | null> {
  try {
    const { env } = await getCloudflareContext();
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    return getSession(env.KV, token);
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

/**
 * Get session or throw - use in protected routes
 */
export async function requireSession(): Promise<Session> {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Require verified email
 */
export async function requireVerifiedEmail(): Promise<Session> {
  const session = await requireSession();
  if (!session.isEmailVerified) {
    throw new Error("Email not verified");
  }
  return session;
}

/**
 * Require ID verification
 */
export async function requireIdVerified(): Promise<Session> {
  const session = await requireSession();
  if (!session.isIdVerified) {
    throw new Error("ID not verified");
  }
  return session;
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "moderator") {
    throw new Error("Admin access required");
  }
  return session;
}
