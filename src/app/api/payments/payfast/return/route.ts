// PayFast Return (Success) Redirect Handler
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/lib/db";
import { getPaymentStatus } from "@/lib/payments";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get("m_payment_id");

    // Try to get order info from payment ID
    // Payment ID format: orderId|milestoneId (or just orderId)
    let orderId = "";
    let milestoneId: string | null = null;

    if (paymentId) {
      const parts = paymentId.split("|");
      orderId = parts[0] || "";
      milestoneId = parts[1] || null;
    }

    // If we have orderId, redirect to order page
    if (orderId) {
      const redirectUrl = new URL(
        `/dashboard/orders/${orderId}`,
        request.url
      );
      redirectUrl.searchParams.set("payment", "success");
      if (milestoneId) {
        redirectUrl.searchParams.set("milestone", milestoneId);
      }
      return NextResponse.redirect(redirectUrl);
    }

    // Fallback: try to find from database
    if (paymentId) {
      const { env } = await getCloudflareContext();
      const db = createDb(env.DB);

      const status = await getPaymentStatus(db, paymentId);
      if (status.found && status.orderId) {
        const redirectUrl = new URL(
          `/dashboard/orders/${status.orderId}`,
          request.url
        );
        redirectUrl.searchParams.set("payment", "success");
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Fallback redirect
    const fallbackUrl = new URL("/dashboard/orders", request.url);
    fallbackUrl.searchParams.set("payment", "success");
    return NextResponse.redirect(fallbackUrl);
  } catch (error) {
    console.error("PayFast return redirect error:", error);
    return NextResponse.redirect(new URL("/dashboard/orders", request.url));
  }
}
