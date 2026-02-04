"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createProject } from "@/lib/projects/actions";
import type { Category } from "@/lib/db/schema";

interface NewProjectFormProps {
  categories: Category[];
}

export function NewProjectForm({ categories }: NewProjectFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [budgetType, setBudgetType] = useState<"fixed" | "hourly">("fixed");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deadline, setDeadline] = useState("");
  const [expectedDuration, setExpectedDuration] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !skills.includes(skill) && skills.length < 10) {
      setSkills([...skills, skill]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation
    if (!title.trim()) {
      setError("Title is required");
      setIsLoading(false);
      return;
    }

    if (!categoryId) {
      setError("Category is required");
      setIsLoading(false);
      return;
    }

    if (!description.trim() || description.trim().length < 50) {
      setError("Description must be at least 50 characters");
      setIsLoading(false);
      return;
    }

    const minBudget = parseFloat(budgetMin);
    const maxBudget = parseFloat(budgetMax);

    if (isNaN(minBudget) || minBudget <= 0) {
      setError("Minimum budget must be greater than 0");
      setIsLoading(false);
      return;
    }

    if (isNaN(maxBudget) || maxBudget < minBudget) {
      setError("Maximum budget must be greater than or equal to minimum");
      setIsLoading(false);
      return;
    }

    const result = await createProject({
      title: title.trim(),
      categoryId,
      description: description.trim(),
      budgetType,
      budgetMin: minBudget,
      budgetMax: maxBudget,
      deadline: deadline || undefined,
      expectedDuration: expectedDuration || undefined,
      skills: skills.length > 0 ? skills : undefined,
    });

    if (result.success) {
      router.push("/dashboard/projects");
    } else {
      setError(result.error || "Failed to create project");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/15 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build a React e-commerce website"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Project Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project in detail. Include goals, requirements, deliverables, and any specific instructions..."
              rows={6}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/5000 characters (minimum 50)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Budget Type *</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={budgetType === "fixed" ? "default" : "outline"}
                onClick={() => setBudgetType("fixed")}
              >
                Fixed Price
              </Button>
              <Button
                type="button"
                variant={budgetType === "hourly" ? "default" : "outline"}
                onClick={() => setBudgetType("hourly")}
              >
                Hourly Rate
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budgetMin">
                {budgetType === "fixed" ? "Minimum Budget (ZAR)" : "Min Hourly Rate (ZAR)"} *
              </Label>
              <Input
                id="budgetMin"
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="e.g. 1000"
                min="1"
                step="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgetMax">
                {budgetType === "fixed" ? "Maximum Budget (ZAR)" : "Max Hourly Rate (ZAR)"} *
              </Label>
              <Input
                id="budgetMax"
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="e.g. 5000"
                min="1"
                step="1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline & Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline (Optional)</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Expected Duration (Optional)</Label>
              <Select value={expectedDuration} onValueChange={setExpectedDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="less_than_week">Less than a week</SelectItem>
                  <SelectItem value="1_2_weeks">1-2 weeks</SelectItem>
                  <SelectItem value="2_4_weeks">2-4 weeks</SelectItem>
                  <SelectItem value="1_3_months">1-3 months</SelectItem>
                  <SelectItem value="3_6_months">3-6 months</SelectItem>
                  <SelectItem value="more_than_6_months">More than 6 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Required Skills (Optional)</Label>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="e.g. React, Node.js, PostgreSQL"
                maxLength={50}
              />
              <Button type="button" variant="outline" onClick={addSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Add up to 10 skills ({10 - skills.length} remaining)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Post Project
        </Button>
      </div>
    </form>
  );
}
