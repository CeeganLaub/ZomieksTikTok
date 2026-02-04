"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createCheckoutSession, PLAN_PRICES } from "@/lib/subscriptions/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PricingCardProps {
  plan: "free" | "monthly" | "annual";
  currentPlan?: "free" | "monthly" | "annual";
  isActive?: boolean;
}

const PLAN_DETAILS = {
  free: {
    title: "Starter",
    description: "Perfect for getting started",
    price: 0,
    period: "",
    features: [
      "Up to 5 bids per month",
      "1 service listing",
      "Basic profile",
      "Standard support",
    ],
    limitations: [
      "No outsourcing",
      "No shortlist access",
    ],
    icon: Zap,
    popular: false,
  },
  monthly: {
    title: "Pro Monthly",
    description: "For active freelancers",
    price: PLAN_PRICES.monthly / 100,
    period: "/month",
    features: [
      "Unlimited bids",
      "Unlimited service listings",
      "Outsource projects",
      "Shortlist talent",
      "Priority support",
      "Pro badge",
    ],
    limitations: [],
    icon: Sparkles,
    popular: true,
  },
  annual: {
    title: "Pro Annual",
    description: "Best value - 2 months free!",
    price: PLAN_PRICES.annual / 100,
    period: "/year",
    features: [
      "Everything in Pro Monthly",
      "2 months free",
      "Early access to features",
      "Annual badge",
      "Dedicated support",
    ],
    limitations: [],
    icon: Sparkles,
    popular: false,
    savings: Math.round(PLAN_PRICES.monthly * 12 / 100) - Math.round(PLAN_PRICES.annual / 100),
  },
};

export function PricingCard({ plan, currentPlan, isActive }: PricingCardProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const details = PLAN_DETAILS[plan];
  const Icon = details.icon;

  const isCurrent = currentPlan === plan && isActive;
  const canUpgrade = plan !== "free" && (!currentPlan || currentPlan === "free" || (currentPlan === "monthly" && plan === "annual"));

  async function handleSubscribe() {
    if (plan === "free") return;

    setLoading(true);
    try {
      const result = await createCheckoutSession(plan);
      
      if (result.success && result.paymentUrl) {
        router.push(result.paymentUrl);
      } else {
        toast.error(result.error || "Failed to start checkout");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={cn(
      "relative flex flex-col",
      details.popular && "border-emerald-500 shadow-lg shadow-emerald-500/10",
      isCurrent && "ring-2 ring-emerald-500"
    )}>
      {details.popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 hover:bg-emerald-600">
          Most Popular
        </Badge>
      )}
      
      {isCurrent && (
        <Badge className="absolute -top-3 right-4" variant="secondary">
          Current Plan
        </Badge>
      )}

      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-emerald-500" />
          <CardTitle className="text-xl">{details.title}</CardTitle>
        </div>
        <CardDescription>{details.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="mb-6">
          <span className="text-4xl font-bold">R{details.price}</span>
          <span className="text-muted-foreground">{details.period}</span>
          {"savings" in details && (
            <Badge variant="outline" className="ml-2 border-emerald-500 text-emerald-500">
              Save R{details.savings}
            </Badge>
          )}
        </div>

        <ul className="space-y-3">
          {details.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
          {details.limitations.map((limitation) => (
            <li key={limitation} className="flex items-start gap-2 text-muted-foreground">
              <span className="mt-0.5 h-4 w-4 shrink-0 text-center">×</span>
              <span className="text-sm">{limitation}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        {plan === "free" ? (
          <Button variant="outline" className="w-full" disabled>
            {isCurrent ? "Current Plan" : "Free Forever"}
          </Button>
        ) : isCurrent ? (
          <Button variant="outline" className="w-full" disabled>
            Current Plan
          </Button>
        ) : canUpgrade ? (
          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              `Upgrade to ${details.title}`
            )}
          </Button>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            Current plan is higher
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
