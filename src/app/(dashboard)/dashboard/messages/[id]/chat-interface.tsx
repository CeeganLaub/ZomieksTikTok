"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/lib/messages/actions";

interface Message {
  id: string;
  content: string;
  senderId: string;
  isOwn: boolean;
  createdAt: string;
}

interface ChatInterfaceProps {
  conversationId: string;
  initialMessages: Message[];
}

export function ChatInterface({ conversationId, initialMessages }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    setError(null);

    const result = await sendMessage({
      conversationId,
      content: newMessage.trim(),
    });

    if (result.success) {
      // Optimistically add the message
      setMessages((prev) => [
        ...prev,
        {
          id: result.messageId || Date.now().toString(),
          content: newMessage.trim(),
          senderId: "self",
          isOwn: true,
          createdAt: new Date().toISOString(),
        },
      ]);
      setNewMessage("");
    } else {
      setError(result.error || "Failed to send message");
    }

    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.isOwn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    message.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pb-2">
          <div className="rounded-lg bg-destructive/15 p-2 text-destructive text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4">
        <form onSubmit={handleSend} className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isSending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
