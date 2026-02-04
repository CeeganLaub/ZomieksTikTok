// New Service Page
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/server";
import { getCategories } from "@/lib/services/actions";
import { NewServiceForm } from "./new-service-form";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export default async function NewServicePage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect("/login");
  }

  // Must be ID verified to create services
  if (!session.isIdVerified) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-amber-500/20 p-4 mb-4">
              <Shield className="h-8 w-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Verification Required
            </h2>
            <p className="text-slate-400 text-center max-w-md mb-6">
              You need to verify your identity before you can create services. 
              This helps build trust with buyers on the platform.
            </p>
            <Link href="/dashboard/verification">
              <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white">
                <Shield className="mr-2 h-4 w-4" />
                Get Verified
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = await getCategories();

  // If no categories exist, show message
  if (categories.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h2 className="text-xl font-bold text-white mb-2">
              Categories Not Set Up
            </h2>
            <p className="text-slate-400 text-center max-w-md">
              Service categories haven&apos;t been configured yet. Please check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <NewServiceForm categories={categories} />;
}
