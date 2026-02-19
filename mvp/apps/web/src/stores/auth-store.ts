import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Permission } from "@/lib/types";
import { users } from "@/data/mock-data";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  switchUser: (userId: string) => void;
  hasModuleAccess: (moduleId: string) => boolean;
  getPermission: (moduleId: string) => Permission | undefined;
  canPerform: (moduleId: string, action: keyof Permission) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: (email: string, _password: string) => {
        const found = users.find((u) => u.email === email);
        if (found) {
          set({ user: found, isAuthenticated: true });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      switchUser: (userId: string) => {
        const found = users.find((u) => u.id === userId);
        if (found) {
          set({ user: found, isAuthenticated: true });
        }
      },

      hasModuleAccess: (moduleId: string) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === "superadmin") return true;
        return user.permissions.some((p) => p.moduleId === moduleId && p.canView);
      },

      getPermission: (moduleId: string) => {
        const { user } = get();
        if (!user) return undefined;
        if (user.role === "superadmin") {
          return {
            moduleId, canView: true, canCreate: true, canEdit: true,
            canDelete: true, canExport: true, canManageUsers: true,
          };
        }
        return user.permissions.find((p) => p.moduleId === moduleId);
      },

      canPerform: (moduleId: string, action: keyof Permission) => {
        const perm = get().getPermission(moduleId);
        if (!perm) return false;
        return perm[action] as boolean;
      },
    }),
    { name: "auth-storage" }
  )
);
