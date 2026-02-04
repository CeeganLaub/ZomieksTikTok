import Link from "next/link";
import { MessageSquare, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getUserConversations } from "@/lib/messages/actions";

export default async function MessagesPage() {
  const conversations = await getUserConversations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Your conversations with buyers and sellers
        </p>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No messages yet</h3>
            <p className="text-muted-foreground text-center">
              Start a conversation by contacting a seller or buyer
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/dashboard/messages/${conv.id}`}
              className="block"
            >
              <Card className={`hover:border-primary/50 transition-colors ${conv.unreadCount > 0 ? "border-primary" : ""}`}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold truncate">
                          {conv.otherUser?.name || conv.otherUser?.email || "Unknown User"}
                        </h3>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {conv.lastMessageAt
                            ? formatRelativeTime(conv.lastMessageAt)
                            : formatRelativeTime(conv.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage?.content || "No messages yet"}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge className="ml-2 shrink-0">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
