"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./star-rating";
import { MessageSquare, ThumbsUp, Flag } from "lucide-react";
import { respondToReview } from "@/lib/reviews/actions";
import type { ReviewWithDetails } from "@/lib/reviews/actions";

interface ReviewCardProps {
  review: ReviewWithDetails;
  canRespond?: boolean;
  showOrder?: boolean;
}

export function ReviewCard({ review, canRespond = false, showOrder = true }: ReviewCardProps) {
  const router = useRouter();
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleSubmitResponse = async () => {
    if (!response.trim()) return;

    setLoading(true);
    const result = await respondToReview(review.id, response);
    setLoading(false);

    if (result.success) {
      setShowResponseForm(false);
      setResponse("");
      router.refresh();
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={review.reviewer.avatarUrl || undefined} />
              <AvatarFallback>{getInitials(review.reviewer.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {review.reviewer.name || "Anonymous"}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <StarRating rating={review.overallRating} size="sm" />
                <span>•</span>
                <span>{formatDate(review.createdAt)}</span>
              </div>
            </div>
          </div>

          <Badge variant="outline" className="text-xs">
            {review.reviewType === "buyer_to_seller" ? "From Buyer" : "From Seller"}
          </Badge>
        </div>

        {/* Order reference */}
        {showOrder && review.order && (
          <div className="text-sm text-muted-foreground">
            Order: {review.order.orderNumber}
            {review.order.serviceTitle && ` - ${review.order.serviceTitle}`}
            {review.order.projectTitle && ` - ${review.order.projectTitle}`}
          </div>
        )}

        {/* Title */}
        {review.title && (
          <h4 className="font-semibold">{review.title}</h4>
        )}

        {/* Comment */}
        <p className="text-sm whitespace-pre-wrap">{review.comment}</p>

        {/* Rating breakdown */}
        {(review.communicationRating || review.qualityRating || review.valueRating || review.timelinessRating) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 rounded-lg bg-muted/50 text-sm">
            {review.communicationRating && (
              <div>
                <p className="text-muted-foreground text-xs">Communication</p>
                <StarRating rating={review.communicationRating} size="sm" showValue />
              </div>
            )}
            {review.qualityRating && (
              <div>
                <p className="text-muted-foreground text-xs">Quality</p>
                <StarRating rating={review.qualityRating} size="sm" showValue />
              </div>
            )}
            {review.valueRating && (
              <div>
                <p className="text-muted-foreground text-xs">Value</p>
                <StarRating rating={review.valueRating} size="sm" showValue />
              </div>
            )}
            {review.timelinessRating && (
              <div>
                <p className="text-muted-foreground text-xs">Timeliness</p>
                <StarRating rating={review.timelinessRating} size="sm" showValue />
              </div>
            )}
          </div>
        )}

        {/* Seller response */}
        {review.sellerResponse && (
          <div className="border-l-2 border-emerald-500 pl-4 py-2 space-y-1">
            <p className="text-sm font-medium text-emerald-500">Seller Response</p>
            <p className="text-sm whitespace-pre-wrap">{review.sellerResponse}</p>
            {review.sellerResponseAt && (
              <p className="text-xs text-muted-foreground">
                {formatDate(review.sellerResponseAt)}
              </p>
            )}
          </div>
        )}

        {/* Response form */}
        {canRespond && !review.sellerResponse && review.reviewType === "buyer_to_seller" && (
          <div className="pt-2 border-t">
            {!showResponseForm ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResponseForm(true)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Respond to Review
              </Button>
            ) : (
              <div className="space-y-3">
                <Textarea
                  placeholder="Write your response to this review..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSubmitResponse}
                    disabled={loading || response.trim().length < 10}
                  >
                    {loading ? "Submitting..." : "Submit Response"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowResponseForm(false);
                      setResponse("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
