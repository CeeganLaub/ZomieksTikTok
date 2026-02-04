import { Check, CheckCheck, Bell, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/lib/db";
import { getUserNotifications, markAllAsRead } from "@/lib/notifications";
import { redirect } from "next/navigation";

interface MarkAllReadFormProps {
  userId: string;
}

async function handleMarkAllRead() {
  "use server";
  
  const session = await requireSession();
  const { env } = await getCloudflareContext();
  const db = createDb(env.DB);
  
  await markAllAsRead(db, session.userId);
  redirect("/dashboard/notifications");
}

const typeIcons: Record<string, string> = {
  order_created: "📦",
  order_delivered: "🚀",
  order_completed: "✅",
  order_cancelled: "❌",
  payment_received: "💰",
  new_message: "💬",
  new_bid: "📝",
  bid_accepted: "🎉",
  review_received: "⭐",
  dispute_opened: "⚠️",
  dispute_resolved: "✅",
  verification_approved: "✅",
  verification_rejected: "❌",
  subscription_expiring: "⏰",
  system: "ℹ️",
};

const typeColors: Record<string, string> = {
  order_created: "bg-blue-500/10 text-blue-500",
  order_delivered: "bg-cyan-500/10 text-cyan-500",
  order_completed: "bg-green-500/10 text-green-500",
  order_cancelled: "bg-red-500/10 text-red-500",
  payment_received: "bg-emerald-500/10 text-emerald-500",
  new_message: "bg-purple-500/10 text-purple-500",
  new_bid: "bg-yellow-500/10 text-yellow-600",
  bid_accepted: "bg-green-500/10 text-green-500",
  review_received: "bg-yellow-500/10 text-yellow-600",
  dispute_opened: "bg-orange-500/10 text-orange-500",
  dispute_resolved: "bg-green-500/10 text-green-500",
  verification_approved: "bg-green-500/10 text-green-500",
  verification_rejected: "bg-red-500/10 text-red-500",
  subscription_expiring: "bg-yellow-500/10 text-yellow-600",
  system: "bg-gray-500/10 text-gray-500",
};

function getEntityLink(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  
  const links: Record<string, string> = {
    order: `/dashboard/orders/${entityId}`,
    project: `/dashboard/projects/${entityId}`,
    conversation: `/dashboard/messages/${entityId}`,
    service: `/dashboard/services/${entityId}`,
  };
  
  return links[entityType] || null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function NotificationsPage() {
  const session = await requireSession();
  const { env } = await getCloudflareContext();
  const db = createDb(env.DB);
  
  const notifications = await getUserNotifications(db, session.userId, {
    limit: 100,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated on your orders, messages, and more
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={handleMarkAllRead}>
            <Button type="submit" variant="outline" size="sm">
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read ({unreadCount})
            </Button>
          </form>
        )}
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            All Notifications
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No notifications yet</h3>
              <p className="text-sm text-muted-foreground">
                When you receive orders, messages, or other updates, they will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const link = getEntityLink(notification.entityType, notification.entityId);
                const icon = typeIcons[notification.type] || "📢";
                const colorClass = typeColors[notification.type] || "bg-gray-500/10 text-gray-500";

                const content = (
                  <div
                    className={`flex items-start gap-4 p-4 -mx-4 transition-colors ${
                      !notification.isRead ? "bg-muted/50" : ""
                    } ${link ? "hover:bg-muted cursor-pointer" : ""}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${colorClass}`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {notification.title}
                            {!notification.isRead && (
                              <span className="inline-block w-2 h-2 ml-2 rounded-full bg-emerald-500" />
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {notification.message}
                          </p>
                        </div>
                        {link && (
                          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                );

                if (link) {
                  return (
                    <Link key={notification.id} href={link}>
                      {content}
                    </Link>
                  );
                }

                return <div key={notification.id}>{content}</div>;
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
