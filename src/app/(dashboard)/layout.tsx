// Dashboard layout with sidebar and header
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = session.role === "admin" || session.role === "moderator";

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar isAdmin={isAdmin} />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={{
            name: session.name,
            email: session.email,
            avatarUrl: null, // TODO: Get from profile
            isIdVerified: session.isIdVerified,
          }}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
