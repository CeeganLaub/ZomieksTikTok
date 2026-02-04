"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Users, AlertCircle, Crown } from "lucide-react";
import { createOutsourceRequest } from "@/lib/outsourcing/actions";
import type { ShortlistEntry } from "@/lib/shortlist/actions";

interface OutsourceFormProps {
  orderId: string;
  orderNumber: string;
  orderAmount: number;
  deliveryDays: number;
  deliveryDeadline: string | null;
  categoryId?: string;
  shortlist: ShortlistEntry[];
  categories: Array<{ id: string; name: string }>;
}

export function OutsourceForm({
  orderId,
  orderNumber,
  orderAmount,
  deliveryDays,
  deliveryDeadline,
  categoryId,
  shortlist,
  categories,
}: OutsourceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState(`Work for order ${orderNumber}`);
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [amount, setAmount] = useState(Math.floor(orderAmount * 0.7)); // Suggest 70% of order amount
  const [selectedDeliveryDays, setSelectedDeliveryDays] = useState(Math.max(1, deliveryDays - 1));
  const [selectedCategory, setSelectedCategory] = useState(categoryId || "");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Filter shortlist by category if selected
  const filteredShortlist = selectedCategory
    ? shortlist.filter(e => !e.categoryId || e.categoryId === selectedCategory)
    : shortlist;

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const profitMargin = orderAmount - amount;
  const profitPercentage = orderAmount > 0 ? ((profitMargin / orderAmount) * 100).toFixed(0) : 0;

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (amount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (amount >= orderAmount) {
      setError("Amount must be less than the order amount");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createOutsourceRequest({
      originalOrderId: orderId,
      categoryId: selectedCategory || undefined,
      title: title.trim(),
      description: description.trim(),
      requirements: requirements.trim() || undefined,
      amount,
      deliveryDays: selectedDeliveryDays,
      inviteUserIds: selectedUsers.length > 0 ? selectedUsers : undefined,
    });

    setLoading(false);

    if (result.success) {
      router.push("/dashboard/outsourcing");
      router.refresh();
    } else {
      setError(result.error || "Failed to create outsource request");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Outsource Details</CardTitle>
          <CardDescription>
            Describe what you need done. This will be shown to the freelancer you invite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief title for the work"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what needs to be done..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements (optional)</Label>
            <Textarea
              id="requirements"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Any specific requirements or deliverables..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount (ZAR cents)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                min={1}
                max={orderAmount - 1}
              />
              <p className="text-xs text-muted-foreground">
                = R{(amount / 100).toFixed(2)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="days">Delivery Days</Label>
              <Input
                id="days"
                type="number"
                value={selectedDeliveryDays}
                onChange={(e) => setSelectedDeliveryDays(parseInt(e.target.value) || 1)}
                min={1}
                max={deliveryDays}
              />
              <p className="text-xs text-muted-foreground">
                Order deadline: {deliveryDays} days
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No specific category</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Profit Summary */}
      <Card className="border-emerald-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Your Profit Margin</h3>
              <p className="text-sm text-muted-foreground">
                What you keep after paying the worker
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-500">
                R{(profitMargin / 100).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                {profitPercentage}% margin
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shortlist Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Invite from Shortlist
              </CardTitle>
              <CardDescription>
                Select freelancers to invite for this work
              </CardDescription>
            </div>
            {selectedUsers.length > 0 && (
              <Badge variant="secondary">{selectedUsers.length} selected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredShortlist.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No freelancers in your shortlist</p>
              <Button 
                variant="link" 
                onClick={() => router.push("/dashboard/shortlist")}
              >
                Add freelancers to shortlist
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredShortlist.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedUsers.includes(entry.shortlistedUserId)
                      ? "border-emerald-500 bg-emerald-500/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => toggleUser(entry.shortlistedUserId)}
                >
                  <Checkbox
                    checked={selectedUsers.includes(entry.shortlistedUserId)}
                    onCheckedChange={() => toggleUser(entry.shortlistedUserId)}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={entry.user.avatar || undefined} />
                    <AvatarFallback>
                      {getInitials(entry.user.name, entry.user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {entry.user.name || entry.user.email}
                    </p>
                    {entry.profile?.hourlyRate && (
                      <p className="text-sm text-muted-foreground">
                        R{entry.profile.hourlyRate}/hr
                      </p>
                    )}
                  </div>
                  {entry.category && (
                    <Badge variant="outline" className="text-xs">
                      {entry.category.name}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          <Send className="w-4 h-4 mr-2" />
          {selectedUsers.length > 0
            ? `Create & Invite ${selectedUsers.length} Freelancer${selectedUsers.length > 1 ? "s" : ""}`
            : "Create Outsource Request"}
        </Button>
      </div>
    </div>
  );
}
