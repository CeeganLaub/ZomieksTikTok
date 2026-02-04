"use client";

import { useState } from "react";
import { CreditCard, Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface PaymentSelectorProps {
  orderId: string;
  milestoneId?: string;
  amount: number;
  description: string;
}

type PaymentProvider = "ozow" | "payfast";

interface PaymentResponse {
  success?: boolean;
  error?: string;
  redirectUrl?: string;
}

export function PaymentSelector({
  orderId,
  milestoneId,
  amount,
  description,
}: PaymentSelectorProps) {
  const [provider, setProvider] = useState<PaymentProvider>("ozow");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payments/${provider}/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          milestoneId,
        }),
      });

      const data = (await response.json()) as PaymentResponse;

      if (!response.ok) {
        throw new Error(data.error || "Payment initiation failed");
      }

      // Redirect to payment gateway
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setIsLoading(false);
    }
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(cents / 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay {formatAmount(amount)}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={provider}
          onValueChange={(value: string) => setProvider(value as PaymentProvider)}
          className="grid gap-4"
        >
          {/* OZOW - Instant EFT */}
          <Label
            htmlFor="ozow"
            className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
              provider === "ozow"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <RadioGroupItem value="ozow" id="ozow" />
            <Banknote className="h-6 w-6 text-emerald-500" />
            <div className="flex-1">
              <p className="font-medium">Instant EFT (OZOW)</p>
              <p className="text-sm text-muted-foreground">
                Pay directly from your bank account. Instant &amp; secure.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">Recommended</span>
          </Label>

          {/* PayFast - Card */}
          <Label
            htmlFor="payfast"
            className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
              provider === "payfast"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <RadioGroupItem value="payfast" id="payfast" />
            <CreditCard className="h-6 w-6 text-blue-500" />
            <div className="flex-1">
              <p className="font-medium">Card Payment (PayFast)</p>
              <p className="text-sm text-muted-foreground">
                Pay with Visa, Mastercard, or other cards.
              </p>
            </div>
          </Label>
        </RadioGroup>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        <Button
          onClick={handlePayment}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>Pay {formatAmount(amount)}</>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          All payments are secured with 256-bit encryption.
          <br />
          Your payment will be held in escrow until delivery is accepted.
        </p>
      </CardContent>
    </Card>
  );
}
