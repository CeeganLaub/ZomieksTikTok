"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Edit, Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toggleServiceStatus, deleteService } from "@/lib/services/actions";

interface ServiceActionsProps {
  service: {
    id: string;
    slug: string;
    title: string;
    isActive: boolean;
  };
}

export function ServiceActions({ service }: ServiceActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  async function handleToggle() {
    setIsToggling(true);
    try {
      await toggleServiceStatus(service.id);
      router.refresh();
    } finally {
      setIsToggling(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteService(service.id);
      if (result.success) {
        setShowDeleteDialog(false);
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
          <DropdownMenuItem asChild>
            <Link
              href={`/services/${service.slug}`}
              target="_blank"
              className="text-slate-200 hover:text-white focus:text-white focus:bg-slate-700 cursor-pointer"
            >
              <Eye className="mr-2 h-4 w-4" />
              View
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={`/dashboard/services/${service.id}/edit`}
              className="text-slate-200 hover:text-white focus:text-white focus:bg-slate-700 cursor-pointer"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleToggle}
            disabled={isToggling}
            className="text-slate-200 hover:text-white focus:text-white focus:bg-slate-700 cursor-pointer"
          >
            {service.isActive ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Activate
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-700" />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-slate-700 cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Service</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete &quot;{service.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              className="text-slate-300 hover:text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
