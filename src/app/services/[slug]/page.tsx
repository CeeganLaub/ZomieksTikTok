// Public service detail page
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServiceBySlug } from "@/lib/services/actions";
import { getServerSession } from "@/lib/auth/server";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Star,
  Clock,
  RefreshCw,
  Shield,
  CheckCircle,
  MessageSquare,
  Heart,
  Share2,
  Eye,
  ShoppingCart,
} from "lucide-react";

interface ServicePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  const session = await getServerSession();
  const isOwner = session?.userId === service.sellerId;

  const pricingTiers = service.pricingTiers as {
    basic: { name: string; price: number; deliveryDays: number; description: string; features: string[] };
    standard?: { name: string; price: number; deliveryDays: number; description: string; features: string[] };
    premium?: { name: string; price: number; deliveryDays: number; description: string; features: string[] };
  };

  const availableTiers = [
    { key: "basic", ...pricingTiers.basic },
    ...(pricingTiers.standard ? [{ key: "standard", ...pricingTiers.standard }] : []),
    ...(pricingTiers.premium ? [{ key: "premium", ...pricingTiers.premium }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                <span className="text-sm font-bold text-slate-900">Z</span>
              </div>
              <span className="text-xl font-bold text-white">Zomieks</span>
            </Link>
            <div className="flex items-center gap-4">
              {session ? (
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-slate-300 hover:text-white">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="text-slate-300 hover:text-white">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Section */}
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <Link href="/browse" className="hover:text-white">
                  Services
                </Link>
                <span>/</span>
                <span>Category</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {service.title}
              </h1>
              <div className="flex items-center flex-wrap gap-4 mt-4">
                {/* Seller info */}
                <Link href="#" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-slate-700 text-white text-xs">
                      U
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-slate-300 hover:text-white">
                    Seller Name
                  </span>
                  <Shield className="h-4 w-4 text-emerald-400" />
                </Link>
                {service.averageRating && (
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-medium">{service.averageRating.toFixed(1)}</span>
                    <span className="text-slate-400">({service.reviewCount})</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-slate-400">
                  <ShoppingCart className="h-4 w-4" />
                  <span>{service.orderCount} orders</span>
                </div>
              </div>
            </div>

            {/* Image Gallery */}
            <Card className="border-slate-800 bg-slate-900/50 overflow-hidden">
              <div className="aspect-video bg-slate-800 flex items-center justify-center">
                {service.thumbnailUrl ? (
                  <img
                    src={service.thumbnailUrl}
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingCart className="h-16 w-16 text-slate-600" />
                )}
              </div>
            </Card>

            {/* Description */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">About This Service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert prose-slate max-w-none">
                  <p className="text-slate-300 whitespace-pre-wrap">
                    {service.description}
                  </p>
                </div>
                {service.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-6">
                    {service.tags.map((tag: string) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-slate-800 text-slate-300"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Reviews</CardTitle>
                <CardDescription className="text-slate-400">
                  What buyers are saying
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8 text-slate-500">
                  <div className="text-center">
                    <Star className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No reviews yet</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Pricing */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <Card className="border-slate-800 bg-slate-900/50">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="w-full bg-slate-800/50 p-1">
                    {availableTiers.map((tier) => (
                      <TabsTrigger
                        key={tier.key}
                        value={tier.key}
                        className="flex-1 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
                      >
                        {tier.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {availableTiers.map((tier) => (
                    <TabsContent key={tier.key} value={tier.key} className="mt-0">
                      <CardContent className="pt-6">
                        <div className="flex items-baseline justify-between mb-4">
                          <span className="text-3xl font-bold text-white">
                            {formatCurrency(tier.price / 100)}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm mb-4">
                          {tier.description || `${tier.name} package`}
                        </p>
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Clock className="h-4 w-4 text-slate-500" />
                            <span>{tier.deliveryDays} day delivery</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <RefreshCw className="h-4 w-4 text-slate-500" />
                            <span>{service.maxRevisions} revisions</span>
                          </div>
                        </div>
                        {tier.features?.length > 0 && (
                          <div className="space-y-2 mb-6">
                            {tier.features.map((feature: string, i: number) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 text-sm text-slate-300"
                              >
                                <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {isOwner ? (
                          <Link href={`/dashboard/services/${service.id}/edit`}>
                            <Button
                              variant="outline"
                              className="w-full border-slate-700 text-slate-300"
                            >
                              Edit Service
                            </Button>
                          </Link>
                        ) : (
                          <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white">
                            Continue ({formatCurrency(tier.price / 100)})
                          </Button>
                        )}
                      </CardContent>
                    </TabsContent>
                  ))}
                </Tabs>
              </Card>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="border-slate-700 text-slate-400 hover:text-white"
                >
                  <Heart className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-slate-700 text-slate-400 hover:text-white"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-slate-700 text-slate-300"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Contact Seller
                </Button>
              </div>

              {/* Stats */}
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Eye className="h-4 w-4" />
                    <span>{service.viewCount} people viewed this service</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
