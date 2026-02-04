"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { acceptOutsourceInvitation, rejectOutsourceInvitation } from "@/lib/outsourcing/actions";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "default" },
  accepted: { label: "Accepted", variant: "secondary" },
  rejected: { label: "Rejected", variant: "destructive" },
  expired: { label: "Expired", variant: "outline" },
};

interface OutsourceInvitationCardProps {
  invitation: {
    id: string;
    status: string;
    message: string | null;
    createdAt: string;
    expiresAt: string;
    request: {
      id: string;
      title: string;
      description: string;
      amount: number;
      currency: string | null;
      deliveryDays: number;
      deadline: string | null;
      status: string;
      category: { id: string; name: string } | null;
    } | null;
  };
}

export function OutsourceInvitationCard({ invitation }: OutsourceInvitationCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!invitation.request) return null;

  const { request } = invitation;
  const status = statusConfig[invitation.status] || statusConfig.pending;

  const formatDate = (date: string | null) => {
    if (!date) return "Not set";
    return new Date(date).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h remaining`;
    
    const days = Math.floor(hours / 24);
    return `${days}d remaining`;
  };

  const isExpired = new Date(invitation.expiresAt) < new Date();
  const isPending = invitation.status === "pending" && !isExpired;

  const handleAccept = async () => {
    if (!confirm("Accept this outsource opportunity?")) return;
    
    setLoading(true);
    const result = await acceptOutsourceInvitation(invitation.id);
    setLoading(false);
    
    if (result.success) {
      router.refresh();
    }
  };

  const handleReject = async () => {
    if (!confirm("Reject this invitation?")) return;
    
    setLoading(true);
    const result = await rejectOutsourceInvitation(invitation.id);
    setLoading(false);
    
    if (result.success) {
      router.refresh();
    }
  };

  return (
    <Card className={isPending ? "border-emerald-500/50" : ""}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{request.title}</h3>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              {request.category && (
                <Badge variant="outline" className="text-xs">
                  {request.category.name}
                </Badge>
              )}
            </div>

            <div className="text-right">
              <p className="text-lg font-bold text-emerald-500">
                R{(request.amount / 100).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {request.deliveryDays} days delivery
              </p>
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Due: {formatDate(request.deadline)}</span>
            </div>
            {isPending && (
              <div className="flex items-center gap-1 text-amber-500">
                <AlertTriangle className="w-4 h-4" />
                <span>{formatTimeRemaining(invitation.expiresAt)}</span>
              </div>
            )}
          </div>

          {/* Personal Message */}
          {invitation.message && (
            <div className="p-3 rounded bg-muted/50 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Message from inviter:</p>
              <p>{invitation.message}</p>
            </div>
          )}

          {/* Expandable Content */}
          {expanded && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {request.description}
                </p>
              </div>
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
                  <ChevronDown className="w-4 h-4 mr-1" /> Details
                </>
              )}
            </Button>

            {isPending && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  disabled={loading}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={handleAccept}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Accept Work
                </Button>
              </div>
            )}

            {invitation.status === "accepted" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/outsourcing`)}
              >
                View in My Work
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
