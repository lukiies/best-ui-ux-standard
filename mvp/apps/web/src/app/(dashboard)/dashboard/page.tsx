"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Package, TrendingUp, DollarSign, ShoppingCart, AlertCircle } from "lucide-react";
import { useAuthStore, invoices } from "@repo/shared";

const stats = [
  { label: "Total Invoices", value: "50", change: "+12%", icon: FileText, moduleId: "invoices" },
  { label: "Revenue (PLN)", value: "847,320", change: "+8.2%", icon: DollarSign, moduleId: "invoices" },
  { label: "Customers", value: "128", change: "+3", icon: Users, moduleId: "customers" },
  { label: "Products", value: "456", change: "+15", icon: Package, moduleId: "products" },
  { label: "Orders Today", value: "23", change: "+5", icon: ShoppingCart, moduleId: "warehouse" },
  { label: "Growth Rate", value: "18.3%", change: "+2.1%", icon: TrendingUp, moduleId: "reports" },
];

export default function DashboardPage() {
  const { user, hasModuleAccess } = useAuthStore();

  const recentInvoices = invoices.slice(0, 8);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const paidTotal = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.grossTotal, 0);

  const visibleStats = stats.filter((s) => hasModuleAccess(s.moduleId));

  return (
    <div className="p-6 space-y-6">
      {/* Welcome banner */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening across your modules today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleStats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">{stat.change} from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts + Recent invoices */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alerts */}
        {hasModuleAccess("invoices") && overdueCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="size-5 text-destructive" />
                Attention Required
              </CardTitle>
              <CardDescription>Items that need your action</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{overdueCount} overdue invoices</p>
                  <p className="text-xs text-muted-foreground">Require follow-up with customers</p>
                </div>
                <Badge variant="destructive">Overdue</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Paid this month</p>
                  <p className="text-xs text-muted-foreground">
                    {paidTotal.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                  </p>
                </div>
                <Badge variant="secondary">Collected</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent invoices */}
        {hasModuleAccess("invoices") && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Last 8 invoices in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                    <div>
                      <span className="font-medium">{inv.number}</span>
                      <span className="text-muted-foreground ml-2">{inv.customer}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {inv.grossTotal.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                      </span>
                      <Badge
                        variant={
                          inv.status === "paid" ? "default" :
                          inv.status === "overdue" ? "destructive" :
                          inv.status === "sent" ? "secondary" : "outline"
                        }
                        className="text-xs"
                      >
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
