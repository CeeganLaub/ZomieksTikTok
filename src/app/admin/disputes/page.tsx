"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  CheckCircle,
  User,
  DollarSign,
  Calendar,
  ExternalLink,
  Scale,
} from "lucide-react";
import { getDisputes, resolveDispute } from "@/lib/admin/actions";
import type { DisputeDetails } from "@/lib/admin/actions";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "destructive",
  under_review: "default",
  resolved: "secondary",
  escalated: "destructive",
  closed: "outline",
};

const categoryLabels: Record<string, string> = {
  not_as_described: "Not As Described",
  late_delivery: "Late Delivery",
  no_delivery: "No Delivery",
  poor_quality: "Poor Quality",
  communication_issues: "Communication Issues",
  other: "Other",
};

export default function DisputesPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<DisputeDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("open");
  
  const [resolveDialog, setResolveDialog] = useState<DisputeDetails | null>(null);
  const [resolution, setResolution] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [partialAmount, setPartialAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadDisputes();
  }, [activeTab]);

  const loadDisputes = async () => {
    setLoading(true);
    const status = activeTab === "all" ? undefined : activeTab as never;
    const result = await getDisputes(status);
    setDisputes(result);
    setLoading(false);
  };

  const handleResolve = async () => {
    if (!resolveDialog || !resolution || !notes) return;
    
    setActionLoading(true);
    const result = await resolveDispute(
      resolveDialog.id,
      resolution as never,
      notes,
      resolution === "refund_partial" ? parseInt(partialAmount) * 100 : undefined
    );
    setActionLoading(false);
    
    if (result.success) {
      setResolveDialog(null);
      setResolution("");
      setNotes("");
      setPartialAmount("");
      loadDisputes();
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(cents / 100);
  };

  const openCount = disputes.filter(d => d.status === "open").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-8 w-8" />
          Disputes
        </h1>
        <p className="text-muted-foreground">
          Manage and resolve order disputes
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="open" className="gap-2">
            Open
            {openCount > 0 && (
              <Badge variant="destructive" className="ml-1">{openCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="under_review">Under Review</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading disputes...</p>
              </CardContent>
            </Card>
          ) : disputes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-emerald-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No disputes</h3>
                <p className="text-muted-foreground text-center">
                  {activeTab === "open" 
                    ? "There are no open disputes to handle."
                    : "No disputes match this filter."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {disputes.map((dispute) => (
                <Card key={dispute.id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{dispute.title}</h3>
                            <Badge variant={statusColors[dispute.status]}>
                              {dispute.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels[dispute.category] || dispute.category}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Order: {dispute.orderNumber}
                          </p>
                          <p className="font-semibold">
                            {formatCurrency(dispute.orderAmount)}
                          </p>
                        </div>
                      </div>

                      {/* Parties */}
                      <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Raised By</p>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span className="font-medium">
                              {dispute.raisedBy.name || dispute.raisedBy.email}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Against</p>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span className="font-medium">
                              {dispute.against.name || dispute.against.email}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <p className="text-sm font-medium mb-1">Description</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {dispute.description}
                        </p>
                      </div>

                      {/* Evidence */}
                      {dispute.evidence && dispute.evidence.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Evidence ({dispute.evidence.length})</p>
                          <div className="flex gap-2">
                            {dispute.evidence.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-emerald-500 hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                File {i + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Opened {formatDate(dispute.createdAt)}</span>
                        </div>

                        {(dispute.status === "open" || dispute.status === "under_review") && (
                          <Button
                            onClick={() => setResolveDialog(dispute)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Scale className="w-4 h-4 mr-2" />
                            Resolve Dispute
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Order: {resolveDialog?.orderNumber} • 
              Amount: {resolveDialog && formatCurrency(resolveDialog.orderAmount)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Resolution</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund_full">Full Refund to Buyer</SelectItem>
                  <SelectItem value="refund_partial">Partial Refund</SelectItem>
                  <SelectItem value="release_funds">Release Funds to Seller</SelectItem>
                  <SelectItem value="no_action">No Action Required</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {resolution === "refund_partial" && (
              <div className="space-y-2">
                <Label>Refund Amount (R)</Label>
                <Input
                  type="number"
                  placeholder="Amount in Rands"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  min={0}
                  max={resolveDialog ? resolveDialog.orderAmount / 100 : 0}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea
                placeholder="Explain the resolution decision..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={actionLoading || !resolution || !notes.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {actionLoading ? "Resolving..." : "Submit Resolution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
