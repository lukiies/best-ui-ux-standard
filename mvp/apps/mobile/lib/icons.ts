// Maps Lucide icon names (used in @repo/shared mock-data) to MaterialCommunityIcons names
export const iconMap: Record<string, string> = {
  LayoutDashboard: "view-dashboard",
  FileText: "file-document-outline",
  Users: "account-group",
  Package: "package-variant",
  Warehouse: "warehouse",
  BarChart3: "chart-bar",
  Settings: "cog",
  Shield: "shield-account",
  Banknote: "cash",
  DollarSign: "currency-usd",
  ShoppingCart: "cart",
  TrendingUp: "trending-up",
  AlertCircle: "alert-circle",
};

export function getIconName(lucideName: string): string {
  return iconMap[lucideName] ?? "help-circle";
}
