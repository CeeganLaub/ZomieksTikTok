// Outsourcing and Admin tables
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { orders } from "./orders";
import { categories } from "./marketplace";

// Outsource requests - For paid users to outsource work anonymously
export const outsourceRequests = sqliteTable("outsource_requests", {
  id: text("id").primaryKey(),
  
  // Original order being outsourced
  originalOrderId: text("original_order_id").notNull().references(() => orders.id),
  
  // The user outsourcing the work (original seller)
  outsourcerId: text("outsourcer_id").notNull().references(() => users.id),
  
  // The user receiving the outsourced work
  outsourcedToId: text("outsourced_to_id").references(() => users.id),
  
  // Category for matching with shortlist
  categoryId: text("category_id").references(() => categories.id),
  
  // Brief for the outsourced worker
  title: text("title").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements"),
  attachments: text("attachments"), // JSON
  
  // Budget offered to outsourced worker
  amount: integer("amount").notNull(), // In cents
  currency: text("currency").default("ZAR"),
  
  // Deadline
  deliveryDays: integer("delivery_days").notNull(),
  deadline: text("deadline"),
  
  // Status
  status: text("status", { 
    enum: ["open", "assigned", "in_progress", "delivered", "completed", "cancelled"] 
  }).default("open").notNull(),
  
  // Always anonymous to end client
  isAnonymous: integer("is_anonymous", { mode: "boolean" }).default(true).notNull(),
  
  // Child order created when accepted
  childOrderId: text("child_order_id").references(() => orders.id),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: text("completed_at"),
});

// Outsource invitations - Sent to shortlisted users
export const outsourceInvitations = sqliteTable("outsource_invitations", {
  id: text("id").primaryKey(),
  outsourceRequestId: text("outsource_request_id").notNull().references(() => outsourceRequests.id, { onDelete: "cascade" }),
  invitedUserId: text("invited_user_id").notNull().references(() => users.id),
  
  status: text("status", { 
    enum: ["pending", "accepted", "rejected", "expired"] 
  }).default("pending").notNull(),
  
  message: text("message"), // Personal message to invitee
  
  respondedAt: text("responded_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text("expires_at").notNull(),
});

// Audit logs - Track admin and important user actions
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  
  actorId: text("actor_id").references(() => users.id),
  actorEmail: text("actor_email"), // Stored for if user deleted
  
  action: text("action").notNull(), // e.g., "user.suspend", "order.refund", "verification.approve"
  
  entityType: text("entity_type").notNull(), // "user", "order", "service", etc.
  entityId: text("entity_id").notNull(),
  
  // Changes made (JSON: { field: { old, new } })
  changes: text("changes"),
  
  // Additional context
  metadata: text("metadata"), // JSON
  
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Platform settings - Key-value store for admin-configurable settings
export const platformSettings = sqliteTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Feature flags
export const featureFlags = sqliteTable("feature_flags", {
  key: text("key").primaryKey(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).default(false).notNull(),
  description: text("description"),
  enabledForUsers: text("enabled_for_users"), // JSON array of user IDs for beta testing
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Subscription plans config
export const subscriptionPlans = sqliteTable("subscription_plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // "monthly", "annual"
  displayName: text("display_name").notNull(),
  description: text("description"),
  
  priceMonthly: integer("price_monthly").notNull(), // In cents
  priceAnnual: integer("price_annual"), // In cents, if applicable
  
  features: text("features"), // JSON array of feature strings
  
  // Limits
  maxServices: integer("max_services"), // null = unlimited
  maxBids: integer("max_bids"), // null = unlimited
  canOutsource: integer("can_outsource", { mode: "boolean" }).default(false),
  
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  sortOrder: integer("sort_order").default(0),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Types
export type OutsourceRequest = typeof outsourceRequests.$inferSelect;
export type NewOutsourceRequest = typeof outsourceRequests.$inferInsert;
export type OutsourceInvitation = typeof outsourceInvitations.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
