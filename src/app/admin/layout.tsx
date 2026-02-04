import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/server";
import { createDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  AlertTriangle, 
  Folder,
  FileText,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const runtime = "edge";

const adminNavItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Verifications", href: "/admin/verifications", icon: Shield },
  { label: "Disputes", href: "/admin/disputes", icon: AlertTriangle },
  { label: "Categories", href: "/admin/categories", icon: Folder },
  { label: "Audit Logs", href: "/admin/logs", icon: FileText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  
  const { env } = await getCloudflareContext();
  const db = createDb(env.DB);
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
  
  if (!user || user.role !== "admin") {
    redirect("/dashboard");
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="p-4 border-b">
              <h1 className="text-xl font-bold text-emerald-500">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Zomieks Management</p>
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {adminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            
            {/* Footer */}
            <div className="p-4 border-t">
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="ml-64 flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
