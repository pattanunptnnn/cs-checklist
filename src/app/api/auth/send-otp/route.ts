import { NextResponse } from "next/server";
import { createOtp } from "@/lib/otpStore";

export const runtime = "nodejs";

// POST /api/auth/send-otp -> ขอรับรหัส OTP สำหรับยืนยันตัวตนทางอีเมล
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "กรุณาระบุรูปแบบอีเมลให้ถูกต้อง" },
        { status: 400 }
      );
    }

    const { otp, expiresAt, supabaseTriggered } = await createOtp(email);

    return NextResponse.json({
      success: true,
      email: email.trim().toLowerCase(),
      expiresAt,
      supabaseTriggered,
      // ส่ง demoOtp เผื่อใช้กับบัญชีตัวอย่าง Big-C 7 ท่านที่ไม่มี mailbox จริง
      demoOtp: otp,
    });
  } catch (err: any) {
    console.error("send-otp error:", err);
    return NextResponse.json(
      { error: err.message || "เกิดข้อผิดพลาดในการส่งรหัส OTP" },
      { status: 500 }
    );
  }
}
