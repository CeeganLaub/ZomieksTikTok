// OZOW Webhook Notification Handler
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/lib/db";
import {
  verifyOzowWebhook,
  parseOzowWebhook,
  handlePaymentSuccess,
  handlePaymentFailure,
} from "@/lib/payments";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};

    for (const [key, value] of formData.entries()) {
      params[key] = String(value);
    }

    // Verify webhook signature
    const isValid = await verifyOzowWebhook(params);
    if (!isValid) {
      console.error("Invalid OZOW webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const notification = parseOzowWebhook(params);

    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    // Handle based on status
    if (notification.status === "success") {
      await handlePaymentSuccess(db, {
        reference: notification.reference,
        providerTransactionId: notification.transactionId,
        orderId: notification.orderId,
        milestoneId: notification.milestoneId,
        amount: notification.amount,
        provider: "ozow",
      });
    } else if (
      notification.status === "cancelled" ||
      notification.status === "failed"
    ) {
      await handlePaymentFailure(
        db,
        notification.reference,
        `Payment ${notification.status}: ${notification.message || "No details"}`
      );
    }

    // OZOW expects 200 OK response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OZOW webhook error:", error);
    // Return 200 to prevent retries for errors we can't fix
    return NextResponse.json({ success: false });
  }
}
