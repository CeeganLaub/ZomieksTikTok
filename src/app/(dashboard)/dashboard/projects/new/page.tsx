import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { requireSession } from "@/lib/auth/server";
import { getCategories } from "@/lib/services/actions";
import { NewProjectForm } from "./new-project-form";

export default async function NewProjectPage() {
  const session = await requireSession();
  
  if (!session) {
    redirect("/login?redirect=/dashboard/projects/new");
  }

  // Check if user is ID verified
  if (!session.isIdVerified) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>ID Verification Required</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">
              You must verify your identity before posting projects. This helps
              protect both you and freelancers on our platform.
            </p>
            <Button asChild>
              <Link href="/dashboard/verification">Verify Your ID</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const categories = await getCategories();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Post a New Project</h1>
        <p className="text-muted-foreground">
          Describe your project and let freelancers bid on it
        </p>
      </div>

      {categories.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Categories Available</AlertTitle>
          <AlertDescription>
            Categories need to be set up before you can post a project.
            Please contact support.
          </AlertDescription>
        </Alert>
      ) : (
        <NewProjectForm categories={categories} />
      )}
    </div>
  );
}
