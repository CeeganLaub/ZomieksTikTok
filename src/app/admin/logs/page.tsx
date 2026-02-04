import { getAuditLogs } from "@/lib/admin/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, User, Clock } from "lucide-react";

export const runtime = "edge";

const actionColors: Record<string, string> = {
  "user.suspend": "text-red-500",
  "user.unsuspend": "text-emerald-500",
  "verification.approve": "text-emerald-500",
  "verification.reject": "text-red-500",
  "dispute.resolve": "text-blue-500",
  "category.create": "text-emerald-500",
  "category.update": "text-amber-500",
};

export default async function AuditLogsPage() {
  const logs = await getAuditLogs(100);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAction = (action: string) => {
    return action
      .split(".")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" → ");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Audit Logs
        </h1>
        <p className="text-muted-foreground">
          Track all admin actions and changes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No audit logs yet
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDate(log.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${actionColors[log.action] || ""}`}>
                        {formatAction(log.action)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{log.actorEmail || "System"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.entityType}:{log.entityId.slice(0, 8)}...
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {log.metadata ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                          {log.metadata}
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
