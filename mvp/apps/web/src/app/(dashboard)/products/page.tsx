"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function ProductsPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <Package className="size-6" /> Products
      </h1>
      <Card>
        <CardHeader><CardTitle>Product Catalog</CardTitle></CardHeader>
        <CardContent className="p-8 text-center text-muted-foreground">
          <p>Product catalog module — coming in next iteration.</p>
          <p className="text-sm mt-2">This placeholder demonstrates the modular architecture. Each module is independently accessible and permissioned.</p>
        </CardContent>
      </Card>
    </div>
  );
}
