import Link from "next/link";
import { Search, Clock, MessageSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOpenProjects } from "@/lib/projects/actions";
import { formatCurrency } from "@/lib/utils";

export default async function BrowseProjectsPage() {
  const projects = await getOpenProjects();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">Browse Projects</h1>
          <p className="text-muted-foreground mb-6">
            Find projects that match your skills and start bidding
          </p>
          
          <div className="flex gap-4 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="pl-9"
              />
            </div>
            <Button>Search</Button>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""} available
          </p>
          {/* TODO: Add sorting/filtering */}
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No open projects at the moment. Check back soon!
              </p>
              <Button variant="outline" asChild>
                <Link href="/">Go Home</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => {
              const skills = project.skills ? JSON.parse(project.skills) : [];
              
              return (
                <Card key={project.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
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
                      <div className="text-right shrink-0">
                        <p className="font-bold">
                          {formatCurrency(project.budgetMin)} - {formatCurrency(project.budgetMax)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {project.budgetType === "hourly" ? "Per Hour" : "Fixed"}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {skills.slice(0, 5).map((skill: string) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {skills.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{skills.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Posted {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {project.bidCount ?? 0} bids
                      </div>
                      {project.deadline && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Due {new Date(project.deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4">
                      <Button size="sm" asChild>
                        <Link href={`/projects/${project.slug}`}>
                          View & Bid
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
