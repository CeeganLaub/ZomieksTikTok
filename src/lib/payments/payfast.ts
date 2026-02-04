// PayFast Card Payment Integration
// Documentation: https://developers.payfast.co.za/

import { PAYFAST_CONFIG, type PaymentRequest, type PaymentResult } from "./config";

/**
 * MD5 implementation for PayFast signatures
 * Using pure JavaScript since Web Crypto API doesn't support MD5
 */
function md5(input: string): string {
  // MD5 helper functions
  function rotateLeft(x: number, n: number): number {
    return (x << n) | (x >>> (32 - n));
  }

  function addUnsigned(x: number, y: number): number {
    const x8 = x & 0x80000000;
    const y8 = y & 0x80000000;
    const x4 = x & 0x40000000;
    const y4 = y & 0x40000000;
    const result = (x & 0x3fffffff) + (y & 0x3fffffff);
    if (x4 & y4) return result ^ 0x80000000 ^ x8 ^ y8;
    if (x4 | y4) {
      if (result & 0x40000000) return result ^ 0xc0000000 ^ x8 ^ y8;
      return result ^ 0x40000000 ^ x8 ^ y8;
    }
    return result ^ x8 ^ y8;
  }

  function F(x: number, y: number, z: number): number { return (x & y) | (~x & z); }
  function G(x: number, y: number, z: number): number { return (x & z) | (y & ~z); }
  function H(x: number, y: number, z: number): number { return x ^ y ^ z; }
  function I(x: number, y: number, z: number): number { return y ^ (x | ~z); }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(str: string): number[] {
    const utf8Str = unescape(encodeURIComponent(str));
    const lWordCount = (((utf8Str.length + 8) - ((utf8Str.length + 8) % 64)) / 64 + 1) * 16;
    const lWordArray: number[] = Array(lWordCount - 1).fill(0);
    let lByteCount = 0;
    let lBytePosition = 0;

    while (lByteCount < utf8Str.length) {
      const lWordPosition = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordPosition] = lWordArray[lWordPosition] | (utf8Str.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }

    const lWordPosition = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordPosition] = lWordArray[lWordPosition] | (0x80 << lBytePosition);
    lWordArray[lWordCount - 2] = utf8Str.length << 3;
    lWordArray[lWordCount - 1] = utf8Str.length >>> 29;

    return lWordArray;
  }

  function wordToHex(lValue: number): string {
    let result = "";
    for (let lCount = 0; lCount <= 3; lCount++) {
      const lByte = (lValue >>> (lCount * 8)) & 255;
      result += ("0" + lByte.toString(16)).slice(-2);
    }
    return result;
  }

  const x = convertToWordArray(input);
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;

    a = FF(a, b, c, d, x[k + 0], S[0], 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], S[1], 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], S[2], 0x242070db);
    b = FF(b, c, d, a, x[k + 3], S[3], 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], S[0], 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], S[1], 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], S[2], 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], S[3], 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], S[0], 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], S[1], 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], S[2], 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], S[3], 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], S[0], 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], S[1], 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], S[2], 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], S[3], 0x49b40821);

    a = GG(a, b, c, d, x[k + 1], S[4], 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], S[5], 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], S[6], 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0], S[7], 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], S[4], 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], S[5], 0x02441453);
    c = GG(c, d, a, b, x[k + 15], S[6], 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], S[7], 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], S[4], 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], S[5], 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], S[6], 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], S[7], 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], S[4], 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], S[5], 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], S[6], 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], S[7], 0x8d2a4c8a);

    a = HH(a, b, c, d, x[k + 5], S[8], 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], S[9], 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], S[10], 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], S[11], 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], S[8], 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], S[9], 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], S[10], 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10], S[11], 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], S[8], 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0], S[9], 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], S[10], 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6], S[11], 0x04881d05);
    a = HH(a, b, c, d, x[k + 9], S[8], 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12], S[9], 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], S[10], 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2], S[11], 0xc4ac5665);

    a = II(a, b, c, d, x[k + 0], S[12], 0xf4292244);
    d = II(d, a, b, c, x[k + 7], S[13], 0x432aff97);
    c = II(c, d, a, b, x[k + 14], S[14], 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], S[15], 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], S[12], 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], S[13], 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], S[14], 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], S[15], 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], S[12], 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], S[13], 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], S[14], 0xa3014314);
    b = II(b, c, d, a, x[k + 13], S[15], 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], S[12], 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], S[13], 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], S[14], 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], S[15], 0xeb86d391);

    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
}

/**
 * Generate PayFast signature
 */
function generateSignature(params: Record<string, string>): string {
  // Sort parameters alphabetically and create query string
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys
    .filter(key => params[key] !== "" && params[key] !== undefined)
    .map(key => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`)
    .join("&");

  // Add passphrase if set
  const dataToHash = PAYFAST_CONFIG.passphrase 
    ? `${queryString}&passphrase=${encodeURIComponent(PAYFAST_CONFIG.passphrase)}`
    : queryString;

  return md5(dataToHash);
}

/**
 * Create PayFast payment form data
 * Returns HTML form that auto-submits to PayFast
 */
export async function createPayFastPayment(
  request: PaymentRequest,
  baseUrl: string
): Promise<PaymentResult> {
  try {
    if (!PAYFAST_CONFIG.merchantId || !PAYFAST_CONFIG.merchantKey) {
      return { success: false, error: "PayFast not configured" };
    }

    // Convert cents to rands with 2 decimal places
    const amountInRands = (request.amount / 100).toFixed(2);

    // Build payment parameters
    const params: Record<string, string> = {
      // Merchant details
      merchant_id: PAYFAST_CONFIG.merchantId,
      merchant_key: PAYFAST_CONFIG.merchantKey,
      
      // URLs
      return_url: `${baseUrl}${PAYFAST_CONFIG.returnUrl}?ref=${request.reference}`,
      cancel_url: `${baseUrl}${PAYFAST_CONFIG.cancelUrl}?ref=${request.reference}`,
      notify_url: `${baseUrl}${PAYFAST_CONFIG.notifyUrl}`,
      
      // Buyer details
      email_address: request.buyerEmail,
      name_first: request.buyerName?.split(" ")[0] || "",
      name_last: request.buyerName?.split(" ").slice(1).join(" ") || "",
      
      // Transaction details
      m_payment_id: request.reference,
      amount: amountInRands,
      item_name: request.description.slice(0, 100), // Max 100 chars
      item_description: `Order: ${request.orderId}`.slice(0, 255),
      
      // Custom fields
      custom_str1: request.orderId,
      custom_str2: request.milestoneId || "",
      custom_str3: "",
      custom_str4: "",
      custom_str5: "",
      custom_int1: "",
      custom_int2: "",
      custom_int3: "",
      custom_int4: "",
      custom_int5: "",
      
      // Payment method - allow all
      payment_method: "",
    };

    // Generate signature
    const signature = generateSignature(params);
    params.signature = signature;

    // Build redirect URL with all parameters
    const queryParams = new URLSearchParams(params);
    const redirectUrl = `${PAYFAST_CONFIG.baseUrl}/eng/process?${queryParams.toString()}`;

    return {
      success: true,
      redirectUrl,
      transactionId: request.reference,
    };
  } catch (error) {
    console.error("PayFast payment creation error:", error);
    return { success: false, error: "Failed to create PayFast payment" };
  }
}

/**
 * Verify PayFast ITN (Instant Transaction Notification)
 */
export async function verifyPayFastITN(
  body: Record<string, string>,
  sourceIp: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Step 1: Verify source IP is from PayFast
    const validIps = [
      "197.97.145.144",
      "197.97.145.145",
      "197.97.145.146",
      "197.97.145.147",
      "197.97.145.148",
      "41.74.179.194",
      "41.74.179.195",
      "41.74.179.196",
      "41.74.179.197",
      "41.74.179.198",
      // Sandbox IPs
      "197.97.145.0/24",
    ];

    // In production, verify IP is in the valid range
    // For now, we'll skip this in sandbox mode
    if (!PAYFAST_CONFIG.isTest) {
      const isValidIp = validIps.some(ip => {
        if (ip.includes("/")) {
          // CIDR notation - simplified check
          return sourceIp.startsWith(ip.split("/")[0].slice(0, -1));
        }
        return ip === sourceIp;
      });

      if (!isValidIp) {
        return { valid: false, error: `Invalid source IP: ${sourceIp}` };
      }
    }

    // Step 2: Verify signature
    const receivedSignature = body.signature;
    if (!receivedSignature) {
      return { valid: false, error: "Missing signature" };
    }

    // Remove signature from body and recalculate
    const paramsWithoutSignature = { ...body };
    delete paramsWithoutSignature.signature;

    const expectedSignature = generateSignature(paramsWithoutSignature);
    if (expectedSignature !== receivedSignature) {
      return { valid: false, error: "Invalid signature" };
    }

    // Step 3: Verify with PayFast server (optional but recommended)
    const verifyUrl = PAYFAST_CONFIG.isTest
      ? "https://sandbox.payfast.co.za/eng/query/validate"
      : "https://www.payfast.co.za/eng/query/validate";

    const verifyResponse = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    });

    const verifyResult = await verifyResponse.text();
    if (verifyResult !== "VALID") {
      return { valid: false, error: `PayFast validation failed: ${verifyResult}` };
    }

    return { valid: true };
  } catch (error) {
    console.error("PayFast ITN verification error:", error);
    return { valid: false, error: "Verification failed" };
  }
}

/**
 * Parse PayFast ITN notification
 */
export function parsePayFastITN(body: Record<string, string>): {
  transactionId: string;
  reference: string;
  orderId: string;
  milestoneId: string | null;
  amount: number;
  status: "success" | "failed" | "cancelled" | "pending";
  paymentMethod: string;
} {
  const statusMap: Record<string, "success" | "failed" | "cancelled" | "pending"> = {
    COMPLETE: "success",
    PENDING: "pending",
    CANCELLED: "cancelled",
    FAILED: "failed",
  };

  // Amount comes in as ZAR, convert to cents
  const amountInRands = parseFloat(body.amount_gross || "0");
  const amountInCents = Math.round(amountInRands * 100);

  return {
    transactionId: body.pf_payment_id || "",
    reference: body.m_payment_id || "",
    orderId: body.custom_str1 || "",
    milestoneId: body.custom_str2 || null,
    amount: amountInCents,
    status: statusMap[body.payment_status] || "failed",
    paymentMethod: body.payment_method || "unknown",
  };
}

/**
 * Generate PayFast form HTML for auto-submit
 * Use this when you need to POST to PayFast (alternative to redirect)
 */
export async function generatePayFastForm(
  request: PaymentRequest,
  baseUrl: string
): Promise<{ success: boolean; html?: string; error?: string }> {
  const result = await createPayFastPayment(request, baseUrl);
  
  if (!result.success || !result.redirectUrl) {
    return { success: false, error: result.error };
  }

  // Parse the redirect URL to get form fields
  const url = new URL(result.redirectUrl);
  const params = Object.fromEntries(url.searchParams.entries());

  const formHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Redirecting to PayFast...</title>
</head>
<body>
  <form id="payfast-form" action="${PAYFAST_CONFIG.baseUrl}/eng/process" method="POST">
    ${Object.entries(params)
      .map(([key, value]) => `<input type="hidden" name="${key}" value="${value}" />`)
      .join("\n    ")}
  </form>
  <script>document.getElementById('payfast-form').submit();</script>
</body>
</html>`;

  return { success: true, html: formHtml };
}
