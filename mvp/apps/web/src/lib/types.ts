// ============================================================================
// Core Types — UI/UX Standard MVP
// These types define the permission system and data structures
// ============================================================================

export type UserRole = "superadmin" | "admin" | "user";

export interface Permission {
  moduleId: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canManageUsers: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  permissions: Permission[];
  createdAt: string;
  lastLogin: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  href?: string;
  moduleId?: string;
  children?: MenuItem[];
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  customer: string;
  customerTaxId: string;
  items: InvoiceItem[];
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  currency: string;
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

export interface AppModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "finance" | "warehouse" | "reporting" | "system";
}

export interface Setting {
  id: string;
  moduleId: string;
  category: string;
  label: string;
  description: string;
  type: "toggle" | "text" | "select" | "number";
  value: string | boolean | number;
  options?: string[];
}
