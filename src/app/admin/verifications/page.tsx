"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Shield, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  FileText,
  User,
  Calendar,
} from "lucide-react";
import { 
  getPendingVerifications, 
  approveVerification, 
  rejectVerification 
} from "@/lib/admin/actions";
import type { VerificationRequest } from "@/lib/admin/actions";

export default function VerificationsPage() {
  const router = useRouter();
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [rejectDialog, setRejectDialog] = useState<VerificationRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    setLoading(true);
    const result = await getPendingVerifications();
    setVerifications(result);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Approve this verification? The user will receive a verified badge.")) return;
    
    setActionLoading(id);
    const result = await approveVerification(id);
    setActionLoading(null);
    
    if (result.success) {
      loadVerifications();
    }
  };

  const handleReject = async () => {
    if (!rejectDialog || !rejectReason) return;
    
    setActionLoading(rejectDialog.id);
    const result = await rejectVerification(rejectDialog.id, rejectReason);
    setActionLoading(null);
    
    if (result.success) {
      setRejectDialog(null);
      setRejectReason("");
      loadVerifications();
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading verifications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          ID Verifications
        </h1>
        <p className="text-muted-foreground">
          Review pending identity verification requests
        </p>
      </div>

      {verifications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-emerald-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground text-center">
              No pending verification requests at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {verifications.length} pending verification{verifications.length !== 1 && "s"}
          </p>

          {verifications.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-6">
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* User Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{v.userName || "No name"}</p>
                        <p className="text-sm text-muted-foreground">{v.userEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Submitted {formatDate(v.createdAt)}</span>
                    </div>

                    <Badge variant="outline">
                      <FileText className="w-3 h-3 mr-1" />
                      {v.documentType}
                    </Badge>
                  </div>

                  {/* Documents */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* ID Document */}
                      <div className="border rounded-lg p-4">
                        <p className="text-sm font-medium mb-2">ID Document</p>
                        {v.documentUrl ? (
                          <a
                            href={v.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <div className="aspect-video bg-muted rounded flex items-center justify-center hover:bg-muted/80 transition-colors">
                              <ExternalLink className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-center mt-2 text-emerald-500">
                              View Document
                            </p>
                          </a>
                        ) : (
                          <div className="aspect-video bg-muted rounded flex items-center justify-center">
                            <p className="text-xs text-muted-foreground">No document</p>
                          </div>
                        )}
                      </div>

                      {/* Selfie */}
                      <div className="border rounded-lg p-4">
                        <p className="text-sm font-medium mb-2">Selfie with ID</p>
                        {v.selfieUrl ? (
                          <a
                            href={v.selfieUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <div className="aspect-video bg-muted rounded flex items-center justify-center hover:bg-muted/80 transition-colors">
                              <ExternalLink className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-center mt-2 text-emerald-500">
                              View Selfie
                            </p>
                          </a>
                        ) : (
                          <div className="aspect-video bg-muted rounded flex items-center justify-center">
                            <p className="text-xs text-muted-foreground">No selfie</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                      <Button
                        variant="outline"
                        className="text-destructive"
                        onClick={() => setRejectDialog(v)}
                        disabled={actionLoading === v.id}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => handleApprove(v.id)}
                        disabled={actionLoading === v.id}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {actionLoading === v.id ? "Approving..." : "Approve"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this verification. 
              The user will be notified and can resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection (e.g., document unclear, face not visible, expired ID)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading === rejectDialog?.id || !rejectReason.trim()}
            >
              {actionLoading === rejectDialog?.id ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
