import { requireSession } from "@/lib/auth/server";
import { getOrderById } from "@/lib/orders/actions";
import { getShortlist, getCategories } from "@/lib/shortlist/actions";
import { OutsourceForm } from "@/components/outsourcing/outsource-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, AlertTriangle, Briefcase } from "lucide-react";
import { createDb } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const runtime = "edge";

async function checkPaidSubscription(userId: string): Promise<boolean> {
  const { env } = await getCloudflareContext();
  const db = createDb(env.DB);
  
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (!subscription) return false;
  if (subscription.plan === "free") return false;
  
  const now = new Date();
  if (subscription.startsAt && new Date(subscription.startsAt) > now) {
    return false;
  }
  if (subscription.endsAt && new Date(subscription.endsAt) < now) {
    return false;
  }
  
  return true;
}

export default async function OutsourceOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: orderId } = await params;
  const session = await requireSession();
  
  // Check paid subscription
  const isPaid = await checkPaidSubscription(session.userId);
  
  if (!isPaid) {
    redirect("/dashboard/shortlist");
  }
  
  // Get the order
  const order = await getOrderById(orderId);
  
  if (!order) {
    notFound();
  }
  
  // Must be the seller to outsource
  if (order.sellerId !== session.userId) {
    return (
      <div className="container max-w-2xl py-8">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p>You can only outsource orders where you are the seller.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Check order status - can only outsource active orders
  const validStatuses = ["in_progress", "pending_requirements"];
  if (!validStatuses.includes(order.status)) {
    return (
      <div className="container max-w-2xl py-8">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p>This order cannot be outsourced in its current status ({order.status}).</p>
            </div>
            <Button variant="outline" className="mt-4" asChild>
              <Link href={`/dashboard/orders/${orderId}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Order
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Get shortlist and categories
  const [shortlist, categories] = await Promise.all([
    getShortlist(),
    getCategories(),
  ]);
  
  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-8">
        <Button variant="ghost" className="mb-4" asChild>
          <Link href={`/dashboard/orders/${orderId}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Order
          </Link>
        </Button>
        
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Briefcase className="h-8 w-8" />
          Outsource Order
        </h1>
        <p className="text-muted-foreground mt-2">
          Delegate this work to a trusted freelancer from your shortlist.
        </p>
      </div>
      
      {/* Order Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order {order.orderNumber}</CardTitle>
          <CardDescription>
            Original order value: R{(order.totalAmount / 100).toFixed(2)} | 
            Delivery: {order.deliveryDays} days
          </CardDescription>
        </CardHeader>
      </Card>
      
      <OutsourceForm
        orderId={order.id}
        orderNumber={order.orderNumber}
        orderAmount={order.totalAmount}
        deliveryDays={order.deliveryDays}
        deliveryDeadline={order.deliveryDeadline}
        categoryId={order.serviceId || order.projectId ? undefined : undefined}
        shortlist={shortlist}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
