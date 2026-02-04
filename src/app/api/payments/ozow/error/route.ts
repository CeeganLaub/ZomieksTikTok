// OZOW Error Redirect Handler
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const optional = searchParams.get("Optional");
  const errorMessage = searchParams.get("ErrorMessage");

  let orderId = "";

  if (optional) {
    try {
      const data = JSON.parse(optional);
      orderId = data.orderId || "";
    } catch {
      // Ignore parse errors
    }
  }

  if (orderId) {
    const redirectUrl = new URL(
      `/dashboard/orders/${orderId}`,
      request.url
    );
    redirectUrl.searchParams.set("payment", "error");
    if (errorMessage) {
      redirectUrl.searchParams.set("message", errorMessage);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // Fallback redirect
  const fallbackUrl = new URL("/dashboard/orders", request.url);
  fallbackUrl.searchParams.set("payment", "error");
  return NextResponse.redirect(fallbackUrl);
}
