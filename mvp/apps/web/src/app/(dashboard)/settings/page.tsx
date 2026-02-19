"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { settings, appModules } from "@/data/mock-data";
import type { Setting } from "@/lib/types";

function SettingControl({ setting }: { setting: Setting }) {
  const [value, setValue] = useState(setting.value);

  switch (setting.type) {
    case "toggle":
      return (
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">{setting.label}</Label>
            <p className="text-xs text-muted-foreground">{setting.description}</p>
          </div>
          <Switch checked={value as boolean} onCheckedChange={(v) => setValue(v)} />
        </div>
      );
    case "text":
      return (
        <div className="rounded-lg border p-4 space-y-2">
          <Label className="text-sm font-medium">{setting.label}</Label>
          <p className="text-xs text-muted-foreground">{setting.description}</p>
          <Input value={value as string} onChange={(e) => setValue(e.target.value)} />
        </div>
      );
    case "number":
      return (
        <div className="rounded-lg border p-4 space-y-2">
          <Label className="text-sm font-medium">{setting.label}</Label>
          <p className="text-xs text-muted-foreground">{setting.description}</p>
          <Input type="number" value={value as number} onChange={(e) => setValue(Number(e.target.value))} className="w-32" />
        </div>
      );
    case "select":
      return (
        <div className="rounded-lg border p-4 space-y-2">
          <Label className="text-sm font-medium">{setting.label}</Label>
          <p className="text-xs text-muted-foreground">{setting.description}</p>
          <Select value={value as string} onValueChange={(v) => setValue(v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {setting.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
  }
}

export default function SettingsPage() {
  const { hasModuleAccess } = useAuthStore();
  const [search, setSearch] = useState("");

  // Only show settings for modules user has access to
  const visibleSettings = useMemo(() => {
    return settings.filter((s) => {
      const hasAccess = hasModuleAccess(s.moduleId);
      const matchSearch =
        search === "" ||
        s.label.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase());
      return hasAccess && matchSearch;
    });
  }, [search, hasModuleAccess]);

  // Group by module
  const groupedByModule = useMemo(() => {
    const groups: Record<string, Setting[]> = {};
    for (const s of visibleSettings) {
      if (!groups[s.moduleId]) groups[s.moduleId] = [];
      groups[s.moduleId].push(s);
    }
    return groups;
  }, [visibleSettings]);

  const moduleIds = Object.keys(groupedByModule);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your application. Only modules you have access to are shown.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search settings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {moduleIds.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No settings found matching your search.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={moduleIds[0]} className="space-y-4">
          <TabsList>
            {moduleIds.map((id) => {
              const mod = appModules.find((m) => m.id === id);
              return <TabsTrigger key={id} value={id}>{mod?.name || id}</TabsTrigger>;
            })}
          </TabsList>
          {moduleIds.map((id) => {
            const mod = appModules.find((m) => m.id === id);
            const moduleSettings = groupedByModule[id];
            // Group by category within module
            const categories: Record<string, Setting[]> = {};
            for (const s of moduleSettings) {
              if (!categories[s.category]) categories[s.category] = [];
              categories[s.category].push(s);
            }
            return (
              <TabsContent key={id} value={id} className="space-y-6">
                {Object.entries(categories).map(([cat, items]) => (
                  <Card key={cat}>
                    <CardHeader>
                      <CardTitle className="text-lg">{mod?.name} — {cat}</CardTitle>
                      <CardDescription>{items.length} setting{items.length !== 1 ? "s" : ""}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {items.map((s) => (
                        <SettingControl key={s.id} setting={s} />
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
