// PayFast Cancel Redirect Handler
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const paymentId = searchParams.get("m_payment_id");

  // Try to extract order ID from payment ID
  let orderId = "";
  if (paymentId) {
    const parts = paymentId.split("|");
    orderId = parts[0] || "";
  }

  if (orderId) {
    const redirectUrl = new URL(
      `/dashboard/orders/${orderId}`,
      request.url
    );
    redirectUrl.searchParams.set("payment", "cancelled");
    return NextResponse.redirect(redirectUrl);
  }

  // Fallback redirect
  const fallbackUrl = new URL("/dashboard/orders", request.url);
  fallbackUrl.searchParams.set("payment", "cancelled");
  return NextResponse.redirect(fallbackUrl);
}
