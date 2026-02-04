// Cloudflare environment bindings type declaration
// This extends the CloudflareEnv type for use with @opennextjs/cloudflare

declare global {
  interface CloudflareEnv {
    // D1 Database
    DB: D1Database;
    
    // KV Namespace for sessions and caching
    KV: KVNamespace;
    
    // R2 Bucket for file storage
    R2: R2Bucket;
    
    // Environment variables
    OZOW_API_KEY?: string;
    OZOW_SITE_CODE?: string;
    PAYFAST_MERCHANT_ID?: string;
    PAYFAST_MERCHANT_KEY?: string;
    PAYFAST_PASSPHRASE?: string;
    RESEND_API_KEY?: string;
  }
}

// Module declaration for @opennextjs/cloudflare
declare module "@opennextjs/cloudflare" {
  export function getCloudflareContext(): Promise<{
    env: CloudflareEnv;
    ctx: ExecutionContext;
    cf: CfProperties;
  }>;
}

export {};
