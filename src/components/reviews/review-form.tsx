"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarRating } from "./star-rating";
import { createReview } from "@/lib/reviews/actions";
import { Star, Send } from "lucide-react";

interface ReviewFormProps {
  orderId: string;
  orderNumber: string;
  reviewType: "buyer_to_seller" | "seller_to_buyer";
  revieweeName?: string;
  onSuccess?: () => void;
}

export function ReviewForm({ 
  orderId, 
  orderNumber, 
  reviewType,
  revieweeName,
  onSuccess 
}: ReviewFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [overallRating, setOverallRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [timelinessRating, setTimelinessRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (overallRating === 0) {
      setError("Please select an overall rating");
      return;
    }

    if (comment.trim().length < 10) {
      setError("Review must be at least 10 characters");
      return;
    }

    setLoading(true);
    const result = await createReview({
      orderId,
      overallRating,
      communicationRating: communicationRating || undefined,
      qualityRating: qualityRating || undefined,
      valueRating: valueRating || undefined,
      timelinessRating: timelinessRating || undefined,
      title: title.trim() || undefined,
      comment: comment.trim(),
    });
    setLoading(false);

    if (result.success) {
      onSuccess?.();
      router.refresh();
    } else {
      setError(result.error || "Failed to submit review");
    }
  };

  const isBuyerReview = reviewType === "buyer_to_seller";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5" />
          Leave a Review
        </CardTitle>
        <CardDescription>
          Share your experience for order {orderNumber}
          {revieweeName && ` with ${revieweeName}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Overall Rating */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Overall Rating <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-4">
              <StarRating
                rating={overallRating}
                size="lg"
                interactive
                onChange={setOverallRating}
              />
              {overallRating > 0 && (
                <span className="text-lg font-bold">{overallRating}/5</span>
              )}
            </div>
          </div>

          {/* Detailed Ratings - Only for buyer reviews */}
          {isBuyerReview && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Communication</Label>
                <StarRating
                  rating={communicationRating}
                  size="md"
                  interactive
                  onChange={setCommunicationRating}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Quality</Label>
                <StarRating
                  rating={qualityRating}
                  size="md"
                  interactive
                  onChange={setQualityRating}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Value for Money</Label>
                <StarRating
                  rating={valueRating}
                  size="md"
                  interactive
                  onChange={setValueRating}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Timeliness</Label>
                <StarRating
                  rating={timelinessRating}
                  size="md"
                  interactive
                  onChange={setTimelinessRating}
                />
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Review Title (Optional)</Label>
            <Input
              id="title"
              placeholder="Summarize your experience"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">
              Your Review <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="comment"
              placeholder={
                isBuyerReview
                  ? "Describe your experience with this seller. What did they do well? What could be improved?"
                  : "Describe your experience working with this buyer. Were they clear about requirements?"
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/1000
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={loading || overallRating === 0}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? "Submitting..." : "Submit Review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
