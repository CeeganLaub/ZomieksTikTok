// Notifications API
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "@/lib/notifications";

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get("unread") === "true";
    const countOnly = searchParams.get("count") === "true";

    if (countOnly) {
      const count = await getUnreadCount(db, session.userId);
      return NextResponse.json({ count });
    }

    const notifications = await getUserNotifications(db, session.userId, {
      unreadOnly,
      limit: 50,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { error: "Failed to get notifications" },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      action: "mark_read" | "mark_all_read";
      notificationId?: string;
    };

    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    if (body.action === "mark_all_read") {
      const count = await markAllAsRead(db, session.userId);
      return NextResponse.json({ success: true, markedCount: count });
    }

    if (body.action === "mark_read" && body.notificationId) {
      const success = await markAsRead(db, body.notificationId, session.userId);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Update notification error:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
