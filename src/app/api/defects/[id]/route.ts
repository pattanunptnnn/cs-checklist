import { NextResponse } from "next/server";
import { getWeeklyRecord, saveWeeklyRecord, deleteWeeklyRecord } from "@/lib/defectStore";
import type { WeeklyDefectRecord } from "@/lib/types";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/defects/[id]
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const rec = await getWeeklyRecord(id);
  if (!rec) {
    return NextResponse.json({ error: "ไม่พบใบตรวจ Defect นี้" }, { status: 404 });
  }
  return NextResponse.json(rec);
}

// PUT /api/defects/[id]
export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json()) as WeeklyDefectRecord;
  if (!body || body.id !== id) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  await saveWeeklyRecord(body);
  return NextResponse.json({ ok: true });
}

// DELETE /api/defects/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await deleteWeeklyRecord(id);
  return NextResponse.json({ ok: true });
}
