"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { addToShortlist, isInShortlist, getCategories } from "@/lib/shortlist/actions";

interface AddToShortlistButtonProps {
  userId: string;
  userName?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function AddToShortlistButton({
  userId,
  userName,
  variant = "outline",
  size = "sm",
  showLabel = true,
}: AddToShortlistButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const checkStatus = async () => {
      setChecking(true);
      const [inList, cats] = await Promise.all([
        isInShortlist(userId),
        getCategories(),
      ]);
      setIsShortlisted(inList);
      setCategories(cats.map(c => ({ id: c.id, name: c.name })));
      setChecking(false);
    };
    checkStatus();
  }, [userId]);

  const handleAdd = async () => {
    setLoading(true);
    const result = await addToShortlist(
      userId,
      selectedCategory || undefined,
      notes || undefined
    );
    setLoading(false);

    if (result.success) {
      setIsShortlisted(true);
      setOpen(false);
      router.refresh();
    } else {
      // Could show error toast here
      console.error(result.error);
    }
  };

  if (checking) {
    return (
      <Button variant={variant} size={size} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (isShortlisted) {
    return (
      <Button variant="secondary" size={size} disabled>
        <UserCheck className="h-4 w-4" />
        {showLabel && <span className="ml-2">Shortlisted</span>}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <UserPlus className="h-4 w-4" />
          {showLabel && <span className="ml-2">Add to Shortlist</span>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Shortlist</DialogTitle>
          <DialogDescription>
            Add {userName || "this freelancer"} to your outsourcing shortlist.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Category (optional)</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No category</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Organize freelancers by their specialty
            </p>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add private notes about this freelancer..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Add to Shortlist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
