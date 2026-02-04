import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Crown, 
  Star, 
  Clock, 
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { StarRating } from "./star-rating";
import type { UserStats } from "@/lib/reviews/actions";
import { cn } from "@/lib/utils";

interface TrustBadgesProps {
  isVerified: boolean;
  isPro: boolean;
  stats?: UserStats;
  className?: string;
  size?: "sm" | "md";
}

export function TrustBadges({ 
  isVerified, 
  isPro, 
  stats,
  className,
  size = "md"
}: TrustBadgesProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {isVerified && (
        <Badge variant="outline" className={cn(
          "bg-blue-500/10 text-blue-500 border-blue-500/30",
          size === "sm" && "text-xs py-0"
        )}>
          <Shield className={cn("mr-1", size === "sm" ? "w-3 h-3" : "w-4 h-4")} />
          Verified
        </Badge>
      )}
      
      {isPro && (
        <Badge variant="outline" className={cn(
          "bg-amber-500/10 text-amber-500 border-amber-500/30",
          size === "sm" && "text-xs py-0"
        )}>
          <Crown className={cn("mr-1", size === "sm" ? "w-3 h-3" : "w-4 h-4")} />
          Pro
        </Badge>
      )}

      {stats && stats.averageRating >= 4.8 && stats.totalReviews >= 10 && (
        <Badge variant="outline" className={cn(
          "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
          size === "sm" && "text-xs py-0"
        )}>
          <Star className={cn("mr-1 fill-current", size === "sm" ? "w-3 h-3" : "w-4 h-4")} />
          Top Rated
        </Badge>
      )}

      {stats && stats.completionRate >= 95 && stats.completedOrders >= 5 && (
        <Badge variant="outline" className={cn(
          "bg-purple-500/10 text-purple-500 border-purple-500/30",
          size === "sm" && "text-xs py-0"
        )}>
          <CheckCircle className={cn("mr-1", size === "sm" ? "w-3 h-3" : "w-4 h-4")} />
          Reliable
        </Badge>
      )}
    </div>
  );
}

interface UserStatsCardProps {
  stats: UserStats;
  isVerified: boolean;
  isPro: boolean;
  showBadges?: boolean;
}

export function UserStatsCard({ 
  stats, 
  isVerified, 
  isPro,
  showBadges = true 
}: UserStatsCardProps) {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Badges */}
        {showBadges && (
          <TrustBadges 
            isVerified={isVerified} 
            isPro={isPro} 
            stats={stats}
          />
        )}

        {/* Rating */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <span className="text-2xl font-bold">{stats.averageRating || "—"}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            ({stats.totalReviews} review{stats.totalReviews !== 1 && "s"})
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-emerald-500">
              <CheckCircle className="w-4 h-4" />
              <span className="font-bold">{stats.completedOrders}</span>
            </div>
            <p className="text-xs text-muted-foreground">Orders</p>
          </div>
          
          <div>
            <div className="flex items-center justify-center gap-1 text-blue-500">
              <TrendingUp className="w-4 h-4" />
              <span className="font-bold">{stats.completionRate}%</span>
            </div>
            <p className="text-xs text-muted-foreground">Completion</p>
          </div>
          
          <div>
            <div className="flex items-center justify-center gap-1 text-purple-500">
              <Clock className="w-4 h-4" />
              <span className="font-bold">
                {stats.responseTimeHours 
                  ? `${stats.responseTimeHours}h` 
                  : "—"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Response</p>
          </div>
        </div>

        {/* Detailed Ratings */}
        {(stats.avgCommunication || stats.avgQuality || stats.avgValue || stats.avgTimeliness) && (
          <div className="pt-4 border-t space-y-2">
            {stats.avgCommunication !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Communication</span>
                <StarRating rating={stats.avgCommunication} size="sm" showValue />
              </div>
            )}
            {stats.avgQuality !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Quality</span>
                <StarRating rating={stats.avgQuality} size="sm" showValue />
              </div>
            )}
            {stats.avgValue !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Value</span>
                <StarRating rating={stats.avgValue} size="sm" showValue />
              </div>
            )}
            {stats.avgTimeliness !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Timeliness</span>
                <StarRating rating={stats.avgTimeliness} size="sm" showValue />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
