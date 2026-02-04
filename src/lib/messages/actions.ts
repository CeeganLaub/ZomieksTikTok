// Server actions for messaging
"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc, or } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { conversations, messages, users } from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { notifyNewMessage } from "@/lib/notifications";

function generateId(): string {
  return crypto.randomUUID();
}

export interface SendMessageData {
  conversationId?: string;
  recipientId?: string;
  content: string;
  orderId?: string;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  conversationId?: string;
  messageId?: string;
}

/**
 * Get or create a conversation between two users
 */
export async function getOrCreateConversation(
  otherUserId: string,
  orderId?: string
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  if (otherUserId === session.userId) {
    return { success: false, error: "Cannot create conversation with yourself" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Check if conversation already exists
    const existing = await db.query.conversations.findFirst({
      where: or(
        and(
          eq(conversations.participant1Id, session.userId),
          eq(conversations.participant2Id, otherUserId)
        ),
        and(
          eq(conversations.participant1Id, otherUserId),
          eq(conversations.participant2Id, session.userId)
        )
      ),
    });

    if (existing) {
      return { success: true, conversationId: existing.id };
    }

    // Create new conversation
    const conversationId = generateId();
    const now = new Date().toISOString();

    await db.insert(conversations).values({
      id: conversationId,
      participant1Id: session.userId,
      participant2Id: otherUserId,
      orderId: orderId || null,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, conversationId };
  } catch (error) {
    console.error("Get/create conversation error:", error);
    return { success: false, error: "Failed to create conversation" };
  }
}

/**
 * Send a message
 */
export async function sendMessage(data: SendMessageData): Promise<ActionResult> {
  const session = await getServerSession();

  if (!session) {
    return { success: false, error: "You must be logged in" };
  }

  if (!data.content.trim()) {
    return { success: false, error: "Message cannot be empty" };
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    let conversationId = data.conversationId;

    // If no conversation ID, create one with the recipient
    if (!conversationId && data.recipientId) {
      const result = await getOrCreateConversation(data.recipientId, data.orderId);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      conversationId = result.conversationId;
    }

    if (!conversationId) {
      return { success: false, error: "Conversation or recipient required" };
    }

    // Verify user is part of conversation
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    if (
      conversation.participant1Id !== session.userId &&
      conversation.participant2Id !== session.userId
    ) {
      return { success: false, error: "Not authorized to send messages in this conversation" };
    }

    const messageId = generateId();
    const now = new Date().toISOString();

    await db.insert(messages).values({
      id: messageId,
      conversationId,
      senderId: session.userId,
      content: data.content.trim(),
      messageType: "text",
      createdAt: now,
    });

    // Update conversation's last message time
    await db
      .update(conversations)
      .set({ 
        lastMessageAt: now,
        updatedAt: now,
      })
      .where(eq(conversations.id, conversationId));

    // Send notification to recipient
    const recipientId = 
      conversation.participant1Id === session.userId 
        ? conversation.participant2Id 
        : conversation.participant1Id;
    
    const [sender, recipient] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, session.userId) }),
      db.query.users.findFirst({ where: eq(users.id, recipientId) }),
    ]);

    if (sender && recipient) {
      // Truncate message preview for notification
      const preview = data.content.length > 100 
        ? data.content.substring(0, 100) + "..." 
        : data.content;
      
      await notifyNewMessage(db, recipient.id, {
        senderName: sender.name || sender.email,
        messagePreview: preview,
        conversationId,
      });
    }

    revalidatePath("/dashboard/messages");
    revalidatePath(`/dashboard/messages/${conversationId}`);

    return { success: true, conversationId, messageId };
  } catch (error) {
    console.error("Send message error:", error);
    return { success: false, error: "Failed to send message" };
  }
}

/**
 * Get user's conversations
 */
export async function getUserConversations() {
  const session = await getServerSession();

  if (!session) {
    return [];
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const userConversations = await db.query.conversations.findMany({
      where: or(
        eq(conversations.participant1Id, session.userId),
        eq(conversations.participant2Id, session.userId)
      ),
      orderBy: [desc(conversations.lastMessageAt), desc(conversations.createdAt)],
    });

    // Get other participant details for each conversation
    const conversationsWithDetails = await Promise.all(
      userConversations.map(async (conv) => {
        const otherUserId =
          conv.participant1Id === session.userId
            ? conv.participant2Id
            : conv.participant1Id;

        const otherUser = await db.query.users.findFirst({
          where: eq(users.id, otherUserId),
        });

        // Get last message
        const lastMessage = await db.query.messages.findFirst({
          where: eq(messages.conversationId, conv.id),
          orderBy: [desc(messages.createdAt)],
        });

        // Count unread messages
        const allMessages = await db.query.messages.findMany({
          where: and(
            eq(messages.conversationId, conv.id),
            eq(messages.isRead, false)
          ),
        });
        const unreadCount = allMessages.filter((m) => m.senderId !== session.userId).length;

        return {
          ...conv,
          otherUser: otherUser
            ? { id: otherUser.id, email: otherUser.email, name: otherUser.name }
            : null,
          lastMessage,
          unreadCount,
        };
      })
    );

    return conversationsWithDetails;
  } catch (error) {
    console.error("Get conversations error:", error);
    return [];
  }
}

/**
 * Get messages in a conversation
 */
export async function getConversationMessages(conversationId: string) {
  const session = await getServerSession();

  if (!session) {
    return [];
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Verify user is part of conversation
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      return [];
    }

    if (
      conversation.participant1Id !== session.userId &&
      conversation.participant2Id !== session.userId
    ) {
      return [];
    }

    const conversationMessages = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: [messages.createdAt],
    });

    // Mark messages as read
    const now = new Date().toISOString();
    await db
      .update(messages)
      .set({ isRead: true, readAt: now })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isRead, false)
        )
      );

    return conversationMessages.map((msg) => ({
      ...msg,
      isOwn: msg.senderId === session.userId,
    }));
  } catch (error) {
    console.error("Get messages error:", error);
    return [];
  }
}

/**
 * Get conversation by ID
 */
export async function getConversationById(conversationId: string) {
  const session = await getServerSession();

  if (!session) {
    return null;
  }

  try {
    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      return null;
    }

    if (
      conversation.participant1Id !== session.userId &&
      conversation.participant2Id !== session.userId
    ) {
      return null;
    }

    const otherUserId =
      conversation.participant1Id === session.userId
        ? conversation.participant2Id
        : conversation.participant1Id;

    const otherUser = await db.query.users.findFirst({
      where: eq(users.id, otherUserId),
    });

    return {
      ...conversation,
      otherUser: otherUser
        ? { id: otherUser.id, email: otherUser.email, name: otherUser.name }
        : null,
    };
  } catch (error) {
    console.error("Get conversation error:", error);
    return null;
  }
}
