"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <BarChart3 className="size-6" /> Reports
      </h1>
      <Card>
        <CardHeader><CardTitle>Analytics & Reporting</CardTitle></CardHeader>
        <CardContent className="p-8 text-center text-muted-foreground">
          <p>Reporting and analytics module — coming in next iteration.</p>
          <p className="text-sm mt-2">Will include charts (Recharts), data tables (TanStack Table), and export functionality.</p>
        </CardContent>
      </Card>
    </div>
  );
}
