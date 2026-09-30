import { NextResponse } from "next/server";
import { verifyOtpCode } from "@/lib/otpStore";

export const runtime = "nodejs";

// POST /api/auth/verify-otp -> ตรวจสอบรหัส OTP ที่ผู้ใช้กรอก
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: "กรุณาระบุอีเมลและรหัส OTP 6 หลัก" },
        { status: 400 }
      );
    }

    const res = await verifyOtpCode(email, otp);
    if (!res.success) {
      return NextResponse.json(
        { error: res.error || "รหัส OTP ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "ยืนยันอีเมลสำเร็จ",
    });
  } catch (err: any) {
    console.error("verify-otp error:", err);
    return NextResponse.json(
      { error: err.message || "เกิดข้อผิดพลาดในการตรวจสอบรหัส OTP" },
      { status: 500 }
    );
  }
}
