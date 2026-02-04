import { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreditCard, Sparkles } from "lucide-react";
import { getServerSession } from "@/lib/auth/server";
import { getSubscription } from "@/lib/subscriptions/actions";
import { SubscriptionStatus } from "@/components/subscription/subscription-status";
import { PricingCard } from "@/components/subscription/pricing-card";

export const metadata: Metadata = {
  title: "Subscription | Zomieks",
  description: "Manage your Zomieks subscription",
};

export default async function SubscriptionPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const subscription = await getSubscription();

  return (
    <div className="container max-w-5xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing
        </p>
      </div>

      {/* Current Subscription Status */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Current Plan</h2>
        </div>
        {subscription && <SubscriptionStatus subscription={subscription} />}
      </section>

      {/* Pricing Plans */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Available Plans</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <PricingCard
            plan="free"
            currentPlan={subscription?.plan}
            isActive={subscription?.status === "active"}
          />
          <PricingCard
            plan="monthly"
            currentPlan={subscription?.plan}
            isActive={subscription?.status === "active"}
          />
          <PricingCard
            plan="annual"
            currentPlan={subscription?.plan}
            isActive={subscription?.status === "active"}
          />
        </div>
      </section>

      {/* FAQs */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Frequently Asked Questions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Can I cancel anytime?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Yes! You can cancel your subscription at any time. You&apos;ll keep access until the end of your billing period.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">What payment methods do you accept?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              We accept all major credit cards, debit cards, and EFT payments through PayFast.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Can I switch plans?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Yes! You can upgrade from monthly to annual at any time. The remaining value will be credited.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">What happens when my subscription ends?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;ll be moved to the free plan. Your listings will be preserved but you&apos;ll have limited features.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
