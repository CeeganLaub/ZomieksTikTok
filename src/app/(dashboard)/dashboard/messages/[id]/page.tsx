import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/server";
import { getConversationById, getConversationMessages } from "@/lib/messages/actions";
import { ChatInterface } from "./chat-interface";

interface ConversationPageProps {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  await requireSession();
  const { id } = await params;

  const conversation = await getConversationById(id);

  if (!conversation) {
    notFound();
  }

  const messages = await getConversationMessages(id);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/messages">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold">
              {conversation.otherUser?.name || conversation.otherUser?.email || "User"}
            </h2>
            {conversation.orderId && (
              <p className="text-xs text-muted-foreground">
                Order conversation
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <ChatInterface conversationId={id} initialMessages={messages} />
    </div>
  );
}
