// OZOW Instant EFT Integration
// Documentation: https://docs.ozow.com/

import { OZOW_CONFIG, type PaymentRequest, type PaymentResult } from "./config";

/**
 * Generate OZOW hash for request verification
 * Uses SHA-512 hashing as per OZOW specification
 */
async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-512", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toLowerCase();
}

/**
 * Build hash string for OZOW payment request
 */
function buildHashInput(params: Record<string, string>): string {
  // OZOW requires specific order of parameters for hash
  const hashFields = [
    "SiteCode",
    "CountryCode",
    "CurrencyCode",
    "Amount",
    "TransactionReference",
    "BankReference",
    "Optional1",
    "Optional2",
    "Optional3",
    "Optional4",
    "Optional5",
    "Customer",
    "CancelUrl",
    "ErrorUrl",
    "SuccessUrl",
    "NotifyUrl",
    "IsTest",
  ];

  const values = hashFields.map(field => params[field] || "").join("");
  return values + OZOW_CONFIG.privateKey;
}

/**
 * Create OZOW payment redirect URL
 */
export async function createOzowPayment(
  request: PaymentRequest,
  baseUrl: string
): Promise<PaymentResult> {
  try {
    if (!OZOW_CONFIG.siteCode || !OZOW_CONFIG.privateKey) {
      return { success: false, error: "OZOW not configured" };
    }

    // Convert cents to rands with 2 decimal places
    const amountInRands = (request.amount / 100).toFixed(2);

    const params: Record<string, string> = {
      SiteCode: OZOW_CONFIG.siteCode,
      CountryCode: "ZA",
      CurrencyCode: "ZAR",
      Amount: amountInRands,
      TransactionReference: request.reference,
      BankReference: request.description.slice(0, 20), // Max 20 chars
      Optional1: request.orderId,
      Optional2: request.milestoneId || "",
      Optional3: "",
      Optional4: "",
      Optional5: "",
      Customer: request.buyerEmail,
      CancelUrl: `${baseUrl}${OZOW_CONFIG.cancelUrl}`,
      ErrorUrl: `${baseUrl}${OZOW_CONFIG.errorUrl}`,
      SuccessUrl: `${baseUrl}${OZOW_CONFIG.successUrl}`,
      NotifyUrl: `${baseUrl}${OZOW_CONFIG.notifyUrl}`,
      IsTest: OZOW_CONFIG.isTest ? "true" : "false",
    };

    // Generate hash
    const hashInput = buildHashInput(params);
    const hashCheck = await generateHash(hashInput);
    params.HashCheck = hashCheck;

    // Build redirect URL
    const queryParams = new URLSearchParams(params);
    const redirectUrl = `${OZOW_CONFIG.paymentUrl}/?${queryParams.toString()}`;

    return {
      success: true,
      redirectUrl,
      transactionId: request.reference,
    };
  } catch (error) {
    console.error("OZOW payment creation error:", error);
    return { success: false, error: "Failed to create OZOW payment" };
  }
}

/**
 * Verify OZOW webhook notification
 */
export async function verifyOzowWebhook(
  body: Record<string, string>
): Promise<boolean> {
  try {
    const receivedHash = body.Hash;
    if (!receivedHash) return false;

    // Build verification hash
    const hashFields = [
      "SiteCode",
      "TransactionId",
      "TransactionReference",
      "Amount",
      "Status",
      "Optional1",
      "Optional2",
      "Optional3",
      "Optional4",
      "Optional5",
      "CurrencyCode",
      "IsTest",
      "StatusMessage",
    ];

    const values = hashFields.map(field => body[field] || "").join("");
    const expectedHash = await generateHash(values + OZOW_CONFIG.privateKey);

    return expectedHash.toLowerCase() === receivedHash.toLowerCase();
  } catch (error) {
    console.error("OZOW webhook verification error:", error);
    return false;
  }
}

/**
 * Parse OZOW webhook notification
 */
export function parseOzowWebhook(body: Record<string, string>): {
  transactionId: string;
  reference: string;
  orderId: string;
  milestoneId: string | null;
  amount: number;
  status: "success" | "failed" | "cancelled" | "pending";
  message: string;
} {
  const statusMap: Record<string, "success" | "failed" | "cancelled" | "pending"> = {
    Complete: "success",
    Pending: "pending",
    Cancelled: "cancelled",
    Error: "failed",
    Abandoned: "cancelled",
    PendingInvestigation: "pending",
  };

  // Amount comes in as ZAR, convert to cents
  const amountInRands = parseFloat(body.Amount || "0");
  const amountInCents = Math.round(amountInRands * 100);

  return {
    transactionId: body.TransactionId || "",
    reference: body.TransactionReference || "",
    orderId: body.Optional1 || "",
    milestoneId: body.Optional2 || null,
    amount: amountInCents,
    status: statusMap[body.Status] || "failed",
    message: body.StatusMessage || "",
  };
}

/**
 * Get OZOW transaction status via API
 */
export async function getOzowTransactionStatus(
  transactionId: string
): Promise<{
  success: boolean;
  status?: string;
  error?: string;
}> {
  try {
    if (!OZOW_CONFIG.apiKey) {
      return { success: false, error: "OZOW API key not configured" };
    }

    const response = await fetch(
      `${OZOW_CONFIG.baseUrl}/GetTransactionByReference?siteCode=${OZOW_CONFIG.siteCode}&transactionReference=${transactionId}`,
      {
        headers: {
          Accept: "application/json",
          ApiKey: OZOW_CONFIG.apiKey,
        },
      }
    );

    if (!response.ok) {
      return { success: false, error: "Failed to fetch transaction status" };
    }

    const data = (await response.json()) as { status?: string };
    return {
      success: true,
      status: data.status,
    };
  } catch (error) {
    console.error("OZOW status check error:", error);
    return { success: false, error: "Failed to check transaction status" };
  }
}
