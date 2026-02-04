"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  ChevronDown,
  ChevronUp,
  Send,
  Package,
} from "lucide-react";
import { 
  cancelOutsourceRequest, 
  markOutsourceDelivered,
  completeOutsource,
} from "@/lib/outsourcing/actions";
import type { OutsourceRequestWithDetails } from "@/lib/outsourcing/actions";

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  open: { label: "Open", icon: Clock, color: "bg-blue-500" },
  assigned: { label: "Assigned", icon: User, color: "bg-purple-500" },
  in_progress: { label: "In Progress", icon: Clock, color: "bg-yellow-500" },
  delivered: { label: "Delivered", icon: Package, color: "bg-cyan-500" },
  completed: { label: "Completed", icon: CheckCircle, color: "bg-green-500" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "bg-red-500" },
};

interface OutsourceRequestCardProps {
  request: OutsourceRequestWithDetails;
  isOwner?: boolean;
  isWorker?: boolean;
}

export function OutsourceRequestCard({ 
  request, 
  isOwner = false, 
  isWorker = false 
}: OutsourceRequestCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const status = statusConfig[request.status] || statusConfig.open;
  const StatusIcon = status.icon;

  const formatDate = (date: string | null) => {
    if (!date) return "Not set";
    return new Date(date).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this outsource request?")) return;
    
    setLoading(true);
    const result = await cancelOutsourceRequest(request.id);
    setLoading(false);
    
    if (result.success) {
      router.refresh();
    }
  };

  const handleDeliver = async () => {
    if (!confirm("Mark this work as delivered?")) return;
    
    setLoading(true);
    const result = await markOutsourceDelivered(request.id);
    setLoading(false);
    
    if (result.success) {
      router.refresh();
    }
  };

  const handleComplete = async () => {
    if (!confirm("Complete this outsource and release payment?")) return;
    
    setLoading(true);
    const result = await completeOutsource(request.id);
    setLoading(false);
    
    if (result.success) {
      router.refresh();
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{request.title}</h3>
                <Badge className={`${status.color} text-white`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {status.label}
                </Badge>
              </div>
              {request.category && (
                <Badge variant="outline" className="text-xs">
                  {request.category.name}
                </Badge>
              )}
            </div>

            <div className="text-right">
              <p className="text-lg font-bold">
                R{(request.amount / 100).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {request.deliveryDays} days
              </p>
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Due: {formatDate(request.deadline)}</span>
            </div>
            {request.originalOrder && (
              <div className="flex items-center gap-1">
                <span>Order: {request.originalOrder.orderNumber}</span>
              </div>
            )}
            {request.assignedTo && (
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{request.assignedTo.name || request.assignedTo.email}</span>
              </div>
            )}
          </div>

          {/* Expandable Content */}
          {expanded && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {request.description}
                </p>
              </div>

              {request.requirements && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Requirements</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {request.requirements}
                  </p>
                </div>
              )}

              {isOwner && request.invitations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Invitations Sent</h4>
                  <div className="space-y-2">
                    {request.invitations.map((inv) => (
                      <div 
                        key={inv.id} 
                        className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                      >
                        <span>{inv.userName || "Unknown User"}</span>
                        <Badge variant="outline">{inv.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" /> Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" /> More
                </>
              )}
            </Button>

            <div className="flex gap-2">
              {isOwner && request.status === "open" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => router.push(`/dashboard/outsourcing/${request.id}/invite`)}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Invite More
                  </Button>
                </>
              )}

              {isOwner && request.status === "delivered" && (
                <Button
                  size="sm"
                  onClick={handleComplete}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Complete & Pay
                </Button>
              )}

              {isWorker && (request.status === "assigned" || request.status === "in_progress") && (
                <Button
                  size="sm"
                  onClick={handleDeliver}
                  disabled={loading}
                >
                  <Package className="w-4 h-4 mr-1" />
                  Mark Delivered
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
