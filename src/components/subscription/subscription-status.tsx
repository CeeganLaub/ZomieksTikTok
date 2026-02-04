"use client";

import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Calendar, Check, CreditCard, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  cancelSubscription,
  reactivateSubscription,
  SubscriptionDetails,
  PLAN_FEATURES,
} from "@/lib/subscriptions/actions";
import { toast } from "sonner";

interface SubscriptionStatusProps {
  subscription: SubscriptionDetails;
}

const STATUS_CONFIG = {
  active: {
    label: "Active",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: Check,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: XCircle,
  },
  expired: {
    label: "Expired",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle,
  },
  past_due: {
    label: "Past Due",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: AlertTriangle,
  },
};

export function SubscriptionStatus({ subscription }: SubscriptionStatusProps) {
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const statusConfig = STATUS_CONFIG[subscription.status];
  const StatusIcon = statusConfig.icon;
  const features = PLAN_FEATURES[subscription.plan];
  const isCancelled = !!subscription.cancelledAt;

  async function handleCancel() {
    setCancelLoading(true);
    try {
      const result = await cancelSubscription();
      
      if (result.success) {
        toast.success("Subscription cancelled. You&apos;ll have access until the end of your billing period.");
        setShowCancelDialog(false);
      } else {
        toast.error(result.error || "Failed to cancel subscription");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleReactivate() {
    setReactivateLoading(true);
    try {
      const result = await reactivateSubscription();
      
      if (result.success) {
        toast.success("Subscription reactivated!");
      } else {
        toast.error(result.error || "Failed to reactivate subscription");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setReactivateLoading(false);
    }
  }

  if (subscription.plan === "free") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Free Plan</span>
            <Badge variant="secondary">Starter</Badge>
          </CardTitle>
          <CardDescription>
            Upgrade to Pro to unlock unlimited features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Monthly bids</span>
              <span>{subscription.bidsUsed} / {features.maxBids}</span>
            </div>
            <Progress value={(subscription.bidsUsed / (features.maxBids || 1)) * 100} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Service listings</span>
              <span>{subscription.servicesUsed} / {features.maxServices}</span>
            </div>
            <Progress value={(subscription.servicesUsed / (features.maxServices || 1)) * 100} />
          </div>

          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p>With the free plan, you can:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Submit up to 5 bids per month</li>
              <li>Create 1 service listing</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pro {subscription.plan === "annual" ? "Annual" : "Monthly"}</span>
          <Badge className={statusConfig.color}>
            <StatusIcon className="mr-1 h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </CardTitle>
        <CardDescription>
          {isCancelled
            ? "Your subscription will end at the current period"
            : "Full access to all Pro features"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Current Period</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(subscription.currentPeriodStart), "MMM d")} - {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {isCancelled ? "Access Ends" : "Next Billing"}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(subscription.currentPeriodEnd), "MMMM d, yyyy")}
                {!isCancelled && subscription.daysRemaining > 0 && (
                  <span> ({subscription.daysRemaining} days)</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {isCancelled && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Subscription cancellation scheduled
                </p>
                <p className="text-xs text-muted-foreground">
                  You&apos;ll continue to have access until {format(new Date(subscription.currentPeriodEnd), "MMMM d, yyyy")}.
                  After that, you&apos;ll be moved to the free plan.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReactivate}
                  disabled={reactivateLoading}
                >
                  {reactivateLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Reactivate Subscription
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium">Your Pro benefits:</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
            <li>Unlimited bids on projects</li>
            <li>Unlimited service listings</li>
            <li>Outsource projects to other freelancers</li>
            <li>Access to shortlist and talent pool</li>
            <li>Priority support</li>
          </ul>
        </div>

        {subscription.canCancel && (
          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-destructive hover:text-destructive">
                Cancel Subscription
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel Subscription?</DialogTitle>
                <DialogDescription>
                  Are you sure you want to cancel your Pro subscription? You&apos;ll still have access until {format(new Date(subscription.currentPeriodEnd), "MMMM d, yyyy")}.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium">What you&apos;ll lose:</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                  <li>Unlimited bids (back to 5/month)</li>
                  <li>Unlimited services (back to 1)</li>
                  <li>Outsourcing access</li>
                  <li>Shortlist access</li>
                </ul>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                  Keep Subscription
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Yes, Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
