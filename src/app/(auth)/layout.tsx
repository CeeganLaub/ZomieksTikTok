// Auth layout - centered card layout for auth pages
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zomieks - Authentication",
  description: "Sign in or create an account on Zomieks",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
