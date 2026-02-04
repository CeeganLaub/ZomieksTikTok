// My Services list page
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/server";
import { getUserServices } from "@/lib/services/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Eye, Star, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ServiceActions } from "./service-actions";

export default async function MyServicesPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect("/login");
  }

  const services = await getUserServices();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Services</h1>
          <p className="text-slate-400 mt-1">
            Manage your service listings
          </p>
        </div>
        <Link href="/dashboard/services/new">
          <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white">
            <Plus className="mr-2 h-4 w-4" />
            New Service
          </Button>
        </Link>
      </div>

      {!session.isIdVerified && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-200">
                ID verification required
              </p>
              <p className="text-xs text-amber-300/70">
                You need to verify your identity before creating services
              </p>
            </div>
            <Link href="/dashboard/verification">
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                Get Verified
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {services.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-slate-800 p-4 mb-4">
              <ShoppingCart className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              No services yet
            </h3>
            <p className="text-slate-400 text-center max-w-sm mb-6">
              Create your first service to start receiving orders from buyers
            </p>
            <Link href="/dashboard/services/new">
              <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Create Service
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">
              {services.length} Service{services.length !== 1 ? "s" : ""}
            </CardTitle>
            <CardDescription className="text-slate-400">
              Your active and draft service listings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Service</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Price</TableHead>
                  <TableHead className="text-slate-400">Stats</TableHead>
                  <TableHead className="text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-16 bg-slate-800 rounded-lg overflow-hidden">
                          {service.thumbnailUrl ? (
                            <img
                              src={service.thumbnailUrl}
                              alt={service.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-600">
                              <ShoppingCart className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white line-clamp-1">
                            {service.title}
                          </p>
                          <p className="text-sm text-slate-400">
                            {service.deliveryDays} day delivery
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={service.status} isActive={service.isActive} />
                    </TableCell>
                    <TableCell>
                      <div className="text-white font-medium">
                        {formatCurrency(service.pricingTiers.basic.price / 100)}
                      </div>
                      <div className="text-xs text-slate-400">starting</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Eye className="h-4 w-4" />
                          <span>{service.viewCount}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <ShoppingCart className="h-4 w-4" />
                          <span>{service.orderCount}</span>
                        </div>
                        {service.averageRating && (
                          <div className="flex items-center gap-1 text-amber-400">
                            <Star className="h-4 w-4 fill-current" />
                            <span>{service.averageRating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <ServiceActions service={service} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status, isActive }: { status: string; isActive: boolean }) {
  if (!isActive) {
    return (
      <Badge variant="secondary" className="bg-slate-700 text-slate-300">
        Paused
      </Badge>
    );
  }

  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
          Active
        </Badge>
      );
    case "pending_review":
      return (
        <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">
          Pending Review
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="secondary" className="bg-slate-700 text-slate-300">
          Draft
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30">
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="bg-slate-700 text-slate-300">
          {status}
        </Badge>
      );
  }
}
