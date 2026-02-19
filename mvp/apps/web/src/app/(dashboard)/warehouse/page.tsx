"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse } from "lucide-react";

export default function WarehousePage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <Warehouse className="size-6" /> Warehouse
      </h1>
      <Card>
        <CardHeader><CardTitle>Stock Management</CardTitle></CardHeader>
        <CardContent className="p-8 text-center text-muted-foreground">
          <p>Warehouse/stock management module — coming in next iteration.</p>
        </CardContent>
      </Card>
    </div>
  );
}
