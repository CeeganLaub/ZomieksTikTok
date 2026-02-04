// Password hashing utilities using Argon2
import { hash, verify } from "@node-rs/argon2";

// Argon2id configuration for secure password hashing
const ARGON2_OPTIONS = {
  memoryCost: 19456, // 19 MB
  timeCost: 2,
  parallelism: 1,
};

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    return await verify(hashedPassword, password);
  } catch {
    return false;
  }
}

/**
 * Check if a password meets minimum requirements
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
