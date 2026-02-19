import { NextRequest, NextResponse } from "next/server";
import { users } from "@/data/mock-data";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password } = body;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = users.find((u) => u.email === email);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Demo: return user info + mock API key
  const apiKeyMap: Record<string, string> = {
    superadmin: "demo-key-superadmin-001",
    admin: "demo-key-admin-002",
    user: "demo-key-user-003",
  };

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
    },
    apiKey: apiKeyMap[user.role],
    expiresIn: "24h",
  });
}
