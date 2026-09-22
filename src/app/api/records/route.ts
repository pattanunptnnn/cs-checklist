// GET  /api/records     -> รายการใบทั้งหมด (สรุป)
// POST /api/records     -> สร้างใบใหม่ (คืน id)
import { NextResponse } from "next/server";
import { listRecords, createRecord } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await listRecords();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = await createRecord(body);
  return NextResponse.json({ id }, { status: 201 });
}
