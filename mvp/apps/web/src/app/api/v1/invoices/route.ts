import { NextRequest, NextResponse } from "next/server";
import { invoices } from "@/data/mock-data";

// Demo API key validation
const VALID_API_KEYS = ["demo-key-superadmin-001", "demo-key-admin-002", "demo-key-user-003"];

function validateApiKey(request: NextRequest): { valid: boolean; error?: string } {
  const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");
  if (!apiKey) return { valid: false, error: "Missing API key. Provide x-api-key header or Bearer token." };
  if (!VALID_API_KEYS.includes(apiKey)) return { valid: false, error: "Invalid API key." };
  return { valid: true };
}

export async function GET(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  let result = [...invoices];

  if (status && status !== "all") {
    result = result.filter((i) => i.status === status);
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (i) => i.number.toLowerCase().includes(q) || i.customer.toLowerCase().includes(q)
    );
  }

  const total = result.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const data = result.slice(offset, offset + limit);

  return NextResponse.json({
    data,
    pagination: { page, limit, total, totalPages },
  });
}

export async function POST(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = await request.json();

  // Demo: just echo back with generated ID
  const newInvoice = {
    id: `inv-${Date.now()}`,
    ...body,
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({ data: newInvoice }, { status: 201 });
}
