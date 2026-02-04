"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showValue?: boolean;
  className?: string;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onChange,
  showValue = false,
  className,
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index + 1);
    }
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: maxRating }).map((_, index) => {
        const filled = index < Math.floor(rating);
        const partial = index === Math.floor(rating) && rating % 1 !== 0;
        const partialWidth = partial ? `${(rating % 1) * 100}%` : "0%";

        return (
          <button
            key={index}
            type="button"
            disabled={!interactive}
            onClick={() => handleClick(index)}
            className={cn(
              "relative focus:outline-none",
              interactive && "cursor-pointer hover:scale-110 transition-transform"
            )}
          >
            {/* Background star (empty) */}
            <Star
              className={cn(
                sizeClasses[size],
                "text-muted-foreground/30"
              )}
            />
            {/* Filled star overlay */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: filled ? "100%" : partial ? partialWidth : "0%" }}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  "text-yellow-500 fill-yellow-500"
                )}
              />
            </div>
          </button>
        );
      })}
      {showValue && (
        <span className={cn(
          "ml-1 font-medium",
          size === "sm" && "text-xs",
          size === "md" && "text-sm",
          size === "lg" && "text-base"
        )}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
