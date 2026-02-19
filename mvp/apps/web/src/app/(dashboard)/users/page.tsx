"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Shield } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { users, appModules } from "@/data/mock-data";

const roleBadge: Record<string, "default" | "secondary" | "outline"> = {
  superadmin: "default", admin: "secondary", user: "outline",
};

export default function UsersPage() {
  const { user: currentUser, canPerform } = useAuthStore();
  const canCreate = canPerform("users", "canCreate");
  const canEdit = canPerform("users", "canEdit");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="size-6" /> User Management
          </h1>
          <p className="text-muted-foreground">Manage users and their module permissions.</p>
        </div>
        {canCreate && (
          <Button><Plus className="size-4 mr-1" /> Add User</Button>
        )}
      </div>

      {/* User list */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
          <CardDescription>All registered users and their roles</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Last Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const initials = u.name.split(" ").map((n) => n[0]).join("").toUpperCase();
                const moduleCount = u.permissions.filter((p) => p.canView).length;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadge[u.role]}>{u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{u.role === "superadmin" ? "All" : `${moduleCount} modules`}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.lastLogin).toLocaleDateString("en-GB")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permission matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>Module access per user (toggle to modify — demo only)</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">Module</TableHead>
                {users.map((u) => (
                  <TableHead key={u.id} className="text-center min-w-[120px]">
                    <div className="text-xs">{u.name.split(" ")[0]}</div>
                    <Badge variant={roleBadge[u.role]} className="text-[10px]">{u.role}</Badge>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {appModules.map((mod) => (
                <TableRow key={mod.id}>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    {mod.name}
                  </TableCell>
                  {users.map((u) => {
                    const perm = u.role === "superadmin"
                      ? { canView: true }
                      : u.permissions.find((p) => p.moduleId === mod.id);
                    return (
                      <TableCell key={u.id} className="text-center">
                        <Switch
                          checked={!!perm?.canView}
                          disabled={u.role === "superadmin" || !canEdit}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
