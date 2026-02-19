"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Maximize2, Minimize2, X, Plus, Download, FileText, Calendar, Building2 } from "lucide-react";
import { invoices } from "@/data/mock-data";
import { useAuthStore } from "@/stores/auth-store";
import type { Invoice } from "@/lib/types";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default", sent: "secondary", overdue: "destructive", draft: "outline", cancelled: "outline",
};

function InvoiceDetail({ invoice, expanded, onToggleExpand, onClose }: {
  invoice: Invoice; expanded: boolean; onToggleExpand: () => void; onClose: () => void;
}) {
  const fmt = (n: number) => n.toLocaleString("pl-PL", { style: "currency", currency: invoice.currency });

  return (
    <div className="flex flex-col h-full">
      {/* Detail header */}
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="size-5" />
            {invoice.number}
          </h2>
          <p className="text-sm text-muted-foreground">{invoice.customer}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onToggleExpand} title={expanded ? "Minimize" : "Maximize"}>
            {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Detail content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Status & dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={statusColors[invoice.status]}>{invoice.status.toUpperCase()}</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Currency</p>
              <p className="text-sm font-medium">{invoice.currency}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="size-3" /> Issue Date</p>
              <p className="text-sm font-medium">{invoice.date}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="size-3" /> Due Date</p>
              <p className="text-sm font-medium">{invoice.dueDate}</p>
            </div>
          </div>

          <Separator />

          {/* Customer info */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-1"><Building2 className="size-4" /> Customer</h3>
            <div className="rounded-lg border p-3">
              <p className="font-medium">{invoice.customer}</p>
              <p className="text-sm text-muted-foreground">Tax ID: {invoice.customerTaxId}</p>
            </div>
          </div>

          <Separator />

          {/* Line items */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Line Items</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{fmt(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{item.vatRate}%</TableCell>
                    <TableCell className="text-right font-medium">{fmt(item.grossAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Net Total</span>
              <span>{fmt(invoice.netTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT Total</span>
              <span>{fmt(invoice.vatTotal)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Gross Total</span>
              <span>{fmt(invoice.grossTotal)}</span>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Notes</h3>
              <p className="text-sm text-muted-foreground rounded-lg border p-3">{invoice.notes}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function InvoicesPage() {
  const { canPerform } = useAuthStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailExpanded, setDetailExpanded] = useState(false);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.number.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  const selected = selectedId ? invoices.find((i) => i.id === selectedId) : null;
  const canCreate = canPerform("invoices", "canCreate");
  const canExport = canPerform("invoices", "canExport");

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Master (list) — hidden when detail is expanded */}
      {!detailExpanded && (
        <div className={`flex flex-col ${selected ? "w-1/2 border-r" : "w-full"} transition-all duration-200`}>
          {/* Toolbar */}
          <div className="flex items-center gap-2 border-b p-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {canExport && (
              <Button variant="outline" size="icon" title="Export">
                <Download className="size-4" />
              </Button>
            )}
            {canCreate && (
              <Button>
                <Plus className="size-4 mr-1" /> New Invoice
              </Button>
            )}
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {filtered.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => setSelectedId(inv.id)}
                  className={`flex w-full items-center justify-between p-4 text-left text-sm hover:bg-accent transition-colors ${
                    selectedId === inv.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-medium">{inv.number}</div>
                    <div className="text-xs text-muted-foreground">{inv.customer}</div>
                    <div className="text-xs text-muted-foreground">{inv.date}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-semibold">
                      {inv.grossTotal.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                    </span>
                    <Badge variant={statusColors[inv.status]} className="text-xs">
                      {inv.status}
                    </Badge>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No invoices found matching your criteria.
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t p-3 text-xs text-muted-foreground">
            {filtered.length} invoice{filtered.length !== 1 ? "s" : ""} found
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className={`flex flex-col ${detailExpanded ? "w-full" : "w-1/2"} transition-all duration-200`}>
          <InvoiceDetail
            invoice={selected}
            expanded={detailExpanded}
            onToggleExpand={() => setDetailExpanded(!detailExpanded)}
            onClose={() => { setSelectedId(null); setDetailExpanded(false); }}
          />
        </div>
      )}
    </div>
  );
}
