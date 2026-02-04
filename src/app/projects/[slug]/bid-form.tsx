"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitBid } from "@/lib/projects/actions";

interface BidFormProps {
  projectId: string;
  budgetMin: number;
  budgetMax: number;
  onSuccess?: () => void;
}

export function BidForm({ projectId, budgetMin, budgetMax, onSuccess }: BidFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [amount, setAmount] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [proposal, setProposal] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const bidAmount = parseFloat(amount);
    const days = parseInt(deliveryDays);

    if (isNaN(bidAmount) || bidAmount <= 0) {
      setError("Please enter a valid bid amount");
      setIsLoading(false);
      return;
    }

    if (isNaN(days) || days <= 0) {
      setError("Please enter valid delivery days");
      setIsLoading(false);
      return;
    }

    if (!proposal.trim() || proposal.trim().length < 50) {
      setError("Proposal must be at least 50 characters");
      setIsLoading(false);
      return;
    }

    const result = await submitBid({
      projectId,
      amount: bidAmount,
      deliveryDays: days,
      proposal: proposal.trim(),
    });

    if (result.success) {
      setSuccess(true);
      onSuccess?.();
    } else {
      setError(result.error || "Failed to submit bid");
    }

    setIsLoading(false);
  };

  if (success) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-green-600 mb-2">✓</div>
          <h3 className="font-semibold mb-2">Bid Submitted!</h3>
          <p className="text-sm text-muted-foreground">
            You&apos;ll be notified if the client accepts your bid.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Submit a Bid</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/15 p-3 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Your Bid (ZAR) *</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`${budgetMin} - ${budgetMax}`}
                min="1"
                step="1"
              />
              <p className="text-xs text-muted-foreground">
                Client budget: R{budgetMin.toLocaleString()} - R{budgetMax.toLocaleString()}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="days">Delivery Time (days) *</Label>
              <Input
                id="days"
                type="number"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                placeholder="e.g. 14"
                min="1"
                max="365"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposal">Your Proposal *</Label>
            <Textarea
              id="proposal"
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              placeholder="Explain why you're the best fit for this project. Include relevant experience, your approach, and any questions you have..."
              rows={5}
              maxLength={3000}
            />
            <p className="text-xs text-muted-foreground">
              {proposal.length}/3000 characters (minimum 50)
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Bid
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            An 8% service fee will be deducted from your earnings if awarded
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
