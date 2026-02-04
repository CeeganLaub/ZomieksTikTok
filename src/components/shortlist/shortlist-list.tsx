"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Trash2, 
  Edit, 
  Send, 
  Filter,
  Search,
  UserPlus,
} from "lucide-react";
import { removeFromShortlist, updateShortlistEntry } from "@/lib/shortlist/actions";
import type { ShortlistEntry } from "@/lib/shortlist/actions";

interface ShortlistListProps {
  entries: ShortlistEntry[];
  categories: Array<{ id: string; name: string }>;
}

export function ShortlistList({ entries, categories }: ShortlistListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editEntry, setEditEntry] = useState<ShortlistEntry | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editCategory, setEditCategory] = useState<string>("");

  const filteredEntries = entries.filter((entry) => {
    const matchesFilter = filter === "all" || entry.categoryId === filter;
    const matchesSearch = 
      !search ||
      entry.user.name?.toLowerCase().includes(search.toLowerCase()) ||
      entry.user.email.toLowerCase().includes(search.toLowerCase()) ||
      entry.profile?.skills?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this user from your shortlist?")) return;
    
    setLoading(id);
    const result = await removeFromShortlist(id);
    setLoading(null);
    
    if (result.success) {
      router.refresh();
    }
  };

  const handleEdit = (entry: ShortlistEntry) => {
    setEditEntry(entry);
    setEditNotes(entry.notes || "");
    setEditCategory(entry.categoryId || "");
  };

  const handleSaveEdit = async () => {
    if (!editEntry) return;

    setLoading(editEntry.id);
    const result = await updateShortlistEntry(editEntry.id, {
      notes: editNotes,
      categoryId: editCategory || null,
    });
    setLoading(null);
    setEditEntry(null);

    if (result.success) {
      router.refresh();
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const parseSkills = (skills: string | null): string[] => {
    if (!skills) return [];
    try {
      const parsed = JSON.parse(skills);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return skills.split(",").map((s) => s.trim()).filter(Boolean);
    }
  };

  if (entries.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Your shortlist is empty</h3>
          <p className="text-muted-foreground text-center max-w-sm mb-4">
            Add freelancers to your shortlist to quickly outsource work to them later.
          </p>
          <Button onClick={() => router.push("/explore")}>
            <UserPlus className="w-4 h-4 mr-2" />
            Find Freelancers
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-50">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filteredEntries.length} of {entries.length} freelancers</span>
        {filter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>
            Clear filter
          </Button>
        )}
      </div>

      {/* List */}
      <div className="grid gap-4">
        {filteredEntries.map((entry) => (
          <Card key={entry.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={entry.user.avatar || undefined} />
                  <AvatarFallback>
                    {getInitials(entry.user.name, entry.user.email)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold truncate">
                        {entry.user.name || entry.user.email}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {entry.user.email}
                      </p>
                    </div>
                    {entry.category && (
                      <Badge variant="secondary">{entry.category.name}</Badge>
                    )}
                  </div>

                  {entry.profile?.bio && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {entry.profile.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-2">
                    {parseSkills(entry.profile?.skills ?? null).slice(0, 5).map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {entry.profile?.hourlyRate && (
                      <Badge variant="outline" className="text-xs">
                        R{entry.profile.hourlyRate}/hr
                      </Badge>
                    )}
                  </div>

                  {entry.notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      Notes: {entry.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(entry)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/dashboard/messages?user=${entry.shortlistedUserId}`)}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRemove(entry.id)}
                    disabled={loading === entry.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Search className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No matching freelancers found</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shortlist Entry</DialogTitle>
            <DialogDescription>
              Update notes and category for {editEntry?.user.name || editEntry?.user.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add private notes about this freelancer..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntry(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={loading === editEntry?.id}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
