import { Metadata } from "next";
import Link from "next/link";
import { Check, Sparkles, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing | Zomieks",
  description: "Simple, transparent pricing for freelancers and clients",
};

const PLANS = [
  {
    id: "free",
    name: "Starter",
    description: "Perfect for testing the waters",
    price: 0,
    period: "",
    icon: Zap,
    popular: false,
    features: [
      "Up to 5 bids per month",
      "1 service listing",
      "Basic profile",
      "Standard support",
      "Access to all projects",
    ],
    limitations: [
      "No outsourcing",
      "No shortlist access",
    ],
    cta: "Get Started Free",
    href: "/register",
  },
  {
    id: "monthly",
    name: "Pro Monthly",
    description: "For serious freelancers",
    price: 99,
    period: "/month",
    icon: Sparkles,
    popular: true,
    features: [
      "Unlimited bids",
      "Unlimited service listings",
      "Outsource projects",
      "Shortlist talent",
      "Pro badge",
      "Priority support",
      "Analytics dashboard",
    ],
    limitations: [],
    cta: "Start Pro Monthly",
    href: "/register?plan=monthly",
  },
  {
    id: "annual",
    name: "Pro Annual",
    description: "Best value - 2 months free!",
    price: 999,
    period: "/year",
    icon: Sparkles,
    popular: false,
    savings: 189, // (99 * 12) - 999
    features: [
      "Everything in Pro Monthly",
      "2 months free",
      "Early access to features",
      "Annual badge",
      "Dedicated support",
      "Priority in search",
    ],
    limitations: [],
    cta: "Start Pro Annual",
    href: "/register?plan=annual",
  },
];

const FEES = [
  {
    title: "Buyer Fee",
    percentage: "3%",
    description: "Small fee on each transaction to support platform security and escrow services",
  },
  {
    title: "Seller Fee",
    percentage: "8%",
    description: "Platform fee deducted from earnings to maintain quality and support",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <span className="text-lg font-bold text-white">Z</span>
            </div>
            <span className="text-xl font-bold">Zomieks</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-emerald-600 hover:bg-emerald-700">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container py-16">
        {/* Hero */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4">
            Simple Pricing
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Choose Your Plan
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free and upgrade when you&apos;re ready. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex flex-col",
                  plan.popular && "border-emerald-500 shadow-lg shadow-emerald-500/10"
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 hover:bg-emerald-600">
                    Most Popular
                  </Badge>
                )}

                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-emerald-500" />
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">R{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                    {"savings" in plan && (
                      <Badge variant="outline" className="ml-2 border-emerald-500 text-emerald-500">
                        Save R{plan.savings}
                      </Badge>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {plan.limitations.map((limitation) => (
                      <li key={limitation} className="flex items-start gap-2 text-muted-foreground">
                        <span className="mt-0.5 h-4 w-4 shrink-0 text-center">×</span>
                        <span className="text-sm">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Link href={plan.href} className="w-full">
                    <Button
                      className={cn(
                        "w-full",
                        plan.popular
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : ""
                      )}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Transaction Fees */}
        <div className="mx-auto mt-16 max-w-3xl">
          <h2 className="text-center text-2xl font-bold">Transaction Fees</h2>
          <p className="mt-2 text-center text-muted-foreground">
            Simple, transparent fees on completed transactions
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {FEES.map((fee) => (
              <Card key={fee.title}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {fee.title}
                    <span className="text-3xl font-bold text-emerald-500">{fee.percentage}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{fee.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-16 max-w-3xl">
          <h2 className="text-center text-2xl font-bold">Frequently Asked Questions</h2>
          
          <div className="mt-8 grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes! You can cancel your subscription at any time from your dashboard. You&apos;ll keep access until the end of your billing period.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We accept all major credit and debit cards, as well as EFT payments through PayFast, South Africa&apos;s leading payment gateway.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How does escrow work?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  When a client pays for a project, funds are held securely in escrow. Once the work is delivered and approved, funds are released to the freelancer. This protects both parties.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Can I upgrade later?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Absolutely! Start with the free plan and upgrade to Pro whenever you&apos;re ready. You can also switch between monthly and annual billing.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div className="mx-auto mt-16 max-w-2xl text-center">
          <h2 className="text-2xl font-bold">Ready to get started?</h2>
          <p className="mt-2 text-muted-foreground">
            Join thousands of freelancers already earning on Zomieks
          </p>
          <Link href="/register">
            <Button size="lg" className="mt-6 bg-emerald-600 hover:bg-emerald-700">
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Zomieks. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
