import Link from "next/link";
import { Plus, Eye, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getUserProjects } from "@/lib/projects/actions";
import { formatCurrency } from "@/lib/utils";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Open", variant: "default" },
  in_progress: { label: "In Progress", variant: "secondary" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default async function ProjectsPage() {
  const projects = await getUserProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Projects</h1>
          <p className="text-muted-foreground">
            Manage your posted projects and view bids
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            Post a Project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Post your first project and let freelancers bid on it
            </p>
            <Button asChild>
              <Link href="/dashboard/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Post a Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            const status = statusConfig[project.status] || statusConfig.open;
            
            return (
              <Card key={project.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        <Link 
                          href={`/projects/${project.slug}`}
                          className="hover:text-primary transition-colors"
                        >
                          {project.title}
                        </Link>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Budget:</span>
                      <span className="font-medium">
                        {formatCurrency(project.budgetMin)} - {formatCurrency(project.budgetMax)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span>{project.bidCount ?? 0} bids</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>{project.viewCount ?? 0} views</span>
                    </div>
                    {project.deadline && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Due {new Date(project.deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                    {project.awardedAt && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Awarded</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/projects/${project.slug}`}>
                        View Project
                      </Link>
                    </Button>
                    {project.status === "open" && (project.bidCount ?? 0) > 0 && (
                      <Button size="sm" asChild>
                        <Link href={`/dashboard/projects/${project.id}/bids`}>
                          View Bids ({project.bidCount})
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
