import Link from "next/link";
import { Clock, CheckCircle2, XCircle, DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserBids } from "@/lib/projects/actions";
import { createDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { formatCurrency } from "@/lib/utils";

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { 
    label: "Pending", 
    icon: <Clock className="h-4 w-4" />,
    color: "text-yellow-600"
  },
  accepted: { 
    label: "Accepted", 
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-green-600"
  },
  rejected: { 
    label: "Rejected", 
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-600"
  },
  withdrawn: { 
    label: "Withdrawn", 
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-gray-600"
  },
};

export default async function MyBidsPage() {
  const bids = await getUserBids();
  
  // Fetch project details for each bid
  const { env } = await getCloudflareContext();
  const db = createDb(env.DB);
  
  const bidsWithProjects = await Promise.all(
    bids.map(async (bid) => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, bid.projectId),
      });
      return { ...bid, project };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Bids</h1>
        <p className="text-muted-foreground">
          Track your submitted bids and their status
        </p>
      </div>

      {bidsWithProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No bids yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Browse open projects and submit your first bid
            </p>
            <Button asChild>
              <Link href="/browse/projects">Browse Projects</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bidsWithProjects.map((bid) => {
            const status = statusConfig[bid.status] || statusConfig.pending;
            
            return (
              <Card key={bid.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">
                        {bid.project ? (
                          <Link 
                            href={`/projects/${bid.project.slug}`}
                            className="hover:text-primary transition-colors"
                          >
                            {bid.project.title}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Project Unavailable</span>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Submitted {new Date(bid.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 ${status.color}`}>
                      {status.icon}
                      <span className="text-sm font-medium">{status.label}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Your Bid</p>
                      <p className="font-bold">{formatCurrency(bid.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Delivery</p>
                      <p className="font-bold">{bid.deliveryDays} days</p>
                    </div>
                    {bid.project && (
                      <div>
                        <p className="text-xs text-muted-foreground">Project Budget</p>
                        <p className="font-medium text-sm">
                          {formatCurrency(bid.project.budgetMin)} - {formatCurrency(bid.project.budgetMax)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-1">Your Proposal</p>
                    <p className="text-sm line-clamp-2">{bid.proposal}</p>
                  </div>

                  <div className="flex gap-2">
                    {bid.project && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/projects/${bid.project.slug}`}>
                          View Project
                        </Link>
                      </Button>
                    )}
                    {bid.status === "accepted" && (
                      <Button size="sm" asChild>
                        <Link href="/dashboard/orders">
                          View Order
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
