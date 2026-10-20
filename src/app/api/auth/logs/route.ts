import { NextResponse } from "next/server";
import { listLoginLogs } from "@/lib/userStore";

export const runtime = "nodejs";

// GET /api/auth/logs -> อ่านประวัติการเข้าสู่ระบบล่าสุด
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const logs = await listLoginLogs(limit);
    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to list logs" }, { status: 500 });
  }
}
