// OZOW Success Redirect Handler
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/lib/db";
import { getPaymentStatus } from "@/lib/payments";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const transactionReference = searchParams.get("TransactionReference");
    const optional = searchParams.get("Optional");

    // Parse order/milestone from optional field
    let orderId = "";
    let milestoneId: string | null = null;

    if (optional) {
      try {
        const data = JSON.parse(optional);
        orderId = data.orderId || "";
        milestoneId = data.milestoneId || null;
      } catch {
        // Try to get from transaction reference
      }
    }

    // If we have orderId, redirect to order page with success message
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

    // Fallback: try to find order from transaction
    if (transactionReference) {
      const { env } = await getCloudflareContext();
      const db = createDb(env.DB);

      const status = await getPaymentStatus(db, transactionReference);
      if (status.found && status.orderId) {
        const redirectUrl = new URL(
          `/dashboard/orders/${status.orderId}`,
          request.url
        );
        redirectUrl.searchParams.set("payment", "success");
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Fallback redirect to orders list
    const fallbackUrl = new URL("/dashboard/orders", request.url);
    fallbackUrl.searchParams.set("payment", "success");
    return NextResponse.redirect(fallbackUrl);
  } catch (error) {
    console.error("OZOW success redirect error:", error);
    return NextResponse.redirect(new URL("/dashboard/orders", request.url));
  }
}
