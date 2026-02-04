import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireSession } from "@/lib/auth/server";
import { getProjectBids } from "@/lib/projects/actions";
import { createDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { BidCard } from "./bid-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectBidsPage({ params }: PageProps) {
  const session = await requireSession();
  
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  
  // Get project and verify ownership
  const { env } = await getCloudflareContext();
  const db = createDb(env.DB);
  
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, id),
      eq(projects.buyerId, session.userId)
    ),
  });

  if (!project) {
    notFound();
  }

  const bids = await getProjectBids(id);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
        
        <h1 className="text-2xl font-bold">Bids for: {project.title}</h1>
        <p className="text-muted-foreground">
          {bids.length} bid{bids.length !== 1 ? "s" : ""} received
        </p>
      </div>

      {project.status !== "open" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This project is no longer accepting bids. Status: {project.status}
          </AlertDescription>
        </Alert>
      )}

      {bids.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No bids yet. Your project is visible to freelancers.
          </p>
          <Button variant="outline" asChild>
            <Link href={`/projects/${project.slug}`}>
              View Project Page
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {bids.map((bid) => (
            <BidCard 
              key={bid.id} 
              bid={bid}
              projectStatus={project.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
