import type { User, Invoice, InvoiceItem, AppModule, Setting, MenuItem } from "./types";

// ============================================================================
// Application Modules
// ============================================================================

export const appModules: AppModule[] = [
  { id: "dashboard", name: "Dashboard", description: "Overview and KPIs", icon: "LayoutDashboard", category: "system" },
  { id: "invoices", name: "Invoices", description: "Invoice management", icon: "FileText", category: "finance" },
  { id: "customers", name: "Customers", description: "Customer database", icon: "Users", category: "finance" },
  { id: "products", name: "Products", description: "Product catalog", icon: "Package", category: "warehouse" },
  { id: "warehouse", name: "Warehouse", description: "Stock management", icon: "Warehouse", category: "warehouse" },
  { id: "reports", name: "Reports", description: "Analytics and reports", icon: "BarChart3", category: "reporting" },
  { id: "settings", name: "Settings", description: "System configuration", icon: "Settings", category: "system" },
  { id: "users", name: "User Management", description: "Users and permissions", icon: "Shield", category: "system" },
];

// ============================================================================
// Menu Structure
// ============================================================================

export const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard", href: "/dashboard", moduleId: "dashboard" },
  {
    id: "finance", label: "Finance", icon: "Banknote",
    children: [
      { id: "invoices", label: "Invoices", icon: "FileText", href: "/invoices", moduleId: "invoices" },
      { id: "customers", label: "Customers", icon: "Users", href: "/customers", moduleId: "customers" },
    ],
  },
  {
    id: "warehouse-menu", label: "Warehouse", icon: "Package",
    children: [
      { id: "products", label: "Products", icon: "Package", href: "/products", moduleId: "products" },
      { id: "warehouse", label: "Stock", icon: "Warehouse", href: "/warehouse", moduleId: "warehouse" },
    ],
  },
  { id: "reports", label: "Reports", icon: "BarChart3", href: "/reports", moduleId: "reports" },
  { id: "settings", label: "Settings", icon: "Settings", href: "/settings", moduleId: "settings" },
  { id: "users", label: "Users", icon: "Shield", href: "/users", moduleId: "users" },
];

// ============================================================================
// Users with Permissions
// ============================================================================

const allPermissions = appModules.map((m) => ({
  moduleId: m.id,
  canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true, canManageUsers: true,
}));

const adminPermissions = appModules
  .filter((m) => !["users"].includes(m.id))
  .map((m) => ({
    moduleId: m.id,
    canView: true, canCreate: true, canEdit: true, canDelete: m.id !== "settings", canExport: true, canManageUsers: false,
  }));

const userPermissions = ["dashboard", "invoices", "customers", "products", "reports"].map((id) => ({
  moduleId: id,
  canView: true, canCreate: id !== "dashboard" && id !== "reports", canEdit: id !== "dashboard" && id !== "reports",
  canDelete: false, canExport: id === "reports", canManageUsers: false,
}));

export const users: User[] = [
  {
    id: "1", email: "superadmin@company.com", name: "Super Administrator", role: "superadmin",
    avatar: undefined, permissions: allPermissions,
    createdAt: "2024-01-01T00:00:00Z", lastLogin: "2026-02-19T08:00:00Z",
  },
  {
    id: "2", email: "admin@company.com", name: "Anna Kowalska", role: "admin",
    avatar: undefined, permissions: adminPermissions,
    createdAt: "2024-06-15T00:00:00Z", lastLogin: "2026-02-18T14:30:00Z",
  },
  {
    id: "3", email: "user@company.com", name: "Jan Nowak", role: "user",
    avatar: undefined, permissions: userPermissions,
    createdAt: "2025-01-10T00:00:00Z", lastLogin: "2026-02-19T09:15:00Z",
  },
];

// ============================================================================
// Sample Invoices
// ============================================================================

function makeItems(count: number): InvoiceItem[] {
  const products = [
    "Web Development Services", "UI/UX Design", "Cloud Hosting (Annual)", "SSL Certificate",
    "Database Optimization", "API Integration", "Mobile App Module", "Technical Support (Monthly)",
    "Security Audit", "Performance Optimization", "Custom Report Module", "Training Session",
  ];
  return Array.from({ length: count }, (_, i) => {
    const qty = Math.floor(Math.random() * 10) + 1;
    const price = Math.round((Math.random() * 5000 + 100) * 100) / 100;
    const net = Math.round(qty * price * 100) / 100;
    const vat = Math.round(net * 0.23 * 100) / 100;
    return {
      id: `item-${i + 1}`,
      name: products[i % products.length],
      quantity: qty,
      unit: "svc",
      unitPrice: price,
      vatRate: 23,
      netAmount: net,
      vatAmount: vat,
      grossAmount: Math.round((net + vat) * 100) / 100,
    };
  });
}

export const invoices: Invoice[] = Array.from({ length: 50 }, (_, i) => {
  const num = i + 1;
  const statuses: Invoice["status"][] = ["draft", "sent", "paid", "overdue", "cancelled"];
  const customers = [
    "ITAnalytics Ltd", "TechCorp Sp. z o.o.", "Digital Solutions SA", "CloudBase Inc.",
    "DataStream Sp. z o.o.", "NetBridge SA", "SoftVision Ltd", "CodeFactory Sp. z o.o.",
  ];
  const items = makeItems(Math.floor(Math.random() * 4) + 1);
  const net = items.reduce((s, it) => s + it.netAmount, 0);
  const vat = items.reduce((s, it) => s + it.vatAmount, 0);
  return {
    id: `inv-${num}`,
    number: `FV/${2026}/${String(num).padStart(4, "0")}`,
    date: `2026-${String(Math.floor(Math.random() * 2) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
    dueDate: `2026-${String(Math.floor(Math.random() * 2) + 2).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
    customer: customers[i % customers.length],
    customerTaxId: `PL${String(1000000000 + i * 111111)}`,
    items,
    netTotal: Math.round(net * 100) / 100,
    vatTotal: Math.round(vat * 100) / 100,
    grossTotal: Math.round((net + vat) * 100) / 100,
    status: statuses[i % statuses.length],
    currency: "PLN",
    notes: i % 3 === 0 ? "Payment within 14 days." : undefined,
  };
});

// ============================================================================
// Settings
// ============================================================================

export const settings: Setting[] = [
  { id: "s1", moduleId: "invoices", category: "General", label: "Auto-numbering", description: "Automatically number new invoices", type: "toggle", value: true },
  { id: "s2", moduleId: "invoices", category: "General", label: "Default currency", description: "Currency for new invoices", type: "select", value: "PLN", options: ["PLN", "EUR", "USD", "GBP"] },
  { id: "s3", moduleId: "invoices", category: "General", label: "Default VAT rate", description: "Default VAT rate percentage", type: "number", value: 23 },
  { id: "s4", moduleId: "invoices", category: "PDF", label: "Company logo on PDF", description: "Show company logo on printed invoices", type: "toggle", value: true },
  { id: "s5", moduleId: "invoices", category: "PDF", label: "Footer text", description: "Custom text in invoice footer", type: "text", value: "Thank you for your business." },
  { id: "s6", moduleId: "customers", category: "General", label: "Require Tax ID", description: "Tax ID is mandatory for new customers", type: "toggle", value: false },
  { id: "s7", moduleId: "warehouse", category: "General", label: "Low stock alert", description: "Alert threshold for low stock items", type: "number", value: 10 },
  { id: "s8", moduleId: "warehouse", category: "General", label: "Auto-reorder", description: "Automatically create purchase orders for low stock", type: "toggle", value: false },
  { id: "s9", moduleId: "reports", category: "General", label: "Default date range", description: "Default period for reports", type: "select", value: "This month", options: ["Today", "This week", "This month", "This quarter", "This year"] },
  { id: "s10", moduleId: "reports", category: "Export", label: "Include charts in export", description: "Include chart images in PDF/Excel exports", type: "toggle", value: true },
  { id: "s11", moduleId: "settings", category: "Appearance", label: "Sidebar collapsed by default", description: "Start with collapsed sidebar", type: "toggle", value: false },
  { id: "s12", moduleId: "settings", category: "Appearance", label: "Compact mode", description: "Use denser spacing for more content", type: "toggle", value: false },
  { id: "s13", moduleId: "settings", category: "Security", label: "Session timeout (minutes)", description: "Auto-logout after inactivity", type: "number", value: 30 },
  { id: "s14", moduleId: "settings", category: "Security", label: "Two-factor authentication", description: "Require 2FA for all users", type: "toggle", value: false },
  { id: "s15", moduleId: "users", category: "General", label: "Allow self-registration", description: "Users can create their own accounts", type: "toggle", value: false },
  { id: "s16", moduleId: "users", category: "General", label: "Default role", description: "Role assigned to new users", type: "select", value: "user", options: ["user", "admin"] },
];
