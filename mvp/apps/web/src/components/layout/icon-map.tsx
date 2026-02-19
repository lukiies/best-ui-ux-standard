"use client";

import {
  LayoutDashboard, FileText, Users, Package, Warehouse, BarChart3,
  Settings, Shield, Banknote, type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, FileText, Users, Package, Warehouse, BarChart3,
  Settings, Shield, Banknote,
};

export function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon className={className} />;
}
