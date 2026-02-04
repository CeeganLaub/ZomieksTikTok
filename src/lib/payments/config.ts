// Payment gateway configuration for OZOW and PayFast
// All amounts are in ZAR cents

export const PAYMENT_CONFIG = {
  currency: "ZAR",
  currencyCode: "ZA",
  
  // Fee structure
  buyerFeePercent: 0.03, // 3%
  sellerFeePercent: 0.08, // 8%
  
  // Minimum/maximum amounts
  minAmount: 5000, // R50 in cents
  maxAmount: 100000000, // R1,000,000 in cents
  
  // Webhook signature validation
  webhookTimeout: 300, // 5 minutes
} as const;

// OZOW Configuration
export const OZOW_CONFIG = {
  // API endpoints
  baseUrl: process.env.OZOW_BASE_URL || "https://api.ozow.com",
  paymentUrl: process.env.OZOW_PAYMENT_URL || "https://pay.ozow.com",
  
  // Credentials (from environment)
  siteCode: process.env.OZOW_SITE_CODE || "",
  privateKey: process.env.OZOW_PRIVATE_KEY || "",
  apiKey: process.env.OZOW_API_KEY || "",
  
  // Test mode
  isTest: process.env.OZOW_TEST_MODE === "true",
  
  // URLs
  successUrl: "/api/payments/ozow/success",
  errorUrl: "/api/payments/ozow/error",
  cancelUrl: "/api/payments/ozow/cancel",
  notifyUrl: "/api/payments/ozow/notify",
} as const;

// PayFast Configuration
export const PAYFAST_CONFIG = {
  // API endpoints
  baseUrl: process.env.PAYFAST_SANDBOX === "true" 
    ? "https://sandbox.payfast.co.za" 
    : "https://www.payfast.co.za",
  
  // Credentials (from environment)
  merchantId: process.env.PAYFAST_MERCHANT_ID || "",
  merchantKey: process.env.PAYFAST_MERCHANT_KEY || "",
  passphrase: process.env.PAYFAST_PASSPHRASE || "",
  
  // Test mode
  isTest: process.env.PAYFAST_SANDBOX === "true",
  
  // URLs
  returnUrl: "/api/payments/payfast/return",
  cancelUrl: "/api/payments/payfast/cancel",
  notifyUrl: "/api/payments/payfast/notify",
} as const;

// Payment types
export type PaymentProvider = "ozow" | "payfast";

export interface PaymentRequest {
  orderId: string;
  milestoneId?: string;
  amount: number; // In cents
  description: string;
  reference: string;
  buyerEmail: string;
  buyerName?: string;
  provider: PaymentProvider;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;
  error?: string;
}

export interface WebhookPayload {
  provider: PaymentProvider;
  transactionId: string;
  reference: string;
  amount: number;
  status: "success" | "failed" | "cancelled" | "pending";
  rawData: Record<string, unknown>;
}

// Payment status mapping
export const PAYMENT_STATUS_MAP = {
  // OZOW statuses
  ozow: {
    Complete: "success",
    Pending: "pending",
    Cancelled: "cancelled",
    Error: "failed",
    Abandoned: "cancelled",
    PendingInvestigation: "pending",
  },
  // PayFast statuses
  payfast: {
    COMPLETE: "success",
    PENDING: "pending",
    CANCELLED: "cancelled",
    FAILED: "failed",
  },
} as const;
