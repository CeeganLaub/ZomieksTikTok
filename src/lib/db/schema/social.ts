// Social features - Reviews, Favorites, Messaging, Disputes
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { orders } from "./orders";

// Reviews and ratings
export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id),
  
  // Reviewer and reviewee
  reviewerId: text("reviewer_id").notNull().references(() => users.id),
  revieweeId: text("reviewee_id").notNull().references(() => users.id),
  
  // Review type - buyer reviewing seller or vice versa
  reviewType: text("review_type", { 
    enum: ["buyer_to_seller", "seller_to_buyer"] 
  }).notNull(),
  
  // Rating breakdown
  overallRating: integer("overall_rating").notNull(), // 1-5
  communicationRating: integer("communication_rating"), // 1-5
  qualityRating: integer("quality_rating"), // 1-5
  valueRating: integer("value_rating"), // 1-5
  timelinessRating: integer("timeliness_rating"), // 1-5
  
  // Review content
  title: text("title"),
  comment: text("comment").notNull(),
  
  // Seller response (only for buyer_to_seller reviews)
  sellerResponse: text("seller_response"),
  sellerResponseAt: text("seller_response_at"),
  
  // Moderation
  isVisible: integer("is_visible", { mode: "boolean" }).default(true),
  isReported: integer("is_reported", { mode: "boolean" }).default(false),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Favorites - Users can favorite other users
export const favorites = sqliteTable("favorites", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  favoritedUserId: text("favorited_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  notes: text("notes"), // Personal notes about this user
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Shortlist - For outsourcing purposes (with category)
export const shortlist = sqliteTable("shortlist", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  shortlistedUserId: text("shortlisted_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: text("category_id"), // Optional category specialization
  notes: text("notes"),
  priority: integer("priority").default(0), // For ordering
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Conversations
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  
  // Participants (2 users)
  participant1Id: text("participant1_id").notNull().references(() => users.id),
  participant2Id: text("participant2_id").notNull().references(() => users.id),
  
  // Associated order if applicable
  orderId: text("order_id").references(() => orders.id),
  
  // Last message preview
  lastMessageAt: text("last_message_at"),
  lastMessagePreview: text("last_message_preview"),
  
  // Unread counts
  participant1UnreadCount: integer("participant1_unread_count").default(0),
  participant2UnreadCount: integer("participant2_unread_count").default(0),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Messages
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => users.id),
  
  content: text("content").notNull(),
  attachments: text("attachments"), // JSON array of R2 URLs
  
  messageType: text("message_type", { 
    enum: ["text", "offer", "system", "file"] 
  }).default("text").notNull(),
  
  // For offer messages
  offerAmount: integer("offer_amount"), // In cents
  offerStatus: text("offer_status", { enum: ["pending", "accepted", "rejected"] }),
  
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  readAt: text("read_at"),
  
  // Soft delete for sender
  isDeletedBySender: integer("is_deleted_by_sender", { mode: "boolean" }).default(false),
  isDeletedByReceiver: integer("is_deleted_by_receiver", { mode: "boolean" }).default(false),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Disputes
export const disputes = sqliteTable("disputes", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id),
  
  raisedById: text("raised_by_id").notNull().references(() => users.id),
  againstId: text("against_id").notNull().references(() => users.id),
  
  // Dispute details
  category: text("category", { 
    enum: [
      "not_as_described",
      "late_delivery",
      "no_delivery",
      "poor_quality",
      "communication_issues",
      "other"
    ] 
  }).notNull(),
  
  title: text("title").notNull(),
  description: text("description").notNull(),
  evidence: text("evidence"), // JSON array of R2 URLs
  
  // Resolution
  status: text("status", { 
    enum: ["open", "under_review", "resolved", "escalated", "closed"] 
  }).default("open").notNull(),
  
  resolution: text("resolution", { 
    enum: ["refund_full", "refund_partial", "release_funds", "no_action", "other"] 
  }),
  resolutionNotes: text("resolution_notes"),
  resolutionAmount: integer("resolution_amount"), // Partial refund amount
  
  // Admin handling
  assignedTo: text("assigned_to").references(() => users.id),
  resolvedBy: text("resolved_by").references(() => users.id),
  resolvedAt: text("resolved_at"),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Dispute messages - Back and forth between parties and admin
export const disputeMessages = sqliteTable("dispute_messages", {
  id: text("id").primaryKey(),
  disputeId: text("dispute_id").notNull().references(() => disputes.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => users.id),
  
  message: text("message").notNull(),
  attachments: text("attachments"), // JSON
  
  isFromAdmin: integer("is_from_admin", { mode: "boolean" }).default(false),
  isInternal: integer("is_internal", { mode: "boolean" }).default(false), // Admin-only notes
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Notifications
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  type: text("type", { 
    enum: [
      "order_created",
      "order_delivered",
      "order_completed",
      "order_cancelled",
      "payment_received",
      "new_message",
      "new_bid",
      "bid_accepted",
      "review_received",
      "dispute_opened",
      "dispute_resolved",
      "verification_approved",
      "verification_rejected",
      "subscription_expiring",
      "system"
    ] 
  }).notNull(),
  
  title: text("title").notNull(),
  message: text("message").notNull(),
  
  // Link to related entity
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  readAt: text("read_at"),
  
  // Email sent tracking
  emailSent: integer("email_sent", { mode: "boolean" }).default(false),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Types
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;
export type Shortlist = typeof shortlist.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Dispute = typeof disputes.$inferSelect;
export type NewDispute = typeof disputes.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
