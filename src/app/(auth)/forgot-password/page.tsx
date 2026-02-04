"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth/actions";
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
import { Loader2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await requestPasswordReset(formData);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Failed to send reset email");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Mail className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Check your email
          </CardTitle>
          <CardDescription className="text-slate-400">
            If an account exists with that email, we've sent password reset
            instructions.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Link href="/login">
            <Button
              variant="ghost"
              className="text-emerald-400 hover:text-emerald-300 hover:bg-slate-700/50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
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
          Reset password
        </CardTitle>
        <CardDescription className="text-slate-400">
          Enter your email and we'll send you a reset link
        </CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
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
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
          <Link href="/login" className="w-full">
            <Button
              type="button"
              variant="ghost"
              className="w-full text-slate-400 hover:text-slate-300 hover:bg-slate-700/50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Button>
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
