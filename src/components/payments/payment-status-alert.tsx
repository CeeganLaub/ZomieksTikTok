"use client";

import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PaymentStatusAlert() {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");
  const errorMessage = searchParams.get("message");

  if (!paymentStatus) {
    return null;
  }

  if (paymentStatus === "success") {
    return (
      <Alert className="border-green-500 bg-green-500/10">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertTitle className="text-green-600">Payment Successful!</AlertTitle>
        <AlertDescription>
          Your payment has been processed. The funds are now held securely in
          escrow.
        </AlertDescription>
      </Alert>
    );
  }

  if (paymentStatus === "cancelled") {
    return (
      <Alert className="border-yellow-500 bg-yellow-500/10">
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        <AlertTitle className="text-yellow-600">Payment Cancelled</AlertTitle>
        <AlertDescription>
          You cancelled the payment. You can try again when you&apos;re ready.
        </AlertDescription>
      </Alert>
    );
  }

  if (paymentStatus === "error") {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Payment Failed</AlertTitle>
        <AlertDescription>
          {errorMessage || "There was an error processing your payment. Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
