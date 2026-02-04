// OZOW Payment Initiation API
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";
import { initiatePayment } from "@/lib/payments";

interface InitiateBody {
  orderId: string;
  milestoneId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as InitiateBody;
    const { orderId, milestoneId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext();
    const db = createDb(env.DB);

    const baseUrl = new URL(request.url).origin;

    const result = await initiatePayment(
      db,
      {
        orderId,
        milestoneId,
        provider: "ozow",
        buyerEmail: session.email,
        buyerName: session.name || undefined,
      },
      baseUrl
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      redirectUrl: result.redirectUrl,
    });
  } catch (error) {
    console.error("OZOW initiate error:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
