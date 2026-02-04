"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CreditCard, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmSubscription, PLAN_PRICES } from "@/lib/subscriptions/actions";
import { toast } from "sonner";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const plan = searchParams.get("plan") as "monthly" | "annual" | null;
  const reference = searchParams.get("ref");
  const amount = searchParams.get("amount");

  if (!plan || !reference || !amount) {
    router.push("/dashboard/subscription");
    return null;
  }

  const price = PLAN_PRICES[plan] / 100;
  const planName = plan === "annual" ? "Pro Annual" : "Pro Monthly";

  async function handlePayment() {
    setLoading(true);
    try {
      // In production, this would be handled by PayFast webhook
      // For demo, we simulate successful payment
      const result = await confirmSubscription(plan!, reference!);

      if (result.success) {
        toast.success("Payment successful! Your subscription is now active.");
        router.push("/dashboard/subscription");
      } else {
        toast.error(result.error || "Payment failed");
      }
    } catch {
      toast.error("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Complete Your Purchase</h1>
          <p className="text-muted-foreground">
            Subscribe to {planName}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Order Summary</span>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-medium">{planName}</p>
                <p className="text-sm text-muted-foreground">
                  {plan === "annual" ? "Billed annually" : "Billed monthly"}
                </p>
              </div>
              <p className="text-xl font-bold">R{price}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Unlimited bids</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Unlimited service listings</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Outsourcing access</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Shortlist access</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </CardTitle>
            <CardDescription>
              Demo mode - no real payment will be processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="card">Card Number</Label>
              <Input id="card" placeholder="4111 1111 1111 1111" disabled />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry</Label>
                <Input id="expiry" placeholder="12/25" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input id="cvv" placeholder="123" disabled />
              </div>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-3 text-center text-sm text-amber-600 dark:text-amber-400">
              This is a demo. Click Pay Now to simulate a successful payment.
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              size="lg"
              onClick={handlePayment}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Pay R{price} Now</>
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/dashboard/subscription")}
              disabled={loading}
            >
              Cancel
            </Button>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Secured by PayFast</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
