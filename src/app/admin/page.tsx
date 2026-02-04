import { getPlatformStats } from "@/lib/admin/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  ShoppingBag, 
  DollarSign, 
  Shield,
  AlertTriangle,
  Briefcase,
  FileText,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export const runtime = "edge";

export default async function AdminDashboardPage() {
  const stats = await getPlatformStats();
  
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(cents / 100);
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and key metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} active in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedOrders} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From fees (3% + 8%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verifiedUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingVerifications} pending review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Pending Verifications */}
        {stats.pendingVerifications > 0 && (
          <Card className="border-amber-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-500" />
                Pending Verifications
              </CardTitle>
              <CardDescription>
                {stats.pendingVerifications} ID verification{stats.pendingVerifications !== 1 && "s"} waiting for review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href="/admin/verifications"
                className="text-sm text-emerald-500 hover:underline"
              >
                Review verifications →
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Active Disputes */}
        {stats.activeDisputes > 0 && (
          <Card className="border-red-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Active Disputes
              </CardTitle>
              <CardDescription>
                {stats.activeDisputes} dispute{stats.activeDisputes !== 1 && "s"} require attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href="/admin/disputes"
                className="text-sm text-emerald-500 hover:underline"
              >
                Handle disputes →
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Active Services
            </CardTitle>
            <CardDescription>
              {stats.totalServices} services listed on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/services"
              className="text-sm text-emerald-500 hover:underline"
            >
              Browse services →
            </Link>
          </CardContent>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Posted Projects
            </CardTitle>
            <CardDescription>
              {stats.totalProjects} projects posted for bidding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/projects"
              className="text-sm text-emerald-500 hover:underline"
            >
              Browse projects →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Platform Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-bold">
                {stats.totalOrders > 0 
                  ? Math.round((stats.completedOrders / stats.totalOrders) * 100) 
                  : 100}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Verification Rate</p>
              <p className="text-2xl font-bold">
                {stats.totalUsers > 0 
                  ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) 
                  : 0}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dispute Rate</p>
              <p className="text-2xl font-bold">
                {stats.totalOrders > 0 
                  ? ((stats.activeDisputes / stats.totalOrders) * 100).toFixed(1) 
                  : 0}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Revenue/Order</p>
              <p className="text-2xl font-bold">
                {stats.completedOrders > 0 
                  ? formatCurrency(stats.totalRevenue / stats.completedOrders) 
                  : formatCurrency(0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
