// POST /api/upload -> อัปโหลดรูปภาพ
// รองรับการอัปโหลดเข้า Supabase Storage (Bucket "photos")
// และ fallback บันทึกลง local uploads/ หากยังไม่ได้ตั้งค่า Storage
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("photo");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ไม่พบไฟล์รูปภาพ" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = file.name.match(/\.[a-zA-Z0-9]+$/)?.[0] || ".jpg";
    const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;

    // 1. ลองอัปโหลดเข้า Supabase Storage Bucket "photos" ก่อน
    const supabase = getSupabase();
    if (supabase) {
      try {
        const contentType = file.type || (ext === ".png" ? "image/png" : "image/jpeg");
        const { data, error } = await supabase.storage
          .from("photos")
          .upload(filename, buf, {
            contentType,
            upsert: true,
          });

        if (!error && data) {
          const { data: pubData } = supabase.storage
            .from("photos")
            .getPublicUrl(filename);

          if (pubData?.publicUrl) {
            return NextResponse.json({
              url: pubData.publicUrl,
              filename,
              storage: "supabase",
            });
          }
        } else {
          console.warn("Supabase storage upload error, fallback to local:", error?.message);
        }
      } catch (sbErr) {
        console.warn("Supabase storage exception, fallback to local:", sbErr);
      }
    }

    // 2. Fallback บันทึกลงโฟลเดอร์ uploads/ ในเครื่อง
    const dir = path.join(process.cwd(), "uploads");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), buf);

    return NextResponse.json({
      url: `/api/uploads/${filename}`,
      filename,
      storage: "local",
    });
  } catch (err: any) {
    console.error("Upload handler error:", err);
    return NextResponse.json(
      { error: err?.message || "เกิดข้อผิดพลาดในการอัปโหลด" },
      { status: 500 }
    );
  }
}
