import { requireSession } from "@/lib/auth/server";
import { getReviewsForUser, getReviewsByUser, getUserStats } from "@/lib/reviews/actions";
import { ReviewsList } from "@/components/reviews/reviews-list";
import { UserStatsCard } from "@/components/reviews/user-stats-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, MessageSquare } from "lucide-react";
import { createDb } from "@/lib/db";
import { subscriptions, userVerifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "edge";

async function getUserSubscriptionInfo(userId: string) {
  const { env } = await getCloudflareContext();
  const db = createDb(env.DB);
  
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  
  const verification = await db.query.userVerifications.findFirst({
    where: eq(userVerifications.userId, userId),
  });
  
  const isPro = subscription?.plan !== "free" && subscription?.status === "active";
  const isVerified = verification?.status === "approved";
  
  return { isPro, isVerified };
}

export default async function ReviewsPage() {
  const session = await requireSession();
  
  const [receivedReviews, givenReviews, stats, userInfo] = await Promise.all([
    getReviewsForUser(session.userId),
    getReviewsByUser(session.userId),
    getUserStats(session.userId),
    getUserSubscriptionInfo(session.userId),
  ]);
  
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Star className="h-8 w-8" />
          My Reviews
        </h1>
        <p className="text-muted-foreground mt-2">
          See reviews you&apos;ve received and reviews you&apos;ve given.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Stats Sidebar */}
        <div className="lg:col-span-1">
          <UserStatsCard 
            stats={stats} 
            isVerified={userInfo.isVerified}
            isPro={userInfo.isPro}
          />
        </div>

        {/* Reviews Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="received" className="space-y-4">
            <TabsList>
              <TabsTrigger value="received" className="gap-2">
                <Star className="h-4 w-4" />
                Received ({receivedReviews.length})
              </TabsTrigger>
              <TabsTrigger value="given" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Given ({givenReviews.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="received">
              <ReviewsList 
                reviews={receivedReviews}
                stats={stats}
                canRespond
                showStats={false}
                emptyMessage="No reviews received yet"
              />
            </TabsContent>
            
            <TabsContent value="given">
              <ReviewsList 
                reviews={givenReviews}
                showStats={false}
                emptyMessage="You haven&apos;t left any reviews yet"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
