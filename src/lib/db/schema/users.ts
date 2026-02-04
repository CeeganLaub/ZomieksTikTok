// User-related tables
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Main users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  role: text("role", { enum: ["user", "admin", "moderator"] }).default("user").notNull(),
  isEmailVerified: integer("is_email_verified", { mode: "boolean" }).default(false).notNull(),
  isIdVerified: integer("is_id_verified", { mode: "boolean" }).default(false).notNull(),
  isSuspended: integer("is_suspended", { mode: "boolean" }).default(false).notNull(),
  suspendedReason: text("suspended_reason"),
  lastLoginAt: text("last_login_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// User profiles with extended info
export const userProfiles = sqliteTable("user_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  headline: text("headline"), // Short professional tagline
  skills: text("skills"), // JSON array of skills
  location: text("location"),
  hourlyRate: real("hourly_rate"),
  currency: text("currency").default("ZAR"),
  portfolioUrls: text("portfolio_urls"), // JSON array
  website: text("website"),
  responseTime: text("response_time"), // avg response time
  completionRate: real("completion_rate"), // percentage
  totalEarnings: real("total_earnings").default(0),
  totalSpent: real("total_spent").default(0),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ID verification documents
export const userVerifications = sqliteTable("user_verifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  documentType: text("document_type", { 
    enum: ["id_card", "passport", "drivers_license"] 
  }).notNull(),
  documentUrl: text("document_url").notNull(), // R2 URL
  selfieUrl: text("selfie_url"), // Optional selfie for matching
  status: text("status", { 
    enum: ["pending", "approved", "rejected"] 
  }).default("pending").notNull(),
  rejectionReason: text("rejection_reason"),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Subscription plans
export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan", { enum: ["free", "monthly", "annual"] }).default("free").notNull(),
  status: text("status", { 
    enum: ["active", "cancelled", "expired", "past_due"] 
  }).default("active").notNull(),
  bidsUsed: integer("bids_used").default(0).notNull(), // For free tier (max 5)
  servicesUsed: integer("services_used").default(0).notNull(), // For free tier (max 1)
  currentPeriodStart: text("current_period_start").notNull(),
  currentPeriodEnd: text("current_period_end").notNull(),
  cancelledAt: text("cancelled_at"),
  paymentReference: text("payment_reference"), // PayFast/OZOW reference
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Email verification tokens
export const emailVerificationTokens = sqliteTable("email_verification_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Password reset tokens
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// User types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type UserVerification = typeof userVerifications.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
