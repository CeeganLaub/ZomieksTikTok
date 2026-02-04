"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { createService, type PricingTier } from "@/lib/services/actions";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface NewServiceFormProps {
  categories: Category[];
}

const defaultTier: PricingTier = {
  name: "Basic",
  price: 50000, // R500 in cents
  deliveryDays: 3,
  description: "",
  features: [],
};

export function NewServiceForm({ categories }: NewServiceFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [maxRevisions, setMaxRevisions] = useState(2);
  
  // Pricing tiers
  const [basicTier, setBasicTier] = useState<PricingTier>({ ...defaultTier });
  const [hasStandardTier, setHasStandardTier] = useState(false);
  const [standardTier, setStandardTier] = useState<PricingTier>({
    ...defaultTier,
    name: "Standard",
    price: 100000,
    deliveryDays: 5,
  });
  const [hasPremiumTier, setHasPremiumTier] = useState(false);
  const [premiumTier, setPremiumTier] = useState<PricingTier>({
    ...defaultTier,
    name: "Premium",
    price: 200000,
    deliveryDays: 7,
  });

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  }

  function removeTag(tagToRemove: string) {
    setTags(tags.filter((t) => t !== tagToRemove));
  }

  function updateTierFeature(
    tier: "basic" | "standard" | "premium",
    index: number,
    value: string
  ) {
    if (tier === "basic") {
      const features = [...basicTier.features];
      features[index] = value;
      setBasicTier({ ...basicTier, features });
    } else if (tier === "standard") {
      const features = [...standardTier.features];
      features[index] = value;
      setStandardTier({ ...standardTier, features });
    } else {
      const features = [...premiumTier.features];
      features[index] = value;
      setPremiumTier({ ...premiumTier, features });
    }
  }

  function addTierFeature(tier: "basic" | "standard" | "premium") {
    if (tier === "basic" && basicTier.features.length < 5) {
      setBasicTier({ ...basicTier, features: [...basicTier.features, ""] });
    } else if (tier === "standard" && standardTier.features.length < 5) {
      setStandardTier({ ...standardTier, features: [...standardTier.features, ""] });
    } else if (tier === "premium" && premiumTier.features.length < 5) {
      setPremiumTier({ ...premiumTier, features: [...premiumTier.features, ""] });
    }
  }

  function removeTierFeature(tier: "basic" | "standard" | "premium", index: number) {
    if (tier === "basic") {
      setBasicTier({ ...basicTier, features: basicTier.features.filter((_, i) => i !== index) });
    } else if (tier === "standard") {
      setStandardTier({ ...standardTier, features: standardTier.features.filter((_, i) => i !== index) });
    } else {
      setPremiumTier({ ...premiumTier, features: premiumTier.features.filter((_, i) => i !== index) });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await createService({
        title,
        categoryId,
        description,
        shortDescription: shortDescription || undefined,
        basicTier: {
          ...basicTier,
          features: basicTier.features.filter((f) => f.trim()),
        },
        standardTier: hasStandardTier
          ? {
              ...standardTier,
              features: standardTier.features.filter((f) => f.trim()),
            }
          : undefined,
        premiumTier: hasPremiumTier
          ? {
              ...premiumTier,
              features: premiumTier.features.filter((f) => f.trim()),
            }
          : undefined,
        tags: tags.length > 0 ? tags : undefined,
        maxRevisions,
      });

      if (result.success) {
        router.push("/dashboard/services");
      } else {
        setError(result.error || "Failed to create service");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/services">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Create New Service</h1>
          <p className="text-slate-400">List a service for buyers to purchase</p>
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Service"
          )}
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Basic Information</CardTitle>
          <CardDescription className="text-slate-400">
            Describe your service to attract buyers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-200">
              Service Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="I will design a modern logo for your business"
              required
              maxLength={80}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-500">{title.length}/80 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-slate-200">
              Category
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {categories.map((cat) => (
                  <SelectItem
                    key={cat.id}
                    value={cat.id}
                    className="text-slate-200 focus:text-white focus:bg-slate-700"
                  >
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortDescription" className="text-slate-200">
              Short Description
            </Label>
            <Input
              id="shortDescription"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="A brief summary of your service"
              maxLength={150}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-200">
              Full Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your service in detail. What will the buyer receive? What's your process?"
              required
              rows={6}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200">Tags</Label>
            <div className="flex items-center gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add a tag and press Enter"
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addTag}
                className="border-slate-700 text-slate-300"
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 text-slate-300 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500">Up to 5 tags</p>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Tiers */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Pricing</CardTitle>
          <CardDescription className="text-slate-400">
            Set up your pricing packages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Tier */}
          <PricingTierForm
            tier="basic"
            tierData={basicTier}
            setTierData={setBasicTier}
            updateFeature={(i, v) => updateTierFeature("basic", i, v)}
            addFeature={() => addTierFeature("basic")}
            removeFeature={(i) => removeTierFeature("basic", i)}
          />

          {/* Standard Tier Toggle */}
          <div className="flex items-center justify-between py-4 border-t border-slate-800">
            <div>
              <p className="font-medium text-white">Standard Package</p>
              <p className="text-sm text-slate-400">Add a mid-tier option</p>
            </div>
            <Switch
              checked={hasStandardTier}
              onCheckedChange={setHasStandardTier}
            />
          </div>
          {hasStandardTier && (
            <PricingTierForm
              tier="standard"
              tierData={standardTier}
              setTierData={setStandardTier}
              updateFeature={(i, v) => updateTierFeature("standard", i, v)}
              addFeature={() => addTierFeature("standard")}
              removeFeature={(i) => removeTierFeature("standard", i)}
            />
          )}

          {/* Premium Tier Toggle */}
          <div className="flex items-center justify-between py-4 border-t border-slate-800">
            <div>
              <p className="font-medium text-white">Premium Package</p>
              <p className="text-sm text-slate-400">Add a high-tier option</p>
            </div>
            <Switch
              checked={hasPremiumTier}
              onCheckedChange={setHasPremiumTier}
            />
          </div>
          {hasPremiumTier && (
            <PricingTierForm
              tier="premium"
              tierData={premiumTier}
              setTierData={setPremiumTier}
              updateFeature={(i, v) => updateTierFeature("premium", i, v)}
              addFeature={() => addTierFeature("premium")}
              removeFeature={(i) => removeTierFeature("premium", i)}
            />
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="revisions" className="text-slate-200">
              Max Revisions
            </Label>
            <Select
              value={maxRevisions.toString()}
              onValueChange={(v) => setMaxRevisions(parseInt(v))}
            >
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {[0, 1, 2, 3, 5, 10].map((n) => (
                  <SelectItem
                    key={n}
                    value={n.toString()}
                    className="text-slate-200 focus:text-white focus:bg-slate-700"
                  >
                    {n === 0 ? "No revisions" : n === 10 ? "Unlimited" : `${n} revision${n > 1 ? "s" : ""}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function PricingTierForm({
  tier,
  tierData,
  setTierData,
  updateFeature,
  addFeature,
  removeFeature,
}: {
  tier: "basic" | "standard" | "premium";
  tierData: PricingTier;
  setTierData: (data: PricingTier) => void;
  updateFeature: (index: number, value: string) => void;
  addFeature: () => void;
  removeFeature: (index: number) => void;
}) {
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const tierColor =
    tier === "basic"
      ? "emerald"
      : tier === "standard"
      ? "blue"
      : "purple";

  return (
    <div className={`p-4 rounded-lg border border-${tierColor}-500/20 bg-${tierColor}-500/5`}>
      <h4 className="font-medium text-white mb-4">{tierLabel} Package</h4>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-slate-300">Package Name</Label>
          <Input
            value={tierData.name}
            onChange={(e) => setTierData({ ...tierData, name: e.target.value })}
            className="bg-slate-800/50 border-slate-700 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">Price (ZAR)</Label>
          <Input
            type="number"
            min={100}
            step={100}
            value={tierData.price / 100}
            onChange={(e) =>
              setTierData({ ...tierData, price: parseFloat(e.target.value) * 100 })
            }
            className="bg-slate-800/50 border-slate-700 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">Delivery Days</Label>
          <Input
            type="number"
            min={1}
            max={90}
            value={tierData.deliveryDays}
            onChange={(e) =>
              setTierData({ ...tierData, deliveryDays: parseInt(e.target.value) })
            }
            className="bg-slate-800/50 border-slate-700 text-white"
          />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Label className="text-slate-300">Description</Label>
        <Input
          value={tierData.description}
          onChange={(e) => setTierData({ ...tierData, description: e.target.value })}
          placeholder="What's included in this package"
          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>
      <div className="mt-4 space-y-2">
        <Label className="text-slate-300">Features</Label>
        {tierData.features.map((feature, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={feature}
              onChange={(e) => updateFeature(i, e.target.value)}
              placeholder="Feature included"
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeFeature(i)}
              className="text-slate-400 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {tierData.features.length < 5 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addFeature}
            className="text-slate-400 hover:text-white"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Feature
          </Button>
        )}
      </div>
    </div>
  );
}
