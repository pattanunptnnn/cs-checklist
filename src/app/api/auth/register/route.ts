import { NextResponse } from "next/server";
import { createUser, recordLoginLog } from "@/lib/userStore";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

export async function POST(req: Request) {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || "-";

  try {
    const body = await req.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const role = (body.role || "pm") as UserRole;
    const title = body.title ? String(body.title).trim() : undefined;
    const phone = body.phone ? String(body.phone).trim() : undefined;

    if (!name) {
      return NextResponse.json({ success: false, error: "กรุณากรอกชื่อ - นามสกุล" }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "กรุณากรอกรูปแบบอีเมลให้ถูกต้อง" }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ success: false, error: "รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร" }, { status: 400 });
    }
    if (!["admin", "pm", "supervisor"].includes(role)) {
      return NextResponse.json({ success: false, error: "กรุณาเลือกบทบาทหน้าที่ในระบบ" }, { status: 400 });
    }

    const result = await createUser({
      name,
      email,
      password,
      role,
      title,
      phone,
    });

    if (!result.success || !result.user) {
      return NextResponse.json({ success: false, error: result.error || "สร้างบัญชีไม่สำเร็จ" }, { status: 400 });
    }

    // บันทึก Log การลงทะเบียนและล็อกอินเข้าใช้งานครั้งแรก
    await recordLoginLog({
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      status: "success",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, user: result.user }, { status: 201 });
  } catch (err: any) {
    console.error("Register API error:", err);
    return NextResponse.json({ success: false, error: err.message || "เกิดข้อผิดพลาดในการลงทะเบียน" }, { status: 500 });
  }
}
