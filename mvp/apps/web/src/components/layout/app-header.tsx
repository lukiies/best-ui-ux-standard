"use client";

import { useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Moon, Sun, User, ArrowRightLeft } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useTheme } from "next-themes";
import { users } from "@/data/mock-data";

const roleBadge: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  superadmin: { label: "Super Admin", variant: "default" },
  admin: { label: "Admin", variant: "secondary" },
  user: { label: "User", variant: "outline" },
};

export function AppHeader() {
  const router = useRouter();
  const { user, logout, switchUser } = useAuthStore();
  const { theme, setTheme } = useTheme();

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const badge = roleBadge[user.role];

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <div className="flex-1" />

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent transition-colors">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start text-sm">
              <span className="font-medium leading-none">{user.name}</span>
              <Badge variant={badge.variant} className="mt-1 text-[10px] px-1.5 py-0">
                {badge.label}
              </Badge>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{user.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            <ArrowRightLeft className="size-3 inline mr-1" /> Switch User (Demo)
          </DropdownMenuLabel>
          {users.map((u) => (
            <DropdownMenuItem
              key={u.id}
              onClick={() => switchUser(u.id)}
              className={u.id === user.id ? "bg-accent" : ""}
            >
              <User className="size-4 mr-2" />
              <div className="flex flex-col">
                <span className="text-sm">{u.name}</span>
                <span className="text-xs text-muted-foreground">{u.role}</span>
              </div>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { logout(); router.push("/login"); }}>
            <LogOut className="size-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
