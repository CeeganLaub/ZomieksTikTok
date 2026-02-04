"use client";

import Link from "next/link";
import { logoutUser } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  LogOut,
  User,
  Settings,
  Shield,
  Menu,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface HeaderProps {
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
    isIdVerified: boolean;
  };
  onMenuClick?: () => void;
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleLogout() {
    await logoutUser();
  }

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-slate-400 hover:text-white"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              type="search"
              placeholder="Search services, projects, users..."
              className="w-full pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:ring-emerald-400"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Quick actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="hidden md:flex bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-slate-800 border-slate-700"
            >
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/services/new"
                  className="text-slate-200 hover:text-white focus:text-white focus:bg-slate-700"
                >
                  New Service
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/projects/new"
                  className="text-slate-200 hover:text-white focus:text-white focus:bg-slate-700"
                >
                  New Project
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <NotificationBell />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
              >
                <Avatar className="h-10 w-10 border-2 border-slate-700">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                  <AvatarFallback className="bg-slate-700 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {user.isIdVerified && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Shield className="h-2.5 w-2.5 text-white" />
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-slate-800 border-slate-700"
            >
              <DropdownMenuLabel className="text-slate-200">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/profile"
                  className="text-slate-200 hover:text-white focus:text-white focus:bg-slate-700 cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/settings"
                  className="text-slate-200 hover:text-white focus:text-white focus:bg-slate-700 cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              {!user.isIdVerified && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/verification"
                    className="text-emerald-400 hover:text-emerald-300 focus:text-emerald-300 focus:bg-slate-700 cursor-pointer"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Get Verified
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-slate-700 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
