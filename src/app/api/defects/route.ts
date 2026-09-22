import { NextResponse } from "next/server";
import { listWeeklyRecords, createWeeklyRecord } from "@/lib/defectStore";

export const runtime = "nodejs";

// GET /api/defects -> ดึงรายการสรุปรอบตรวจ Defect ทั้งหมด
export async function GET() {
  try {
    const list = await listWeeklyRecords();
    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list defects" }, { status: 500 });
  }
}

// POST /api/defects -> สร้างรอบตรวจ Defect ใหม่
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await createWeeklyRecord(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create defect record" }, { status: 500 });
  }
}
