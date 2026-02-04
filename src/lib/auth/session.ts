// Session management using Cloudflare KV
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "zomieks_session";
const SESSION_EXPIRY_DAYS = 7;

export interface Session {
  userId: string;
  email: string;
  name: string;
  role: "user" | "admin" | "moderator";
  isEmailVerified: boolean;
  isIdVerified: boolean;
  createdAt: number;
  expiresAt: number;
}

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create a new session and store it in KV
 */
export async function createSession(
  kv: KVNamespace,
  user: {
    id: string;
    email: string;
    name: string;
    role: "user" | "admin" | "moderator";
    isEmailVerified: boolean;
    isIdVerified: boolean;
  }
): Promise<string> {
  const token = generateSessionToken();
  const now = Date.now();
  const expiresAt = now + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  const session: Session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    isIdVerified: user.isIdVerified,
    createdAt: now,
    expiresAt,
  };

  // Store session in KV with TTL
  await kv.put(`session:${token}`, JSON.stringify(session), {
    expirationTtl: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
  });

  return token;
}

/**
 * Get session from KV by token
 */
export async function getSession(
  kv: KVNamespace,
  token: string
): Promise<Session | null> {
  const data = await kv.get(`session:${token}`);
  if (!data) return null;

  const session = JSON.parse(data) as Session;
  
  // Check if session has expired
  if (session.expiresAt < Date.now()) {
    await kv.delete(`session:${token}`);
    return null;
  }

  return session;
}

/**
 * Get current session from cookies
 */
export async function getCurrentSession(
  kv: KVNamespace
): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!token) return null;
  
  return getSession(kv, token);
}

/**
 * Delete a session from KV
 */
export async function deleteSession(
  kv: KVNamespace,
  token: string
): Promise<void> {
  await kv.delete(`session:${token}`);
}

/**
 * Delete all sessions for a user (for password change, etc.)
 */
export async function deleteAllUserSessions(
  kv: KVNamespace,
  userId: string
): Promise<void> {
  // KV doesn't support listing by prefix efficiently in all cases
  // For critical operations, we'll track session tokens per user
  const userSessions = await kv.get(`user_sessions:${userId}`);
  if (userSessions) {
    const tokens = JSON.parse(userSessions) as string[];
    await Promise.all(tokens.map((token) => kv.delete(`session:${token}`)));
    await kv.delete(`user_sessions:${userId}`);
  }
}

/**
 * Track session token for a user (for bulk deletion)
 */
export async function trackUserSession(
  kv: KVNamespace,
  userId: string,
  token: string
): Promise<void> {
  const existing = await kv.get(`user_sessions:${userId}`);
  const tokens = existing ? (JSON.parse(existing) as string[]) : [];
  tokens.push(token);
  
  // Keep only the last 10 sessions
  const trimmedTokens = tokens.slice(-10);
  
  await kv.put(`user_sessions:${userId}`, JSON.stringify(trimmedTokens), {
    expirationTtl: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 2, // Double the session TTL
  });
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Refresh session expiry (extend session on activity)
 */
export async function refreshSession(
  kv: KVNamespace,
  token: string
): Promise<void> {
  const session = await getSession(kv, token);
  if (!session) return;

  const now = Date.now();
  const newExpiresAt = now + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  const updatedSession: Session = {
    ...session,
    expiresAt: newExpiresAt,
  };

  await kv.put(`session:${token}`, JSON.stringify(updatedSession), {
    expirationTtl: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
  });
}

export { SESSION_COOKIE_NAME };
