// Dashboard home page
import { getServerSession } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Package,
  FolderKanban,
  ShoppingCart,
  MessageSquare,
  ArrowUpRight,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  // TODO: Fetch real stats from database
  const stats = {
    totalEarnings: 0,
    activeOrders: 0,
    pendingProjects: 0,
    unreadMessages: 0,
  };

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Welcome back, {session.name.split(" ")[0]}!
          </h1>
          <p className="text-slate-400 mt-1">
            Here's what's happening with your account today.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/services/new">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Package className="mr-2 h-4 w-4" />
              New Service
            </Button>
          </Link>
          <Link href="/dashboard/projects/new">
            <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white">
              <FolderKanban className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Verification alerts */}
      {!session.isEmailVerified && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-200">
                Please verify your email address
              </p>
              <p className="text-xs text-amber-300/70">
                Check your inbox for the verification link
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-500/50 text-amber-300 hover:bg-amber-500/20"
            >
              Resend
            </Button>
          </CardContent>
        </Card>
      )}

      {!session.isIdVerified && session.isEmailVerified && (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="flex items-center gap-4 py-4">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-200">
                Get verified to start bidding and selling
              </p>
              <p className="text-xs text-emerald-300/70">
                Upload your ID to unlock all features
              </p>
            </div>
            <Link href="/dashboard/verification">
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Get Verified
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Earnings"
          value={`R ${stats.totalEarnings.toLocaleString()}`}
          description="All time revenue"
          icon={TrendingUp}
          trend="+12% from last month"
        />
        <StatsCard
          title="Active Orders"
          value={stats.activeOrders.toString()}
          description="Orders in progress"
          icon={ShoppingCart}
        />
        <StatsCard
          title="Pending Projects"
          value={stats.pendingProjects.toString()}
          description="Awaiting bids"
          icon={FolderKanban}
        />
        <StatsCard
          title="Unread Messages"
          value={stats.unreadMessages.toString()}
          description="New messages"
          icon={MessageSquare}
        />
      </div>

      {/* Quick actions and recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Recent Orders</CardTitle>
              <CardDescription className="text-slate-400">
                Your latest transactions
              </CardDescription>
            </div>
            <Link href="/dashboard/orders">
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-400 hover:text-emerald-300"
              >
                View all
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8 text-slate-500">
              <div className="text-center">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No orders yet</p>
                <p className="text-xs mt-1">
                  Create a service to start receiving orders
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Bids */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Active Bids</CardTitle>
              <CardDescription className="text-slate-400">
                Projects you've bid on
              </CardDescription>
            </div>
            <Link href="/browse/projects">
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-400 hover:text-emerald-300"
              >
                Browse projects
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8 text-slate-500">
              <div className="text-center">
                <FolderKanban className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active bids</p>
                <p className="text-xs mt-1">
                  Browse projects and submit proposals
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Free tier limits */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-400" />
            Your Free Tier Usage
          </CardTitle>
          <CardDescription className="text-slate-400">
            Upgrade to unlock unlimited features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <UsageBar label="Bids Used" used={0} total={5} />
            <UsageBar label="Services Created" used={0} total={1} />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-300">
                Outsourcing
              </span>
              <Badge
                variant="secondary"
                className="w-fit mt-2 bg-slate-800 text-slate-400"
              >
                Upgrade Required
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
}) {
  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-slate-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
        {trend && (
          <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function UsageBar({
  label,
  used,
  total,
}: {
  label: string;
  used: number;
  total: number;
}) {
  const percentage = (used / total) * 100;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="text-sm text-slate-400">
          {used} / {total}
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
