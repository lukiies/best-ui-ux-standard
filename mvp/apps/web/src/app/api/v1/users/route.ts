import { NextRequest, NextResponse } from "next/server";
import { users } from "@/data/mock-data";

const VALID_API_KEYS = ["demo-key-superadmin-001", "demo-key-admin-002"];

function validateApiKey(request: NextRequest): { valid: boolean; error?: string } {
  const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");
  if (!apiKey) return { valid: false, error: "Missing API key." };
  if (!VALID_API_KEYS.includes(apiKey)) return { valid: false, error: "Insufficient permissions. Admin or SuperAdmin API key required." };
  return { valid: true };
}

export async function GET(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const safeUsers = users.map(({ id, email, name, role, permissions, lastLogin }) => ({
    id, email, name, role,
    moduleCount: permissions.filter((p) => p.canView).length,
    lastLogin,
  }));

  return NextResponse.json({ data: safeUsers });
}
