import { requireSession } from "@/lib/auth/server";
import { getMyOutsourceRequests, getMyOutsourceInvitations, getMyOutsourceWork } from "@/lib/outsourcing/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Briefcase, 
  Crown, 
  Send, 
  Inbox, 
  Clock,
  CheckCircle,
} from "lucide-react";
import { createDb } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import { OutsourceRequestCard } from "@/components/outsourcing/outsource-request-card";
import { OutsourceInvitationCard } from "@/components/outsourcing/outsource-invitation-card";

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

export default async function OutsourcingPage() {
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
            <CardTitle className="text-2xl">Unlock Outsourcing</CardTitle>
            <CardDescription className="max-w-md mx-auto">
              Scale your business by outsourcing work to trusted freelancers. 
              Your clients will never know - it&apos;s completely anonymous.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-1">Stay Anonymous</h4>
                <p className="text-sm text-muted-foreground">
                  Clients see only you. The outsourced worker is hidden.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-1">Set Your Price</h4>
                <p className="text-sm text-muted-foreground">
                  Keep the profit margin between client fee and worker pay.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-1">Scale Infinitely</h4>
                <p className="text-sm text-muted-foreground">
                  Take on unlimited work by leveraging your trusted network.
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
  
  const [myRequests, invitations, myWork] = await Promise.all([
    getMyOutsourceRequests(),
    getMyOutsourceInvitations(),
    getMyOutsourceWork(),
  ]);

  const pendingInvitations = invitations.filter(inv => inv.status === "pending");
  const activeWork = myWork.filter(w => !["completed", "cancelled"].includes(w.status));
  const activeRequests = myRequests.filter(r => !["completed", "cancelled"].includes(r.status));
  
  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Briefcase className="h-8 w-8" />
          Outsourcing
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your outsourced work and incoming opportunities.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Requests</p>
                <p className="text-2xl font-bold">{activeRequests.length}</p>
              </div>
              <Send className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
                <p className="text-2xl font-bold">{pendingInvitations.length}</p>
              </div>
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Work</p>
                <p className="text-2xl font-bold">{activeWork.length}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {myRequests.filter(r => r.status === "completed").length + 
                   myWork.filter(w => w.status === "completed").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests" className="gap-2">
            <Send className="h-4 w-4" />
            My Requests
            {activeRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">{activeRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2">
            <Inbox className="h-4 w-4" />
            Invitations
            {pendingInvitations.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingInvitations.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="work" className="gap-2">
            <Briefcase className="h-4 w-4" />
            My Work
            {activeWork.length > 0 && (
              <Badge variant="secondary" className="ml-1">{activeWork.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Work I&apos;m Outsourcing</h2>
            <Button asChild>
              <Link href="/dashboard/orders">
                View Orders to Outsource
              </Link>
            </Button>
          </div>
          
          {myRequests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Send className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No outsource requests yet</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-4">
                  Go to your active orders and click &quot;Outsource&quot; to delegate work to your shortlisted freelancers.
                </p>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/orders">View My Orders</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {myRequests.map((request) => (
                <OutsourceRequestCard key={request.id} request={request} isOwner />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="invitations" className="space-y-4">
          <h2 className="text-lg font-semibold">Incoming Opportunities</h2>
          
          {invitations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No invitations yet</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  When other Pro users add you to their shortlist and outsource work, 
                  you&apos;ll receive invitations here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {invitations.map((invitation) => (
                <OutsourceInvitationCard key={invitation.id} invitation={invitation} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="work" className="space-y-4">
          <h2 className="text-lg font-semibold">Work I&apos;m Doing for Others</h2>
          
          {myWork.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No outsourced work yet</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  When you accept an outsource invitation, the work will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {myWork.map((request) => (
                <OutsourceRequestCard key={request.id} request={request} isWorker />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
