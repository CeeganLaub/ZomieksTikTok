import { requireSession } from "@/lib/auth/server";
import { getShortlist, getCategories } from "@/lib/shortlist/actions";
import { ShortlistList } from "@/components/shortlist/shortlist-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Crown } from "lucide-react";
import { createDb } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const runtime = "edge";

async function checkPaidSubscription(userId: string): Promise<boolean> {
  const { env } = await getCloudflareContext();
  const db = createDb(env.DB);
  
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (!subscription) return false;
  if (subscription.plan === "free") return false;
  if (subscription.status !== "active") return false;
  
  const now = new Date();
  if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < now) {
    return false;
  }
  
  return true;
}

export default async function ShortlistPage() {
  const session = await requireSession();
  
  const isPaid = await checkPaidSubscription(session.userId);
  
  if (!isPaid) {
    return (
      <div className="container max-w-4xl py-8">
        <Card className="border-emerald-500/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <Crown className="h-8 w-8 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl">Unlock Shortlist & Outsourcing</CardTitle>
            <CardDescription className="max-w-md mx-auto">
              Upgrade to Pro to build your trusted freelancer shortlist and anonymously 
              outsource work. Your clients will never know.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-1">Build Your Team</h4>
                <p className="text-sm text-muted-foreground">
                  Save your favorite freelancers by category for quick access.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-1">Anonymous Outsourcing</h4>
                <p className="text-sm text-muted-foreground">
                  Outsource work while keeping client relationships private.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-1">Scale Your Business</h4>
                <p className="text-sm text-muted-foreground">
                  Take on more work by leveraging your trusted network.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/dashboard/subscription">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link href="/pricing">View Plans</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const [entries, categories] = await Promise.all([
    getShortlist(),
    getCategories(),
  ]);
  
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          My Shortlist
        </h1>
        <p className="text-muted-foreground mt-2">
          Your trusted freelancers for outsourcing work. Add notes and organize by category.
        </p>
      </div>
      
      <ShortlistList 
        entries={entries} 
        categories={categories.map(c => ({ id: c.id, name: c.name }))} 
      />
    </div>
  );
}
