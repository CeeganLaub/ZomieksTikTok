// Cloudflare Workers environment bindings
// These types define the bindings available in the Workers runtime

import type { D1Database, KVNamespace, R2Bucket } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    // D1 Database
    DB: D1Database;
    
    // KV Namespaces
    SESSIONS: KVNamespace;
    CACHE: KVNamespace;
    
    // R2 Bucket for file storage
    FILES: R2Bucket;
    
    // Environment variables
    ENVIRONMENT: string;
    
    // Payment gateway keys (set in Cloudflare dashboard)
    OZOW_SITE_CODE?: string;
    OZOW_PRIVATE_KEY?: string;
    OZOW_API_KEY?: string;
    
    PAYFAST_MERCHANT_ID?: string;
    PAYFAST_MERCHANT_KEY?: string;
    PAYFAST_PASSPHRASE?: string;
    
    // Email
    RESEND_API_KEY?: string;
    
    // Auth
    JWT_SECRET?: string;
  }
}

// Extend the process.env for local development
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ENVIRONMENT?: string;
      DATABASE_URL?: string;
      JWT_SECRET?: string;
      OZOW_SITE_CODE?: string;
      OZOW_PRIVATE_KEY?: string;
      OZOW_API_KEY?: string;
      PAYFAST_MERCHANT_ID?: string;
      PAYFAST_MERCHANT_KEY?: string;
      PAYFAST_PASSPHRASE?: string;
      RESEND_API_KEY?: string;
    }
  }
}

export type { CloudflareEnv };
