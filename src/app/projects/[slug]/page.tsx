import { notFound } from "next/navigation";
import Link from "next/link";
import { 
  Clock, 
  DollarSign, 
  Calendar, 
  Eye, 
  MessageSquare,
  User,
  ArrowLeft,
  Share2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getProjectBySlug } from "@/lib/projects/actions";
import { getServerSession } from "@/lib/auth/server";
import { formatCurrency } from "@/lib/utils";
import { BidForm } from "./bid-form";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Open for Bids", color: "bg-green-500" },
  in_progress: { label: "In Progress", color: "bg-blue-500" },
  completed: { label: "Completed", color: "bg-gray-500" },
  cancelled: { label: "Cancelled", color: "bg-red-500" },
};

const durationLabels: Record<string, string> = {
  less_than_week: "Less than a week",
  "1_2_weeks": "1-2 weeks",
  "2_4_weeks": "2-4 weeks",
  "1_3_months": "1-3 months",
  "3_6_months": "3-6 months",
  more_than_6_months: "More than 6 months",
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  const session = await getServerSession();

  if (!project) {
    notFound();
  }

  const status = statusConfig[project.status] || statusConfig.open;
  const isOwner = session?.userId === project.buyerId;
  const canBid = session && !isOwner && project.status === "open";
  const needsVerification = session && !session.isIdVerified;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/browse/projects">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Project Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Status */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-2xl font-bold">{project.title}</h1>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${status.color}`} />
                  <span className="text-sm font-medium">{status.label}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>Posted {new Date(project.createdAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {project.viewCount ?? 0} views
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {project.bidCount ?? 0} bids
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h2 className="font-semibold mb-3">Project Description</h2>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {project.description.split("\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Skills */}
            {project.skills && project.skills.length > 0 && (
              <div>
                <h2 className="font-semibold mb-3">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {project.skills.map((skill: string) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Owner Actions */}
            {isOwner && (
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      This is your project
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/projects/${project.id}/edit`}>
                          Edit Project
                        </Link>
                      </Button>
                      {(project.bidCount ?? 0) > 0 && (
                        <Button size="sm" asChild>
                          <Link href={`/dashboard/projects/${project.id}/bids`}>
                            View Bids ({project.bidCount})
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bid Form */}
            {!session && project.status === "open" && (
              <Card>
                <CardContent className="py-6 text-center">
                  <p className="mb-4">Sign in to submit a bid on this project</p>
                  <Button asChild>
                    <Link href={`/login?redirect=/projects/${slug}`}>
                      Sign In to Bid
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {needsVerification && !isOwner && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>ID Verification Required</AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="mb-4">
                    You must verify your identity before bidding on projects.
                  </p>
                  <Button size="sm" asChild>
                    <Link href="/dashboard/verification">Verify Your ID</Link>
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {canBid && !needsVerification && (
              <BidForm
                projectId={project.id}
                budgetMin={project.budgetMin}
                budgetMax={project.budgetMax}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Budget Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(project.budgetMin)} - {formatCurrency(project.budgetMax)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {project.budgetType === "hourly" ? "Per Hour" : "Fixed Price"}
                  </p>
                </div>
                
                {project.deadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Due: {new Date(project.deadline).toLocaleDateString()}</span>
                  </div>
                )}
                
                {project.expectedDuration && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{durationLabels[project.expectedDuration] || project.expectedDuration}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  About the Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Verified Client</p>
                    <p className="text-sm text-muted-foreground">
                      Member since {new Date(project.createdAt).getFullYear()}
                    </p>
                  </div>
                </div>
                {/* TODO: Add client stats like completed projects, ratings */}
              </CardContent>
            </Card>

            {/* Share */}
            <Card>
              <CardContent className="py-4">
                <Button variant="outline" className="w-full" size="sm">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share This Project
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
