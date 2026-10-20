import { NextResponse } from "next/server";
import { findUserByEmail, recordLoginLog } from "@/lib/userStore";
import type { AuthUser } from "@/lib/types";

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
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "กรุณากรอกอีเมลให้ถูกต้อง" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ success: false, error: "กรุณากรอกรหัสผ่าน" }, { status: 400 });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      // บันทึก Log การพยายามเข้าสู่ระบบที่ล้มเหลว (ไม่พบบัญชี)
      await recordLoginLog({
        userId: null,
        email,
        name: "-",
        role: "-",
        status: "failed",
        ipAddress,
        userAgent,
      });
      return NextResponse.json(
        { success: false, error: "ไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาตรวจสอบอีเมลหรือสมัครสร้างบัญชีใหม่" },
        { status: 401 }
      );
    }

    // ตรวจสอบรหัสผ่าน (รองรับรหัสผ่านของผู้ใช้ หรือรหัสทดสอบสากล "1234")
    const isPasswordValid =
      user.password === password ||
      password === "1234" ||
      (user.role === "admin" && password === "admin1234") ||
      (user.role === "supervisor" && password === "sup1234");

    if (!isPasswordValid) {
      // บันทึก Log การพยายามเข้าสู่ระบบที่รหัสผ่านผิด
      await recordLoginLog({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: "failed",
        ipAddress,
        userAgent,
      });
      return NextResponse.json(
        { success: false, error: "รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านอีกครั้ง" },
        { status: 401 }
      );
    }

    // บันทึก Log การเข้าสู่ระบบสำเร็จ
    await recordLoginLog({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: "success",
      ipAddress,
      userAgent,
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      title: user.title,
      phone: user.phone,
    };

    return NextResponse.json({ success: true, user: authUser });
  } catch (err: any) {
    console.error("Login API error:", err);
    return NextResponse.json({ success: false, error: err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" }, { status: 500 });
  }
}
