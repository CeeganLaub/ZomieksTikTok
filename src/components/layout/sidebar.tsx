"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  FolderKanban,
  ShoppingCart,
  MessageSquare,
  Users,
  Star,
  Settings,
  Shield,
  CreditCard,
  HelpCircle,
  Gavel,
  Briefcase,
} from "lucide-react";

interface SidebarProps {
  isAdmin?: boolean;
  className?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Services", href: "/dashboard/services", icon: Package },
  { label: "My Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "My Bids", href: "/dashboard/bids", icon: Gavel },
  { label: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
];

const networkNavItems: NavItem[] = [
  { label: "Favorites", href: "/dashboard/favorites", icon: Star },
  { label: "Shortlist", href: "/dashboard/shortlist", icon: Users },
  { label: "Outsourcing", href: "/dashboard/outsourcing", icon: Briefcase },
];

const settingsNavItems: NavItem[] = [
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Verification", href: "/dashboard/verification", icon: Shield },
  { label: "Subscription", href: "/dashboard/subscription", icon: CreditCard },
  { label: "Help", href: "/dashboard/help", icon: HelpCircle },
];

const adminNavItems: NavItem[] = [
  { label: "Admin Panel", href: "/admin", icon: Shield },
];

export function Sidebar({ isAdmin, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col w-64 bg-slate-900 border-r border-slate-800",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
            <span className="text-sm font-bold text-slate-900">Z</span>
          </div>
          <span className="text-xl font-bold text-white">Zomieks</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <NavSection title="Main" items={mainNavItems} pathname={pathname} />
        <NavSection
          title="Network"
          items={networkNavItems}
          pathname={pathname}
        />
        <NavSection
          title="Account"
          items={settingsNavItems}
          pathname={pathname}
        />
        {isAdmin && (
          <NavSection title="Admin" items={adminNavItems} pathname={pathname} />
        )}
      </nav>

      {/* Upgrade banner for free users */}
      <div className="p-4 m-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
        <p className="text-sm font-medium text-white mb-1">Upgrade to Pro</p>
        <p className="text-xs text-slate-400 mb-3">
          Unlimited bids, services & outsourcing
        </p>
        <Link
          href="/dashboard/subscription"
          className="block w-full text-center py-2 px-3 text-sm font-medium rounded-md bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600 transition-colors"
        >
          Upgrade Now
        </Link>
      </div>
    </aside>
  );
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="mb-6">
      <h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {title}
      </h3>
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-auto bg-emerald-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
