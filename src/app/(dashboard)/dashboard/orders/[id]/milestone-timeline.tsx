"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Upload,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { fundMilestone, submitDelivery, acceptDelivery } from "@/lib/orders/actions";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  status: string;
  sortOrder: number | null;
  dueDate: string | null;
  fundedAt: string | null;
  deliveredAt: string | null;
  releasedAt: string | null;
}

interface MilestoneTimelineProps {
  milestones: Milestone[];
  userRole: "buyer" | "seller";
  orderId: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: "Pending", color: "text-gray-500", bgColor: "bg-gray-200" },
  funded: { label: "Funded", color: "text-blue-600", bgColor: "bg-blue-500" },
  in_progress: { label: "In Progress", color: "text-blue-600", bgColor: "bg-blue-500" },
  delivered: { label: "Delivered", color: "text-cyan-600", bgColor: "bg-cyan-500" },
  released: { label: "Released", color: "text-green-600", bgColor: "bg-green-500" },
  disputed: { label: "Disputed", color: "text-red-600", bgColor: "bg-red-500" },
  refunded: { label: "Refunded", color: "text-gray-600", bgColor: "bg-gray-500" },
};

export function MilestoneTimeline({ milestones, userRole, orderId }: MilestoneTimelineProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFundMilestone = async (milestoneId: string) => {
    setLoadingId(milestoneId);
    setError(null);
    
    const result = await fundMilestone(milestoneId, "ozow");
    
    if (!result.success) {
      setError(result.error || "Failed to fund milestone");
    }
    
    setLoadingId(null);
    router.refresh();
  };

  const handleSubmitDelivery = async (milestoneId: string) => {
    if (!deliveryMessage.trim()) {
      setError("Please add a delivery message");
      return;
    }
    
    setLoadingId(milestoneId);
    setError(null);
    
    const result = await submitDelivery(orderId, deliveryMessage, milestoneId);
    
    if (result.success) {
      setDeliveryMessage("");
      setDialogOpen(null);
    } else {
      setError(result.error || "Failed to submit delivery");
    }
    
    setLoadingId(null);
    router.refresh();
  };

  const handleAcceptDelivery = async (milestoneId: string) => {
    setLoadingId(milestoneId);
    setError(null);
    
    const result = await acceptDelivery(orderId, milestoneId);
    
    if (!result.success) {
      setError(result.error || "Failed to accept delivery");
    }
    
    setLoadingId(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/15 p-3 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      
      {milestones.map((milestone, index) => {
        const status = statusConfig[milestone.status] || statusConfig.pending;
        const isLoading = loadingId === milestone.id;
        const isLast = index === milestones.length - 1;
        const milestoneNumber = milestone.sortOrder ?? index + 1;

        return (
          <div key={milestone.id} className="relative">
            {/* Timeline connector */}
            {!isLast && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-muted" />
            )}

            <Card className={milestone.status === "released" ? "border-green-500/50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  {/* Status indicator */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    milestone.status === "released" 
                      ? "bg-green-500" 
                      : milestone.status === "pending"
                      ? "bg-gray-200 dark:bg-gray-700"
                      : status.bgColor
                  }`}>
                    {milestone.status === "released" ? (
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    ) : milestone.status === "pending" ? (
                      <span className="text-lg font-bold text-gray-500">{milestoneNumber}</span>
                    ) : (
                      <Clock className="h-6 w-6 text-white" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{milestone.title}</CardTitle>
                      <span className={`text-sm font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    {milestone.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {milestone.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-2">
                <div className="flex items-center justify-between mb-4 pl-16">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatCurrency(milestone.amount)}</span>
                    </div>
                    {milestone.dueDate && (
                      <span className="text-muted-foreground">
                        Due: {new Date(milestone.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pl-16 flex gap-2">
                  {/* Buyer: Fund milestone */}
                  {userRole === "buyer" && milestone.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => handleFundMilestone(milestone.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4 mr-1" />
                          Fund Milestone
                        </>
                      )}
                    </Button>
                  )}

                  {/* Seller: Submit delivery */}
                  {userRole === "seller" && (milestone.status === "funded" || milestone.status === "in_progress") && (
                    <Dialog open={dialogOpen === `delivery-${milestone.id}`} onOpenChange={(open) => setDialogOpen(open ? `delivery-${milestone.id}` : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Upload className="h-4 w-4 mr-1" />
                          Submit Delivery
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Submit Milestone Delivery</DialogTitle>
                          <DialogDescription>
                            Describe what you&apos;ve delivered. The buyer will review and approve.
                          </DialogDescription>
                        </DialogHeader>
                        <Textarea
                          value={deliveryMessage}
                          onChange={(e) => setDeliveryMessage(e.target.value)}
                          placeholder="Describe what you've delivered..."
                          rows={4}
                        />
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDialogOpen(null)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleSubmitDelivery(milestone.id)}
                            disabled={isLoading}
                          >
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Submit
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Buyer: Accept delivered milestone */}
                  {userRole === "buyer" && milestone.status === "delivered" && (
                    <Button
                      size="sm"
                      onClick={() => handleAcceptDelivery(milestone.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Accept & Release
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}

      {milestones.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No milestones for this order
        </div>
      )}
    </div>
  );
}
