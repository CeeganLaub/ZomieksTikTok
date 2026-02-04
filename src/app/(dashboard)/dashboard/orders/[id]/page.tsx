import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, User, Calendar, AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireSession } from "@/lib/auth/server";
import { getOrderById } from "@/lib/orders/actions";
import { formatCurrency } from "@/lib/utils";
import { MilestoneTimeline } from "./milestone-timeline";
import { PaymentSelector, PaymentStatusAlert } from "@/components/payments";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "Awaiting Payment", color: "bg-yellow-500" },
  pending_requirements: { label: "Awaiting Requirements", color: "bg-yellow-500" },
  in_progress: { label: "In Progress", color: "bg-blue-500" },
  delivered: { label: "Delivered", color: "bg-cyan-500" },
  revision_requested: { label: "Revision Requested", color: "bg-orange-500" },
  completed: { label: "Completed", color: "bg-green-500" },
  cancelled: { label: "Cancelled", color: "bg-gray-500" },
  disputed: { label: "Disputed", color: "bg-red-500" },
  refunded: { label: "Refunded", color: "bg-gray-500" },
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const session = await requireSession();
  const { id } = await params;

  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  const isBuyer = order.buyerId === session.userId;
  const userRole = isBuyer ? "buyer" : "seller";
  const status = statusConfig[order.status] || statusConfig.pending_payment;

  const fundedAmount = order.milestones
    .filter((m) => m.status !== "pending")
    .reduce((sum, m) => sum + m.amount, 0);

  const completedAmount = order.milestones
    .filter((m) => m.status === "released")
    .reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
              <Badge variant={isBuyer ? "default" : "secondary"}>
                {isBuyer ? "Buying" : "Selling"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status.color}`} />
              <span className="text-muted-foreground">{status.label}</span>
            </div>
          </div>

          <Button asChild>
            <Link href={`/dashboard/messages`}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Message {isBuyer ? "Seller" : "Buyer"}
            </Link>
          </Button>
        </div>
      </div>

      {/* Payment Status Alert */}
      <Suspense fallback={null}>
        <PaymentStatusAlert />
      </Suspense>

      {/* Status Bar */}
      {order.status === "pending_payment" && isBuyer && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment Required</AlertTitle>
          <AlertDescription>
            Fund the first milestone to begin work on this order.
          </AlertDescription>
        </Alert>
      )}

      {order.status === "pending_payment" && !isBuyer && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Awaiting Buyer Payment</AlertTitle>
          <AlertDescription>
            The buyer needs to fund the first milestone before work can begin.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Milestones */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              <MilestoneTimeline
                milestones={order.milestones}
                userRole={userRole}
                orderId={order.id}
              />
            </CardContent>
          </Card>

          {/* Requirements */}
          {order.requirements && (
            <Card>
              <CardHeader>
                <CardTitle>Project Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{order.requirements}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Selector - Show when payment needed */}
          {order.status === "pending_payment" && isBuyer && (
            <PaymentSelector
              orderId={order.id}
              milestoneId={order.milestones[0]?.id}
              amount={order.milestones[0]?.amount || order.totalAmount}
              description={
                order.milestones[0]
                  ? `Milestone 1: ${order.milestones[0].title}`
                  : `Order ${order.orderNumber}`
              }
            />
          )}

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Buyer Fee (3%)</span>
                  <span>{formatCurrency(order.buyerFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Funded</span>
                  <span>{formatCurrency(fundedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Released</span>
                  <span className="text-green-600">{formatCurrency(completedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">In Escrow</span>
                  <span>{formatCurrency(fundedAmount - completedAmount)}</span>
                </div>
              </div>

              {!isBuyer && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform Fee (8%)</span>
                    <span>-{formatCurrency(order.sellerFee)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-green-600">
                    <span>You Receive</span>
                    <span>{formatCurrency(order.sellerEarnings)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timeline Card */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              {order.deliveryDeadline && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Due:</span>
                  <span>{new Date(order.deliveryDeadline).toLocaleDateString()}</span>
                </div>
              )}
              {order.completedAt && (
                <div className="flex items-center gap-2 text-green-600">
                  <Clock className="h-4 w-4" />
                  <span>Completed:</span>
                  <span>{new Date(order.completedAt).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parties */}
          <Card>
            <CardHeader>
              <CardTitle>{isBuyer ? "Seller" : "Buyer"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">User</p>
                  <p className="text-sm text-muted-foreground">Verified Member</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dispute Option */}
          {order.status === "in_progress" && (
            <Card>
              <CardContent className="py-4">
                <Button variant="outline" className="w-full text-destructive hover:text-destructive" asChild>
                  <Link href={`/dashboard/disputes/new?order=${order.id}`}>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Open Dispute
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Having issues? We&apos;ll help mediate.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
