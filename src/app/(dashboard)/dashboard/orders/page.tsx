import Link from "next/link";
import { Clock, CheckCircle2, AlertCircle, DollarSign, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/lib/auth/server";
import { getUserOrders } from "@/lib/orders/actions";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/lib/db/schema";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_payment: { label: "Awaiting Payment", color: "bg-yellow-500", icon: <Clock className="h-4 w-4" /> },
  pending_requirements: { label: "Awaiting Requirements", color: "bg-yellow-500", icon: <Clock className="h-4 w-4" /> },
  in_progress: { label: "In Progress", color: "bg-blue-500", icon: <Clock className="h-4 w-4" /> },
  delivered: { label: "Delivered", color: "bg-cyan-500", icon: <CheckCircle2 className="h-4 w-4" /> },
  revision_requested: { label: "Revision Requested", color: "bg-orange-500", icon: <AlertCircle className="h-4 w-4" /> },
  completed: { label: "Completed", color: "bg-green-500", icon: <CheckCircle2 className="h-4 w-4" /> },
  cancelled: { label: "Cancelled", color: "bg-gray-500", icon: <AlertCircle className="h-4 w-4" /> },
  disputed: { label: "Disputed", color: "bg-red-500", icon: <AlertCircle className="h-4 w-4" /> },
  refunded: { label: "Refunded", color: "bg-gray-500", icon: <AlertCircle className="h-4 w-4" /> },
};

function OrderCard({ order, role }: { order: Order; role: "buyer" | "seller" }) {
  const status = statusConfig[order.status] || statusConfig.pending_payment;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-muted-foreground">
                {order.orderNumber}
              </span>
              <Badge variant="outline" className="text-xs">
                {role === "buyer" ? "Buying" : "Selling"}
              </Badge>
            </div>
            <h3 className="font-semibold">
              {order.orderType === "service" ? "Service Order" : "Project Order"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {role === "buyer" ? "From seller" : "For buyer"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{formatCurrency(order.totalAmount)}</p>
            <div className={`flex items-center gap-1 text-sm ${status.color.replace("bg-", "text-")}`}>
              {status.icon}
              <span>{status.label}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <span>Created {new Date(order.createdAt).toLocaleDateString()}</span>
          {order.deliveryDeadline && (
            <span>Due {new Date(order.deliveryDeadline).toLocaleDateString()}</span>
          )}
        </div>

        <Button variant="outline" className="w-full" asChild>
          <Link href={`/dashboard/orders/${order.id}`}>
            View Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({ type }: { type: "buying" | "selling" }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <DollarSign className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-2">No orders yet</h3>
        <p className="text-muted-foreground text-center mb-4">
          {type === "buying"
            ? "Start by purchasing a service or hiring for a project"
            : "Orders will appear here when buyers purchase your services"}
        </p>
        <Button asChild>
          <Link href={type === "buying" ? "/" : "/dashboard/services"}>
            {type === "buying" ? "Browse Services" : "Manage Services"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default async function OrdersPage() {
  const session = await requireSession();
  const orders = await getUserOrders();

  const buyerOrders = orders.filter((o) => o.buyerId === session.userId);
  const sellerOrders = orders.filter((o) => o.sellerId === session.userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground">
          Manage your purchases and sales
        </p>
      </div>

      <Tabs defaultValue="buying">
        <TabsList>
          <TabsTrigger value="buying">
            Buying ({buyerOrders.length})
          </TabsTrigger>
          <TabsTrigger value="selling">
            Selling ({sellerOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buying" className="mt-6">
          {buyerOrders.length === 0 ? (
            <EmptyState type="buying" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {buyerOrders.map((order) => (
                <OrderCard key={order.id} order={order} role="buyer" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="selling" className="mt-6">
          {sellerOrders.length === 0 ? (
            <EmptyState type="selling" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sellerOrders.map((order) => (
                <OrderCard key={order.id} order={order} role="seller" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
