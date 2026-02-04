// Orders and Transactions - Escrow system
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { services, projects, bids } from "./marketplace";

// Orders - Can be from service purchase or project bid acceptance
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(), // Human-readable: ZOM-2024-XXXXX
  
  // Parties
  buyerId: text("buyer_id").notNull().references(() => users.id),
  sellerId: text("seller_id").notNull().references(() => users.id),
  
  // Source - either service or project bid
  orderType: text("order_type", { enum: ["service", "project"] }).notNull(),
  serviceId: text("service_id").references(() => services.id),
  projectId: text("project_id").references(() => projects.id),
  bidId: text("bid_id").references(() => bids.id),
  
  // Selected tier for service orders
  serviceTier: text("service_tier", { enum: ["basic", "standard", "premium"] }),
  
  // Requirements from buyer
  requirements: text("requirements"), // Buyer's specific requirements
  attachments: text("attachments"), // JSON array of R2 URLs
  
  // Pricing - All amounts in ZAR cents to avoid floating point issues
  subtotal: integer("subtotal").notNull(), // Base amount in cents
  buyerFee: integer("buyer_fee").notNull(), // 3% fee in cents
  sellerFee: integer("seller_fee").notNull(), // 8% fee in cents
  totalAmount: integer("total_amount").notNull(), // subtotal + buyerFee
  sellerEarnings: integer("seller_earnings").notNull(), // subtotal - sellerFee
  currency: text("currency").default("ZAR"),
  
  // Timeline
  deliveryDays: integer("delivery_days").notNull(),
  deliveryDeadline: text("delivery_deadline"),
  deliveredAt: text("delivered_at"),
  acceptedAt: text("accepted_at"),
  
  // Revisions
  revisionsAllowed: integer("revisions_allowed").default(2),
  revisionsUsed: integer("revisions_used").default(0),
  
  // Status
  status: text("status", { 
    enum: [
      "pending_payment",
      "pending_requirements", 
      "in_progress", 
      "delivered",
      "revision_requested",
      "completed", 
      "cancelled",
      "disputed",
      "refunded"
    ] 
  }).default("pending_payment").notNull(),
  
  // Cancellation
  cancelledBy: text("cancelled_by").references(() => users.id),
  cancellationReason: text("cancellation_reason"),
  
  // Rating tracking
  buyerHasReviewed: integer("buyer_has_reviewed", { mode: "boolean" }).default(false),
  sellerHasReviewed: integer("seller_has_reviewed", { mode: "boolean" }).default(false),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: text("completed_at"),
});

// Milestones - For project-based work
export const milestones = sqliteTable("milestones", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  
  title: text("title").notNull(),
  description: text("description"),
  amount: integer("amount").notNull(), // In cents
  sortOrder: integer("sort_order").default(0),
  
  // Deadline for this milestone
  dueDate: text("due_date"),
  
  // Status
  status: text("status", { 
    enum: ["pending", "funded", "in_progress", "delivered", "released", "disputed", "refunded"] 
  }).default("pending").notNull(),
  
  // Escrow tracking
  fundedAt: text("funded_at"),
  deliveredAt: text("delivered_at"),
  releasedAt: text("released_at"),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Payment transactions - Integration with OZOW and PayFast
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  
  // Link to order or milestone or subscription
  orderId: text("order_id").references(() => orders.id),
  milestoneId: text("milestone_id").references(() => milestones.id),
  subscriptionId: text("subscription_id"),
  
  // Party
  userId: text("user_id").notNull().references(() => users.id),
  
  // Transaction details
  type: text("type", { 
    enum: ["payment", "escrow_fund", "escrow_release", "payout", "refund", "subscription"] 
  }).notNull(),
  
  amount: integer("amount").notNull(), // In cents
  currency: text("currency").default("ZAR"),
  
  // Payment provider
  provider: text("provider", { enum: ["ozow", "payfast", "manual"] }).notNull(),
  providerReference: text("provider_reference"), // Transaction ID from provider
  providerStatus: text("provider_status"),
  
  // Status
  status: text("status", { 
    enum: ["pending", "processing", "completed", "failed", "cancelled"] 
  }).default("pending").notNull(),
  
  // Error tracking
  errorMessage: text("error_message"),
  
  // Metadata
  metadata: text("metadata"), // JSON for provider-specific data
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: text("completed_at"),
});

// Order deliveries/submissions
export const orderDeliveries = sqliteTable("order_deliveries", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  milestoneId: text("milestone_id").references(() => milestones.id),
  
  message: text("message").notNull(),
  attachments: text("attachments"), // JSON array of R2 URLs
  
  deliveryType: text("delivery_type", { 
    enum: ["initial", "revision", "final"] 
  }).default("initial").notNull(),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Revision requests
export const revisionRequests = sqliteTable("revision_requests", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  deliveryId: text("delivery_id").notNull().references(() => orderDeliveries.id),
  
  reason: text("reason").notNull(),
  details: text("details"),
  
  status: text("status", { 
    enum: ["pending", "accepted", "rejected"] 
  }).default("pending").notNull(),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  respondedAt: text("responded_at"),
});

// Types
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type OrderDelivery = typeof orderDeliveries.$inferSelect;
export type RevisionRequest = typeof revisionRequests.$inferSelect;
