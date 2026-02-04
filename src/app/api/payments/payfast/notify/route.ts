// PayFast ITN (Instant Transaction Notification) Handler
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/lib/db";
import {
  verifyPayFastITN,
  parsePayFastITN,
  handlePaymentSuccess,
  handlePaymentFailure,
} from "@/lib/payments";

export async function POST(request: NextRequest) {
  try {
    // Get client IP for verification
    const clientIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "";

    const formData = await request.formData();
    const params: Record<string, string> = {};

    for (const [key, value] of formData.entries()) {
      params[key] = String(value);
    }

    // Verify ITN
    const verification = await verifyPayFastITN(params, clientIp);
    if (!verification.valid) {
      console.error("Invalid PayFast ITN", { clientIp, error: verification.error });
      return new NextResponse("Invalid ITN", { status: 400 });
    }

    const notification = parsePayFastITN(params);

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
        provider: "payfast",
      });
    } else if (
      notification.status === "cancelled" ||
      notification.status === "failed"
    ) {
      await handlePaymentFailure(
        db,
        notification.reference,
        `Payment ${notification.status}`
      );
    }

    // PayFast expects 200 OK response
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("PayFast ITN error:", error);
    // Return 200 to prevent retries for errors we can't fix
    return new NextResponse("OK", { status: 200 });
  }
}
