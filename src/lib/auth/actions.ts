// Server actions for authentication
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { users, userProfiles, subscriptions, emailVerificationTokens } from "@/lib/db/schema";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/auth/password";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  deleteSession,
  trackUserSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Generate UUID
function generateId(): string {
  return crypto.randomUUID();
}

// Generate email verification token
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface AuthResult {
  success: boolean;
  error?: string;
  errors?: string[];
}

/**
 * Register a new user
 */
export async function registerUser(formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const name = formData.get("name") as string;

  // Validate inputs
  if (!email || !password || !confirmPassword || !name) {
    return { success: false, error: "All fields are required" };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match" };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Invalid email format" };
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    return { success: false, errors: passwordValidation.errors };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return { success: false, error: "An account with this email already exists" };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = generateId();
    const now = new Date().toISOString();

    await db.insert(users).values({
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      name: name.trim(),
      role: "user",
      isEmailVerified: false,
      isIdVerified: false,
      isSuspended: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create default profile
    await db.insert(userProfiles).values({
      id: generateId(),
      userId,
      createdAt: now,
      updatedAt: now,
    });

    // Create free subscription
    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 100); // Free tier doesn't expire

    await db.insert(subscriptions).values({
      id: generateId(),
      userId,
      plan: "free",
      status: "active",
      bidsUsed: 0,
      servicesUsed: 0,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd.toISOString(),
      createdAt: now,
      updatedAt: now,
    });

    // Create email verification token
    const verificationToken = generateToken();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24);

    await db.insert(emailVerificationTokens).values({
      id: generateId(),
      userId,
      token: verificationToken,
      expiresAt: tokenExpiry.toISOString(),
    });

    // TODO: Send verification email via Resend
    // await sendVerificationEmail(email, verificationToken, name);

    // Create session and log user in
    const sessionToken = await createSession(env.KV, {
      id: userId,
      email: email.toLowerCase(),
      name: name.trim(),
      role: "user",
      isEmailVerified: false,
      isIdVerified: false,
    });

    await trackUserSession(env.KV, userId, sessionToken);
    await setSessionCookie(sessionToken);

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "An error occurred during registration" };
  }
}

/**
 * Log in a user
 */
export async function loginUser(formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return { success: false, error: "Invalid email or password" };
    }

    // Check if user is suspended
    if (user.isSuspended) {
      return { 
        success: false, 
        error: `Your account has been suspended. ${user.suspendedReason || ""}`.trim() 
      };
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return { success: false, error: "Invalid email or password" };
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date().toISOString() })
      .where(eq(users.id, user.id));

    // Create session
    const sessionToken = await createSession(env.KV, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isIdVerified: user.isIdVerified,
    });

    await trackUserSession(env.KV, user.id, sessionToken);
    await setSessionCookie(sessionToken);

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "An error occurred during login" };
  }
}

/**
 * Log out current user
 */
export async function logoutUser(): Promise<void> {
  try {
    const { env } = await getCloudflareContext();
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      await deleteSession(env.KV, token);
    }

    await clearSessionCookie();
  } catch (error) {
    console.error("Logout error:", error);
  }

  redirect("/login");
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<AuthResult> {
  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Find token
    const verificationRecord = await db.query.emailVerificationTokens.findFirst({
      where: eq(emailVerificationTokens.token, token),
    });

    if (!verificationRecord) {
      return { success: false, error: "Invalid or expired verification link" };
    }

    // Check if expired
    if (new Date(verificationRecord.expiresAt) < new Date()) {
      return { success: false, error: "Verification link has expired" };
    }

    // Update user as verified
    await db
      .update(users)
      .set({ 
        isEmailVerified: true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, verificationRecord.userId));

    // Delete the token
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.id, verificationRecord.id));

    return { success: true };
  } catch (error) {
    console.error("Email verification error:", error);
    return { success: false, error: "An error occurred during verification" };
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string;

  if (!email) {
    return { success: false, error: "Email is required" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Find user - don't reveal if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { success: true };
    }

    // TODO: Create reset token and send email
    // const resetToken = generateToken();
    // await sendPasswordResetEmail(email, resetToken);

    return { success: true };
  } catch (error) {
    console.error("Password reset request error:", error);
    return { success: false, error: "An error occurred" };
  }
}
