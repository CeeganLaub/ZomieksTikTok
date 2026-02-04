"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewCard } from "./review-card";
import { StarRating } from "./star-rating";
import { Star, MessageSquare } from "lucide-react";
import type { ReviewWithDetails, UserStats } from "@/lib/reviews/actions";

interface ReviewsListProps {
  reviews: ReviewWithDetails[];
  stats?: UserStats;
  canRespond?: boolean;
  showStats?: boolean;
  emptyMessage?: string;
}

export function ReviewsList({ 
  reviews, 
  stats, 
  canRespond = false,
  showStats = true,
  emptyMessage = "No reviews yet"
}: ReviewsListProps) {
  const [filter, setFilter] = useState<"all" | "5" | "4" | "3" | "2" | "1">("all");

  const filteredReviews = filter === "all" 
    ? reviews 
    : reviews.filter(r => r.overallRating === parseInt(filter));

  const ratingCounts = stats ? [
    { rating: 5, count: stats.fiveStarCount },
    { rating: 4, count: stats.fourStarCount },
    { rating: 3, count: stats.threeStarCount },
    { rating: 2, count: stats.twoStarCount },
    { rating: 1, count: stats.oneStarCount },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      {showStats && stats && stats.totalReviews > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Average Rating */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-4xl font-bold">{stats.averageRating}</p>
                  <StarRating rating={stats.averageRating} size="md" />
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.totalReviews} review{stats.totalReviews !== 1 && "s"}
                  </p>
                </div>

                {/* Rating Distribution */}
                <div className="flex-1 space-y-1">
                  {ratingCounts.map(({ rating, count }) => {
                    const percentage = stats.totalReviews > 0 
                      ? (count / stats.totalReviews) * 100 
                      : 0;
                    return (
                      <button
                        key={rating}
                        onClick={() => setFilter(filter === String(rating) ? "all" : String(rating) as typeof filter)}
                        className="flex items-center gap-2 w-full group"
                      >
                        <span className="text-xs w-3">{rating}</span>
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <Progress 
                          value={percentage} 
                          className="flex-1 h-2 group-hover:h-3 transition-all"
                        />
                        <span className="text-xs text-muted-foreground w-8">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Ratings */}
              <div className="grid grid-cols-2 gap-4">
                {stats.avgCommunication !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Communication</p>
                    <div className="flex items-center gap-2">
                      <StarRating rating={stats.avgCommunication} size="sm" />
                      <span className="font-medium">{stats.avgCommunication}</span>
                    </div>
                  </div>
                )}
                {stats.avgQuality !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Quality</p>
                    <div className="flex items-center gap-2">
                      <StarRating rating={stats.avgQuality} size="sm" />
                      <span className="font-medium">{stats.avgQuality}</span>
                    </div>
                  </div>
                )}
                {stats.avgValue !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Value</p>
                    <div className="flex items-center gap-2">
                      <StarRating rating={stats.avgValue} size="sm" />
                      <span className="font-medium">{stats.avgValue}</span>
                    </div>
                  </div>
                )}
                {stats.avgTimeliness !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Timeliness</p>
                    <div className="flex items-center gap-2">
                      <StarRating rating={stats.avgTimeliness} size="sm" />
                      <span className="font-medium">{stats.avgTimeliness}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter indicator */}
      {filter !== "all" && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Showing {filter}-star reviews ({filteredReviews.length})
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>
            Clear filter
          </Button>
        </div>
      )}

      {/* Reviews List */}
      {filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <ReviewCard 
              key={review.id} 
              review={review} 
              canRespond={canRespond}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{emptyMessage}</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {filter !== "all" 
                ? `No ${filter}-star reviews found. Try a different filter.`
                : "Complete orders to receive reviews from clients."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
