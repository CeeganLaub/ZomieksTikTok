"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Check, X } from "lucide-react";

interface PasswordCheck {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [password, setPassword] = useState("");

  const passwordChecks: PasswordCheck = {
    hasMinLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const allChecksPass = Object.values(passwordChecks).every(Boolean);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    setErrors([]);

    try {
      const result = await registerUser(formData);

      if (result.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        if (result.errors) {
          setErrors(result.errors);
        } else {
          setError(result.error || "Registration failed");
        }
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
            <span className="text-xl font-bold text-slate-900">Z</span>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-white">
          Create an account
        </CardTitle>
        <CardDescription className="text-slate-400">
          Join Zomieks and start freelancing today
        </CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-200">
              Full Name
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              required
              disabled={isLoading}
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:ring-emerald-400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-200">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={isLoading}
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:ring-emerald-400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-200">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:ring-emerald-400"
            />
            {password && (
              <div className="mt-2 space-y-1 text-xs">
                <PasswordRequirement
                  met={passwordChecks.hasMinLength}
                  text="At least 8 characters"
                />
                <PasswordRequirement
                  met={passwordChecks.hasUppercase}
                  text="One uppercase letter"
                />
                <PasswordRequirement
                  met={passwordChecks.hasLowercase}
                  text="One lowercase letter"
                />
                <PasswordRequirement
                  met={passwordChecks.hasNumber}
                  text="One number"
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-slate-200">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              disabled={isLoading}
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:ring-emerald-400"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold"
            disabled={isLoading || !allChecksPass}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>
          <p className="text-sm text-slate-400 text-center">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Sign in
            </Link>
          </p>
          <p className="text-xs text-slate-500 text-center">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-slate-400 hover:text-slate-300">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-slate-400 hover:text-slate-300"
            >
              Privacy Policy
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div
      className={`flex items-center gap-2 ${
        met ? "text-emerald-400" : "text-slate-500"
      }`}
    >
      {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{text}</span>
    </div>
  );
}
