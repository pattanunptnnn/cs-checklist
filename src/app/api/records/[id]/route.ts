// GET    /api/records/:id  -> อ่านใบเดียวแบบเต็ม
// PUT    /api/records/:id  -> บันทึกทับใบเดิม
// DELETE /api/records/:id  -> ลบใบ
import { NextResponse } from "next/server";
import { getRecord, saveRecord, deleteRecord } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// หมายเหตุ: ตั้งแต่ Next.js 15 เป็นต้นไป params เป็น Promise ต้อง await ก่อนใช้
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const rec = await getRecord(id);
  if (!rec) return NextResponse.json({ error: "ไม่พบใบตรวจนี้" }, { status: 404 });
  return NextResponse.json(rec);
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  await saveRecord(id, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await deleteRecord(id);
  return NextResponse.json({ ok: true });
}
