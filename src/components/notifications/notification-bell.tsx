"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationResponse {
  notifications?: Notification[];
  count?: number;
  error?: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?unread=false");
      const data = (await response.json()) as NotificationResponse;
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n) => !n.isRead).length);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?count=true");
      const data = (await response.json()) as NotificationResponse;
      if (typeof data.count === "number") {
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", notificationId }),
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEntityLink = (notification: Notification): string | undefined => {
    if (!notification.entityType || !notification.entityId) return undefined;

    const links: Record<string, string> = {
      order: `/dashboard/orders/${notification.entityId}`,
      project: `/dashboard/projects/${notification.entityId}`,
      conversation: `/dashboard/messages/${notification.entityId}`,
      service: `/dashboard/services/${notification.entityId}`,
    };

    return links[notification.entityType];
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={isLoading}
              className="h-auto py-1 px-2 text-xs"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </>
              )}
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const link = getEntityLink(notification);

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 cursor-pointer",
                    !notification.isRead && "bg-muted/50"
                  )}
                  onClick={() => {
                    if (!notification.isRead) {
                      markAsRead(notification.id);
                    }
                    if (link) {
                      window.location.href = link;
                    }
                  }}
                >
                  <div className="flex items-start justify-between w-full gap-2">
                    <span className="font-medium text-sm">
                      {notification.title}
                    </span>
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <span className="text-xs text-muted-foreground mt-1">
                    {formatTime(notification.createdAt)}
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-center justify-center text-sm text-muted-foreground"
              onClick={() => (window.location.href = "/dashboard/notifications")}
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
