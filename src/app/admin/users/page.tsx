"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Shield, 
  Ban, 
  CheckCircle,
  Star,
  MoreHorizontal,
} from "lucide-react";
import { getUsers, suspendUser, unsuspendUser } from "@/lib/admin/actions";
import type { UserListItem } from "@/lib/admin/actions";

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [filter, setFilter] = useState<"all" | "verified" | "suspended" | "admin">(
    (searchParams.get("filter") as never) || "all"
  );
  const [page, setPage] = useState(1);
  
  const [suspendDialog, setSuspendDialog] = useState<UserListItem | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [search, filter, page]);

  const loadUsers = async () => {
    setLoading(true);
    const result = await getUsers({ search, filter, page, limit: 25 });
    setUsers(result.users);
    setTotal(result.total);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleSuspend = async () => {
    if (!suspendDialog || !suspendReason) return;
    
    setActionLoading(true);
    const result = await suspendUser(suspendDialog.id, suspendReason);
    setActionLoading(false);
    
    if (result.success) {
      setSuspendDialog(null);
      setSuspendReason("");
      loadUsers();
    }
  };

  const handleUnsuspend = async (userId: string) => {
    if (!confirm("Are you sure you want to unsuspend this user?")) return;
    
    setActionLoading(true);
    await unsuspendUser(userId);
    setActionLoading(false);
    loadUsers();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">Manage platform users</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>
            
            <Select value={filter} onValueChange={(v) => { setFilter(v as typeof filter); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {total} User{total !== 1 && "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name || "No name"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.role === "admin" && (
                          <Badge variant="default">Admin</Badge>
                        )}
                        {user.isIdVerified && (
                          <Badge variant="outline" className="text-blue-500 border-blue-500">
                            <Shield className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {user.isSuspended && (
                          <Badge variant="destructive">
                            <Ban className="w-3 h-3 mr-1" />
                            Suspended
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.orderCount}</TableCell>
                    <TableCell>
                      {user.avgRating ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span>{user.avgRating.toFixed(1)}</span>
                          <span className="text-muted-foreground">({user.reviewCount})</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      {user.role !== "admin" && (
                        user.isSuspended ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnsuspend(user.id)}
                            disabled={actionLoading}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Unsuspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => setSuspendDialog(user)}
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Suspend
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {total > 25 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm">
                Page {page} of {Math.ceil(total / 25)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(total / 25)}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspend Dialog */}
      <Dialog open={!!suspendDialog} onOpenChange={() => setSuspendDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Suspend {suspendDialog?.email}. They will be notified and unable to use the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for suspension..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={actionLoading || !suspendReason.trim()}
            >
              {actionLoading ? "Suspending..." : "Suspend User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
