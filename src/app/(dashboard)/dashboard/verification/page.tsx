import { CheckCircle, Clock, XCircle, Shield, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getVerificationStatus } from "@/lib/verification/actions";
import { VerificationForm } from "./verification-form";

export default async function VerificationPage() {
  const verification = await getVerificationStatus();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ID Verification</h1>
        <p className="text-muted-foreground">
          Verify your identity to unlock all platform features
        </p>
      </div>

      {/* Benefits Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            Why Verify?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Post services and projects on the marketplace
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Submit bids on projects
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Receive payments securely
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Build trust with a verified badge on your profile
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Status Display */}
      {verification?.status === "approved" && (
        <Alert className="border-emerald-500 bg-emerald-500/10">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <AlertTitle className="text-emerald-600">Verified</AlertTitle>
          <AlertDescription>
            Your identity has been verified on{" "}
            {verification.reviewedAt
              ? new Date(verification.reviewedAt).toLocaleDateString()
              : "your account"}
            . You have full access to all platform features.
          </AlertDescription>
        </Alert>
      )}

      {verification?.status === "pending" && (
        <Alert className="border-yellow-500 bg-yellow-500/10">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-600">Verification Pending</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Your verification is being reviewed. This usually takes 1-2 business days.
            </p>
            <p className="text-xs text-muted-foreground">
              Submitted on {new Date(verification.createdAt).toLocaleDateString()}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {verification?.status === "rejected" && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Verification Rejected</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              {verification.rejectionReason ||
                "Your verification was rejected. Please submit again with valid documents."}
            </p>
            <Button size="sm" className="mt-2">
              Submit Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Show form if not verified or rejected */}
      {(!verification || verification.status === "rejected") && (
        <>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Before You Begin</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>Have your valid ID ready (ID card, passport, or driver&apos;s license)</li>
                <li>Ensure your documents are not expired</li>
                <li>Take clear, well-lit photos without glare</li>
                <li>For the selfie, hold your ID next to your face</li>
              </ul>
            </AlertDescription>
          </Alert>

          <VerificationForm />
        </>
      )}
    </div>
  );
}
