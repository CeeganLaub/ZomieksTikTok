// Seed script for initial categories
// Run with: npx wrangler d1 execute DB --local --file=./drizzle/seed.sql
// Or use the API endpoint below for dev

import { createDb } from "@/lib/db";
import { categories } from "@/lib/db/schema";

const defaultCategories = [
  { id: "cat_1", name: "Graphics & Design", slug: "graphics-design", icon: "🎨", sortOrder: 1 },
  { id: "cat_2", name: "Digital Marketing", slug: "digital-marketing", icon: "📈", sortOrder: 2 },
  { id: "cat_3", name: "Writing & Translation", slug: "writing-translation", icon: "✍️", sortOrder: 3 },
  { id: "cat_4", name: "Video & Animation", slug: "video-animation", icon: "🎬", sortOrder: 4 },
  { id: "cat_5", name: "Music & Audio", slug: "music-audio", icon: "🎵", sortOrder: 5 },
  { id: "cat_6", name: "Programming & Tech", slug: "programming-tech", icon: "💻", sortOrder: 6 },
  { id: "cat_7", name: "Business", slug: "business", icon: "💼", sortOrder: 7 },
  { id: "cat_8", name: "Lifestyle", slug: "lifestyle", icon: "🌟", sortOrder: 8 },
  { id: "cat_9", name: "Data", slug: "data", icon: "📊", sortOrder: 9 },
  { id: "cat_10", name: "Photography", slug: "photography", icon: "📷", sortOrder: 10 },
];

export async function seedCategories(d1: D1Database) {
  const db = createDb(d1);
  
  for (const cat of defaultCategories) {
    try {
      await db.insert(categories).values({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      // Ignore duplicate key errors
      console.log(`Category ${cat.name} already exists`);
    }
  }
  
  return defaultCategories.length;
}
