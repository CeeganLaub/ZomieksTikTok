import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in ZAR
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(amount);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return then.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: then.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Calculate platform fees
 */
export function calculateFees(grossAmount: number): {
  buyerFee: number;
  sellerFee: number;
  buyerTotal: number;
  sellerReceives: number;
} {
  const buyerFee = grossAmount * 0.03; // 3% buyer fee
  const sellerFee = grossAmount * 0.08; // 8% seller fee
  const buyerTotal = grossAmount + buyerFee;
  const sellerReceives = grossAmount - sellerFee;

  return {
    buyerFee: Math.round(buyerFee * 100) / 100,
    sellerFee: Math.round(sellerFee * 100) / 100,
    buyerTotal: Math.round(buyerTotal * 100) / 100,
    sellerReceives: Math.round(sellerReceives * 100) / 100,
  };
}
