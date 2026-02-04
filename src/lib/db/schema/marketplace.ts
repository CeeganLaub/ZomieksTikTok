// Marketplace tables - Categories, Services, Projects, Bids
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

// Service/Project categories
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"), // Icon name or URL
  parentId: text("parent_id"), // Self-reference handled at app level
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Services (Fiverr-style gigs)
export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  sellerId: text("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => categories.id),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull(),
  shortDescription: text("short_description"),
  
  // Pricing tiers stored as JSON
  // { basic: { name, price, deliveryDays, description, features[] }, standard: {...}, premium: {...} }
  pricingTiers: text("pricing_tiers").notNull(), // JSON
  
  images: text("images"), // JSON array of R2 URLs
  thumbnailUrl: text("thumbnail_url"),
  tags: text("tags"), // JSON array of tags
  
  // Service settings
  maxRevisions: integer("max_revisions").default(2),
  deliveryDays: integer("delivery_days").notNull(),
  
  // Stats
  viewCount: integer("view_count").default(0),
  orderCount: integer("order_count").default(0),
  averageRating: real("average_rating"),
  reviewCount: integer("review_count").default(0),
  
  // Status
  status: text("status", { 
    enum: ["draft", "pending_review", "active", "paused", "rejected"] 
  }).default("draft").notNull(),
  rejectionReason: text("rejection_reason"),
  
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  isFeatured: integer("is_featured", { mode: "boolean" }).default(false),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Projects (Freelancer-style job postings)
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  buyerId: text("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => categories.id),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull(),
  
  // Budget
  budgetType: text("budget_type", { enum: ["fixed", "hourly"] }).default("fixed").notNull(),
  budgetMin: real("budget_min").notNull(),
  budgetMax: real("budget_max").notNull(),
  currency: text("currency").default("ZAR"),
  
  // Timeline
  deadline: text("deadline"),
  expectedDuration: text("expected_duration"), // e.g., "1-2 weeks"
  
  // Requirements
  skills: text("skills"), // JSON array of required skills
  attachments: text("attachments"), // JSON array of R2 URLs
  
  // Stats
  bidCount: integer("bid_count").default(0),
  viewCount: integer("view_count").default(0),
  
  // Status
  status: text("status", { 
    enum: ["draft", "open", "in_progress", "completed", "cancelled", "expired"] 
  }).default("draft").notNull(),
  
  // Outsourcing - only visible to project owner
  isOutsourced: integer("is_outsourced", { mode: "boolean" }).default(false),
  originalOwnerId: text("original_owner_id").references(() => users.id),
  
  // Awarded bid
  awardedBidId: text("awarded_bid_id"),
  awardedAt: text("awarded_at"),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text("expires_at"),
});

// Bids on projects
export const bids = sqliteTable("bids", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  bidderId: text("bidder_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Bid details
  amount: real("amount").notNull(),
  currency: text("currency").default("ZAR"),
  proposal: text("proposal").notNull(),
  deliveryDays: integer("delivery_days").notNull(),
  
  // Milestones proposed (JSON array)
  proposedMilestones: text("proposed_milestones"), // JSON
  
  // Status
  status: text("status", { 
    enum: ["pending", "shortlisted", "accepted", "rejected", "withdrawn"] 
  }).default("pending").notNull(),
  
  // Response from project owner
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  readAt: text("read_at"),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Types
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Bid = typeof bids.$inferSelect;
export type NewBid = typeof bids.$inferInsert;
