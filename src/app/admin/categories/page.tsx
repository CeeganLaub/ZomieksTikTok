"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Folder, 
  Plus, 
  Edit,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { getCategories, createCategory, updateCategory } from "@/lib/admin/actions";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  icon: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "",
    isActive: true,
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    const result = await getCategories();
    setCategories(result as Category[]);
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setFormData({ name: "", slug: "", description: "", icon: "", isActive: true });
    setEditCategory(null);
    setDialog("create");
  };

  const handleOpenEdit = (category: Category) => {
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      icon: category.icon || "",
      isActive: category.isActive,
    });
    setEditCategory(category);
    setDialog("edit");
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: dialog === "create" ? generateSlug(name) : prev.slug,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) return;

    setActionLoading(true);

    if (dialog === "create") {
      await createCategory({
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || undefined,
        icon: formData.icon.trim() || undefined,
      });
    } else if (dialog === "edit" && editCategory) {
      await updateCategory(editCategory.id, {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || undefined,
        icon: formData.icon.trim() || undefined,
        isActive: formData.isActive,
      });
    }

    setActionLoading(false);
    setDialog(null);
    loadCategories();
  };

  const handleToggleActive = async (category: Category) => {
    await updateCategory(category.id, { isActive: !category.isActive });
    loadCategories();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Folder className="h-8 w-8" />
            Categories
          </h1>
          <p className="text-muted-foreground">
            Manage service and project categories
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No categories yet. Create your first category.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {category.icon && <span>{category.icon}</span>}
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {category.slug}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {category.description || "—"}
                    </TableCell>
                    <TableCell>
                      {category.isActive ? (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(category)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(category)}
                        >
                          {category.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={!!dialog} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "create" ? "Add Category" : "Edit Category"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "create" 
                ? "Create a new category for services and projects." 
                : "Update category details."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="e.g., Web Development"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input
                placeholder="web-development"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier. Auto-generated from name.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of this category..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Icon (Emoji)</Label>
              <Input
                placeholder="💻"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                maxLength={4}
              />
            </div>

            {dialog === "edit" && (
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={actionLoading || !formData.name.trim() || !formData.slug.trim()}
            >
              {actionLoading 
                ? "Saving..." 
                : dialog === "create" 
                  ? "Create Category" 
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
