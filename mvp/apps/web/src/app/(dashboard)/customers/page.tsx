"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function CustomersPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <Users className="size-6" /> Customers
      </h1>
      <Card>
        <CardHeader><CardTitle>Customer Database</CardTitle></CardHeader>
        <CardContent className="p-8 text-center text-muted-foreground">
          <p>Customer management module — coming in next iteration.</p>
          <p className="text-sm mt-2">This placeholder demonstrates the permission-based navigation. Only users with access to the Customers module can see this page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
