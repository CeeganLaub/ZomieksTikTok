// Database client for Cloudflare D1
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// Type for the Drizzle database instance
export type Database = ReturnType<typeof createDb>;

/**
 * Create a Drizzle database instance from a D1 binding
 * Usage in API routes:
 * 
 * import { createDb } from "@/lib/db";
 * 
 * export async function GET(request: Request) {
 *   const db = createDb((request as any).cf.env.DB);
 *   const users = await db.query.users.findMany();
 *   return Response.json(users);
 * }
 */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

// Re-export schema for convenience
export { schema };

// Re-export commonly used types
export type {
  User,
  NewUser,
  UserProfile,
  NewUserProfile,
  Subscription,
  Service,
  NewService,
  Project,
  NewProject,
  Bid,
  NewBid,
  Order,
  NewOrder,
  Milestone,
  Transaction,
  Review,
  Message,
  Dispute,
  Notification,
} from "./schema";
