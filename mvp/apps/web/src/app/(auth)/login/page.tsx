"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { useAuthStore, users } from "@repo/shared";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = login(email, password);
    if (success) {
      router.push("/dashboard");
    } else {
      setError("Invalid credentials. Use one of the demo accounts below.");
    }
  };

  const quickLogin = (userEmail: string) => {
    const success = login(userEmail, "demo");
    if (success) router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl">
            <Zap className="size-6" />
          </div>
          <h1 className="text-2xl font-bold">UI/UX Standard</h1>
          <p className="text-sm text-muted-foreground">Enterprise Application Platform</p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">Sign in</Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Access Demo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Demo Quick Access</CardTitle>
            <CardDescription className="text-xs">Click to sign in as different roles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => quickLogin(u.email)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm hover:bg-accent transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <Badge variant={u.role === "superadmin" ? "default" : u.role === "admin" ? "secondary" : "outline"}>
                  {u.role}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
