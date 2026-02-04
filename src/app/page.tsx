import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Shield,
  Zap,
  Users,
  CreditCard,
  Star,
  CheckCircle,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                <span className="text-sm font-bold text-slate-900">Z</span>
              </div>
              <span className="text-xl font-bold text-white">Zomieks</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="text-emerald-400 text-sm font-medium">
              South Africa's #1 Freelance Platform
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white max-w-4xl mx-auto leading-tight">
            Find talent. Win projects.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Grow your business.
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            Zomieks combines the best of service marketplaces and project
            bidding. Buy and sell services, bid on projects, and scale with
            anonymous outsourcing.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-8"
              >
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/browse">
              <Button
                size="lg"
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white px-8"
              >
                Browse Services
              </Button>
            </Link>
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>5 free bids</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>1 free service</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>No credit card needed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-slate-800">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Everything you need to succeed
            </h2>
            <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
              A complete platform for freelancers and clients, built for the
              South African market.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Users}
              title="Service Marketplace"
              description="List your services like on Fiverr. Set your prices, define packages, and let clients come to you."
            />
            <FeatureCard
              icon={Zap}
              title="Project Bidding"
              description="Browse projects and submit proposals. Win work with competitive bids and standout portfolios."
            />
            <FeatureCard
              icon={Shield}
              title="Secure Escrow"
              description="Funds are held safely until work is approved. Milestone payments protect both parties."
            />
            <FeatureCard
              icon={CreditCard}
              title="SA Payment Methods"
              description="Pay with Instant EFT via OZOW or card payments via PayFast. No international fees."
            />
            <FeatureCard
              icon={Star}
              title="Reviews & Ratings"
              description="Build trust with verified reviews. Both buyers and sellers can leave feedback."
            />
            <FeatureCard
              icon={Users}
              title="Anonymous Outsourcing"
              description="Scale your business by outsourcing to your trusted shortlist. Clients never know."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 border-t border-slate-800">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-slate-400">
              Start free. Upgrade when you need more.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              title="Free"
              price="R0"
              period="forever"
              features={[
                "5 bids per month",
                "1 active service",
                "Basic profile",
                "Email support",
              ]}
              buttonText="Get Started"
              buttonHref="/register"
            />
            <PricingCard
              title="Pro Monthly"
              price="R99"
              period="per month"
              features={[
                "Unlimited bids",
                "Unlimited services",
                "Anonymous outsourcing",
                "Priority support",
                "Analytics dashboard",
              ]}
              buttonText="Upgrade to Pro"
              buttonHref="/register?plan=monthly"
              highlighted
            />
            <PricingCard
              title="Pro Annual"
              price="R999"
              period="per year"
              features={[
                "Everything in Pro",
                "2 months free",
                "Early access to features",
                "Dedicated support",
              ]}
              buttonText="Save 17%"
              buttonHref="/register?plan=annual"
            />
          </div>
          <p className="text-center text-sm text-slate-500 mt-8">
            Platform fees: 3% buyer fee + 8% seller fee on all transactions
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-slate-800">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to get started?
          </h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto">
            Join thousands of South African freelancers and businesses already
            using Zomieks.
          </p>
          <div className="mt-8">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-8"
              >
                Create Free Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                <span className="text-sm font-bold text-slate-900">Z</span>
              </div>
              <span className="text-lg font-bold text-white">Zomieks</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <Link href="/about" className="hover:text-white">
                About
              </Link>
              <Link href="/terms" className="hover:text-white">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-white">
                Privacy
              </Link>
              <Link href="/contact" className="hover:text-white">
                Contact
              </Link>
            </div>
            <p className="text-sm text-slate-500">
              © 2026 Zomieks. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-colors">
      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-emerald-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  );
}

function PricingCard({
  title,
  price,
  period,
  features,
  buttonText,
  buttonHref,
  highlighted,
}: {
  title: string;
  price: string;
  period: string;
  features: string[];
  buttonText: string;
  buttonHref: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`p-6 rounded-xl border ${
        highlighted
          ? "border-emerald-500/50 bg-gradient-to-b from-emerald-500/10 to-transparent"
          : "border-slate-800 bg-slate-900/50"
      }`}
    >
      {highlighted && (
        <div className="text-emerald-400 text-xs font-semibold mb-4">
          MOST POPULAR
        </div>
      )}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <div className="mt-4 mb-6">
        <span className="text-4xl font-bold text-white">{price}</span>
        <span className="text-slate-400 ml-2">/{period}</span>
      </div>
      <ul className="space-y-3 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            {feature}
          </li>
        ))}
      </ul>
      <Link href={buttonHref}>
        <Button
          className={`w-full ${
            highlighted
              ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
              : "bg-slate-800 hover:bg-slate-700 text-white"
          }`}
        >
          {buttonText}
        </Button>
      </Link>
    </div>
  );
}
