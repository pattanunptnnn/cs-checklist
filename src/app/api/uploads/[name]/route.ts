// GET /api/uploads/:name  -> เสิร์ฟไฟล์รูปที่อัปโหลดไว้ในโฟลเดอร์ uploads/
// (ทำเป็น route เอง เพราะ next start ไม่เสิร์ฟไฟล์ที่เขียนลง public ตอน runtime)
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif",
};

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const safe = path.basename(name); // กัน path traversal
  const file = path.join(process.cwd(), "uploads", safe);
  try {
    const buf = await fs.readFile(file);
    const ext = (safe.match(/\.[a-zA-Z0-9]+$/)?.[0] || "").toLowerCase();
    const type = TYPES[ext] || "application/octet-stream";
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return NextResponse.json({ error: "ไม่พบรูป" }, { status: 404 });
  }
}
