"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { acceptBid } from "@/lib/projects/actions";

interface Bid {
  id: string;
  bidderId: string;
  amount: number;
  proposal: string;
  deliveryDays: number;
  status: string;
  createdAt: string;
}

interface BidCardProps {
  bid: Bid;
  projectStatus: string;
}

export function BidCard({ bid, projectStatus }: BidCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!confirm("Are you sure you want to accept this bid? Other bids will be rejected.")) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await acceptBid(bid.id);

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Failed to accept bid");
      setIsLoading(false);
    }
  };

  const statusBadge = () => {
    switch (bid.status) {
      case "accepted":
        return (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Accepted</span>
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center gap-1 text-red-600">
            <XCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Rejected</span>
          </div>
        );
      default:
        return (
          <span className="text-sm text-muted-foreground">Pending</span>
        );
    }
  };

  return (
    <Card className={bid.status === "accepted" ? "border-green-500" : ""}>
      <CardContent className="py-4">
        {error && (
          <div className="rounded-lg bg-destructive/15 p-3 text-destructive text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm font-medium">
                {bid.bidderId.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium">Freelancer</p>
              <p className="text-sm text-muted-foreground">
                Bid submitted {new Date(bid.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          {statusBadge()}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Bid Amount</p>
            <p className="text-lg font-bold">{formatCurrency(bid.amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Delivery</p>
            <p className="text-lg font-bold">{bid.deliveryDays} days</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Proposal</p>
          <p className="text-sm whitespace-pre-wrap">{bid.proposal}</p>
        </div>

        {bid.status === "pending" && projectStatus === "open" && (
          <div className="flex gap-2">
            <Button onClick={handleAccept} disabled={isLoading} className="flex-1">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accept Bid
            </Button>
            <Button variant="outline" className="flex-1">
              Message
            </Button>
          </div>
        )}

        {bid.status === "accepted" && (
          <Button className="w-full" asChild>
            <a href={`/dashboard/orders`}>View Order</a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
