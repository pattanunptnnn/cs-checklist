"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getRoleBadgeInfo, BIGC_PMS, getRegisteredUsers } from "@/lib/auth";
import type { UserRole, AuthUser } from "@/lib/types";
import {
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  Briefcase,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  LogIn,
  KeyRound,
  ArrowLeft,
  RefreshCw,
  Send,
  Check,
  Zap,
} from "lucide-react";

type AuthMode = "signin" | "signup" | "verify";

export default function LoginPage() {
  const router = useRouter();
  const { register, setAuthenticatedUser, user: currentUser } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [verifyAction, setVerifyAction] = useState<"login" | "signup">("login");

  // State สำหรับ Sign In (รองรับ Passwordless OTP เข้าสู่ระบบด้วยอีเมลใดก็ได้)
  const [signInEmail, setSignInEmail] = useState("");

  // State สำหรับ Sign Up
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [signUpRole, setSignUpRole] = useState<UserRole>("pm");
  const [signUpTitle, setSignUpTitle] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");

  // State สำหรับ Email Verification (OTP)
  const [targetEmail, setTargetEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [supabaseTriggered, setSupabaseTriggered] = useState(false);
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [pendingSignUpData, setPendingSignUpData] = useState<{
    name: string;
    email: string;
    password: string;
    role: UserRole;
    title?: string;
    phone?: string;
  } | null>(null);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ตัวนับเวลาถอยหลังสำหรับการขอส่งรหัส OTP ใหม่ (60 วินาที)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ฟังก์ชันขอส่งรหัส OTP ทางอีเมล
  async function requestOtp(email: string): Promise<{ success: boolean; demoOtp?: string; supabaseTriggered?: boolean; error?: string }> {
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "ส่งรหัส OTP ไม่สำเร็จ" };
      }
      return {
        success: true,
        demoOtp: data.demoOtp,
        supabaseTriggered: data.supabaseTriggered,
      };
    } catch {
      return { success: false, error: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์" };
    }
  }

  // 1. จัดการการเข้าสู่ระบบ (Sign In) — เข้าได้ด้วยอีเมลใดก็ได้ โดยขอรหัส OTP ยืนยัน
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const email = signInEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setErrorMsg("กรุณากรอกรูปแบบอีเมลให้ถูกต้อง เช่น yourname@example.com");
      return;
    }

    // ค้นหาผู้ใช้จากฐานข้อมูล หรือสร้าง Profile อัตโนมัติสำหรับอีเมลนี้
    const existingUsers = getRegisteredUsers();
    let userToAuth: AuthUser;

    const found = existingUsers.find((u) => u.email.toLowerCase() === email);
    if (found) {
      userToAuth = {
        id: found.id,
        name: found.name,
        email: found.email,
        role: found.role,
        title: found.title,
        phone: found.phone,
      };
    } else {
      // ตรวจสอบว่าตรงกับ PM ทางการ 7 ท่านของ Big-C หรือไม่
      const pmMatch = BIGC_PMS.find((p) => p.email.toLowerCase() === email);
      if (pmMatch) {
        userToAuth = {
          id: pmMatch.id,
          name: pmMatch.name,
          email: pmMatch.email,
          role: "pm",
          title: "Project Manager (วิศวกรผู้ตรวจรับ)",
          phone: "-",
        };
      } else {
        // อีเมลใหม่: จัดบทบาทและชื่ออัตโนมัติตามรูปแบบอีเมล
        const prefix = email.split("@")[0].replace(/[._-]/g, " ");
        const capitalized = prefix.charAt(0).toUpperCase() + prefix.slice(1);
        const role: UserRole = email.includes("admin")
          ? "admin"
          : email.includes("supervisor")
          ? "supervisor"
          : "pm";
        userToAuth = {
          id: `usr-${Date.now().toString(36)}`,
          name: role === "pm" ? `K. ${capitalized}` : capitalized,
          email: email,
          role: role,
          title:
            role === "admin"
              ? "ผู้ดูแลระบบ (Admin)"
              : role === "supervisor"
              ? "หัวหน้างาน (Supervisor)"
              : "Project Manager (วิศวกรผู้ตรวจรับ)",
          phone: "-",
        };
      }
    }

    setIsSubmitting(true);
    const otpRes = await requestOtp(email);
    setIsSubmitting(false);

    if (!otpRes.success) {
      setErrorMsg(otpRes.error || "ขอรหัสยืนยัน OTP ไม่สำเร็จ");
      return;
    }

    // ผ่านไปยังหน้ายืนยัน OTP ทันที
    setPendingUser(userToAuth);
    setTargetEmail(email);
    setDemoOtp(otpRes.demoOtp || null);
    setSupabaseTriggered(Boolean(otpRes.supabaseTriggered));
    setVerifyAction("login");
    setOtpCode(otpRes.demoOtp || ""); // ใส่รหัสเริ่มต้นให้เลยเพื่อความสะดวกสูงสุด
    setResendCooldown(60);
    setMode("verify");
    setSuccessMsg(`ระบบได้ออกรหัส OTP แล้ว: ${otpRes.demoOtp}`);
  }

  // 2. จัดการการสร้างบัญชีใหม่ (Sign Up)
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!signUpName.trim()) {
      setErrorMsg("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    const email = signUpEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setErrorMsg("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }
    if (signUpPassword.length < 4) {
      setErrorMsg("รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร");
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMsg("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setIsSubmitting(true);
    const otpRes = await requestOtp(email);
    setIsSubmitting(false);

    if (!otpRes.success) {
      setErrorMsg(otpRes.error || "ขอรหัสยืนยัน OTP ไม่สำเร็จ");
      return;
    }

    // บันทึกข้อมูลสมัครไว้ชั่วคราวและสลับไปหน้ากรอก OTP
    setPendingSignUpData({
      name: signUpName.trim(),
      email,
      password: signUpPassword,
      role: signUpRole,
      title: signUpTitle.trim() || undefined,
      phone: signUpPhone.trim() || undefined,
    });
    setTargetEmail(email);
    setDemoOtp(otpRes.demoOtp || null);
    setSupabaseTriggered(Boolean(otpRes.supabaseTriggered));
    setVerifyAction("signup");
    setOtpCode(otpRes.demoOtp || "");
    setResendCooldown(60);
    setMode("verify");
    setSuccessMsg(`ระบบได้ออกรหัส OTP แล้ว: ${otpRes.demoOtp}`);
  }

  // 3. จัดการการยืนยันรหัส OTP (Verify OTP)
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 6) {
      setErrorMsg("กรุณากรอกรหัส OTP ให้ครบทั้ง 6 หลัก");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          otp: cleanCode,
        }),
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "รหัส OTP ไม่ถูกต้อง หรือหมดอายุแล้ว");
        return;
      }

      // ยืนยัน OTP สำเร็จ
      if (verifyAction === "login" && pendingUser) {
        setAuthenticatedUser(pendingUser);
        setSuccessMsg("ยืนยันตัวตนทางอีเมลสำเร็จ! กำลังเข้าสู่ระบบ...");
        setTimeout(() => {
          router.push("/");
        }, 400);
      } else if (verifyAction === "signup" && pendingSignUpData) {
        const regRes = await register(pendingSignUpData);
        if (regRes.success) {
          setSuccessMsg("ยืนยันอีเมลและสร้างบัญชีสำเร็จ! กำลังเข้าสู่ระบบ...");
          setTimeout(() => {
            router.push("/");
          }, 400);
        } else {
          setErrorMsg(regRes.error || "สร้างบัญชีไม่สำเร็จ");
        }
      }
    } catch {
      setIsSubmitting(false);
      setErrorMsg("เกิดข้อผิดพลาดในการตรวจสอบรหัส OTP");
    }
  }

  // ขอส่งรหัส OTP ใหม่อีกครั้ง
  async function handleResend() {
    if (resendCooldown > 0 || isSubmitting) return;
    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(true);

    const res = await requestOtp(targetEmail);
    setIsSubmitting(false);

    if (res.success) {
      setDemoOtp(res.demoOtp || null);
      setOtpCode(res.demoOtp || "");
      setResendCooldown(60);
      setSuccessMsg(`ออกรหัส OTP ชุดใหม่แล้ว: ${res.demoOtp}`);
    } else {
      setErrorMsg(res.error || "ขอรหัสใหม่ไม่สำเร็จ");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0c233c] to-[#08182b] text-white flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background blueprint decorative pattern */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3.5 py-1 rounded-full text-xs font-semibold mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Big-C Quality Assurance & Control</span>
        </div>

        <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-white">
          {mode === "verify"
            ? "ยืนยันรหัส OTP ในอีเมล"
            : mode === "signin"
            ? "เข้าสู่ระบบตรวจรับงาน"
            : "สร้างบัญชีผู้ใช้งานใหม่"}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-white/70 max-w-sm mx-auto">
          {mode === "verify"
            ? "ระบบความปลอดภัย 2 ขั้นตอน (2FA) ยืนยันรหัสผ่านชั่วคราว OTP 6 หลัก"
            : mode === "signin"
            ? "ใช้อีเมลใดก็ได้เพื่อรับรหัส OTP และเข้าสู่ระบบทันที"
            : "กรอกข้อมูลและเลือกบทบาทหน้าที่ของคุณเพื่อเริ่มใช้งานในระบบ"}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        <div className="card bg-card/95 backdrop-blur-xl border-white/20 shadow-2xl p-6 sm:p-8 text-ink">
          {/* สถานะถ้ามีบัญชีล็อกอินอยู่แล้ว */}
          {currentUser && mode !== "verify" && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-ink truncate">
                    เข้าสู่ระบบอยู่: {currentUser.name}
                  </div>
                  <div className="text-[11px] text-ink3 truncate">
                    สิทธิ์: {currentUser.role.toUpperCase()} · {currentUser.email}
                  </div>
                </div>
              </div>
              <Link
                href="/"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 transition-colors shadow-sm"
              >
                เข้าใช้งาน →
              </Link>
            </div>
          )}

          {/* ข้อความแจ้งเตือน Error */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ข้อความแจ้งเตือน Success */}
          {successMsg && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ────────── แถบสลับ Sign In / Sign Up (ซ่อนเมื่ออยู่ในโหมด Verify) ────────── */}
          {mode !== "verify" && (
            <div className="grid grid-cols-2 p-1 bg-sunken rounded-2xl border border-line mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  mode === "signin"
                    ? "bg-brand text-white shadow-sm"
                    : "text-ink3 hover:text-ink hover:bg-white/40"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบด้วย OTP (Sign In)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  mode === "signup"
                    ? "bg-brand text-white shadow-sm"
                    : "text-ink3 hover:text-ink hover:bg-white/40"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>สร้างบัญชีใหม่ (Sign Up)</span>
              </button>
            </div>
          )}

          {/* ────────── 1. ฟอร์มเข้าสู่ระบบ (Sign In) ────────── */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink2 mb-1.5">
                  อีเมลของคุณ (กรอกอีเมลใดก็ได้เพื่อรับรหัส OTP) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink3">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="กรอกอีเมลของคุณ เช่น yourname@gmail.com"
                    className="field pl-10 text-sm"
                  />
                </div>
                <p className="text-[11px] text-ink3 mt-1">
                  💡 ระบบจะส่งรหัสยืนยัน OTP 6 หลักไปยังอีเมลนี้ทันที
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary min-h-[46px] text-sm font-bold flex items-center justify-center gap-2 mt-4 shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? "กำลังส่งรหัส OTP..." : "ขอรหัส OTP เพื่อเข้าสู่ระบบ →"}</span>
              </button>

              {/* ลิงก์สลับไปสร้างบัญชี */}
              <div className="text-center pt-2">
                <span className="text-xs text-ink3">ต้องการระบุบทบาทเฉพาะเจาะจง? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMsg("");
                  }}
                  className="text-xs font-bold text-brand hover:underline"
                >
                  สมัครสร้างบัญชีใหม่ที่นี่
                </button>
              </div>

              {/* รายชื่อ PM 7 ท่าน สำหรับเข้าสู่ระบบด่วน (Quick PM Selection) */}
              <div className="mt-5 pt-4 border-t border-line/70">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-brand" />
                    <span>เข้าสู่ระบบด่วนด้วยบัญชี PM (7 ท่าน):</span>
                  </span>
                  <span className="text-[10.5px] text-brand font-semibold">คลิกเลือกแล้วขอ OTP ได้ทันที</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-1.5 bg-sunken/80 rounded-xl border border-line">
                  {BIGC_PMS.map((pm) => {
                    const isSelected = signInEmail.toLowerCase() === pm.email.toLowerCase();
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => {
                          setSignInEmail(pm.email);
                          setErrorMsg("");
                        }}
                        className={`p-2 rounded-lg text-left transition-all border text-xs flex flex-col ${
                          isSelected
                            ? "bg-brand/10 border-brand text-brand font-bold shadow-xs"
                            : "bg-card border-line/60 text-ink hover:border-brand/40 hover:bg-card/80"
                        }`}
                      >
                        <div className="font-bold truncate text-[11.5px] flex items-center justify-between gap-1">
                          <span>{pm.name}</span>
                          <span className="text-[9.5px] font-semibold px-1 py-0.2 rounded bg-sunken text-brand shrink-0">
                            {pm.zone}
                          </span>
                        </div>
                        <div className="text-[10px] text-ink3 truncate font-normal mt-0.5">
                          {pm.email}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* บัญชีอื่นๆ */}
              <div className="mt-3 pt-3 border-t border-line/60 text-xs text-ink3">
                <div className="font-semibold text-ink2 mb-1">หรือคลิกเลือกบัญชี Admin / Supervisor:</div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setSignInEmail("admin@bigc.co.th");
                      setErrorMsg("");
                    }}
                    className="chip bg-card hover:bg-brand/10 hover:text-brand border text-[11px] cursor-pointer"
                  >
                    👑 Admin (admin@bigc.co.th)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSignInEmail("supervisor.wichai@bigc.co.th");
                      setErrorMsg("");
                    }}
                    className="chip bg-card hover:bg-brand/10 hover:text-brand border text-[11px] cursor-pointer"
                  >
                    🛡️ Supervisor (supervisor.wichai@bigc.co.th)
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ────────── 2. ฟอร์มสร้างบัญชีใหม่ (Sign Up) ────────── */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink2 mb-1.5">
                  ชื่อ - นามสกุล <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink3">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder="เช่น สมศักดิ์ สุขใจ"
                    className="field pl-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink2 mb-1.5">
                  อีเมล (Email) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink3">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="เช่น somsaks@company.com"
                    className="field pl-10 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink2 mb-1.5">
                    รหัสผ่าน <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink3">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="อย่างน้อย 4 ตัวอักษร"
                      className="field pl-10 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink2 mb-1.5">
                    ยืนยันรหัสผ่าน <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink3">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                      className="field pl-10 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* ────────── เลือกลักษณะบทบาท (Role Selection) ────────── */}
              <div>
                <label className="block text-xs font-bold text-ink2 mb-2">
                  เลือกบทบาทหน้าที่ในระบบ (Role) <span className="text-rose-500">*</span>
                </label>

                <div className="space-y-2">
                  {(["pm", "supervisor", "admin"] as UserRole[]).map((r) => {
                    const badge = getRoleBadgeInfo(r);
                    const isSelected = signUpRole === r;

                    return (
                      <div
                        key={r}
                        onClick={() => setSignUpRole(r)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? "border-brand bg-brand/5 ring-2 ring-brand/20 shadow-sm"
                            : "border-line hover:border-brand/40 bg-card"
                        }`}
                      >
                        <div className="pt-0.5">
                          <input
                            type="radio"
                            name="role"
                            checked={isSelected}
                            onChange={() => setSignUpRole(r)}
                            className="w-4 h-4 text-brand accent-brand cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{badge.icon}</span>
                            <span className="text-xs font-bold text-ink">{badge.label}</span>
                            <span className={`chip ${badge.bg} ${badge.text} ${badge.border} text-[10px] py-0.2`}>
                              {r.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-ink3 mt-0.5 leading-snug">
                            {badge.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink2 mb-1.5">
                    ตำแหน่งงาน / ฝ่าย (ไม่บังคับ)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink3">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={signUpTitle}
                      onChange={(e) => setSignUpTitle(e.target.value)}
                      placeholder="เช่น วิศวกรโครงการอาวุโส"
                      className="field pl-10 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink2 mb-1.5">
                    เบอร์โทรศัพท์ (ไม่บังคับ)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink3">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={signUpPhone}
                      onChange={(e) => setSignUpPhone(e.target.value)}
                      placeholder="เช่น 081-xxx-xxxx"
                      className="field pl-10 text-sm"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary min-h-[46px] text-sm font-bold flex items-center justify-center gap-2 mt-4 shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? "กำลังตรวจสอบและส่งรหัส..." : "ถัดไป: ยืนยันรหัส OTP ในอีเมล →"}</span>
              </button>

              {/* ลิงก์สลับไปเข้าสู่ระบบ */}
              <div className="text-center pt-2">
                <span className="text-xs text-ink3">มีบัญชีผู้ใช้งานอยู่แล้ว? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setErrorMsg("");
                  }}
                  className="text-xs font-bold text-brand hover:underline"
                >
                  เข้าสู่ระบบที่นี่
                </button>
              </div>
            </form>
          )}

          {/* ────────── 3. ขั้นตอนยืนยันรหัส OTP ในอีเมล (Email Verification) ────────── */}
          {mode === "verify" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center pb-1">
                <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand grid place-items-center mx-auto mb-2 shadow-inner border border-brand/20">
                  <KeyRound className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-xs font-semibold text-ink3">
                  ระบบได้ออกรหัสผ่านชั่วคราว OTP (6 หลัก) สำหรับ:
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full bg-sunken border border-line text-xs font-bold text-brand">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{targetEmail}</span>
                </div>
              </div>

              {/* กล่องแสดงรหัส OTP ขนาดใหญ่ เด่นชัดที่สุด */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-sky-500/15 border-2 border-emerald-500/40 text-ink shadow-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4" />
                      <span>รหัส OTP ของคุณ:</span>
                    </span>
                  </div>
                  {demoOtp && (
                    <button
                      type="button"
                      onClick={() => setOtpCode(demoOtp)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>ใส่รหัส {demoOtp} ทันที</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-center py-2.5 bg-card rounded-xl border border-line shadow-inner">
                  <span className="font-mono font-black text-3xl sm:text-4xl tracking-[0.4em] text-brand select-all">
                    {demoOtp || "กำลังออกรหัส..."}
                  </span>
                </div>

                <p className="text-[11px] text-ink3 text-center leading-relaxed">
                  {supabaseTriggered
                    ? "✉️ ส่งรหัสไปยังอีเมลจริงแล้ว คุณสามารถเปิดดูในกล่องจดหมาย หรือคลิกปุ่มใส่รหัสด้านบนได้ทันที"
                    : "💡 คุณสามารถนำรหัส 6 หลักด้านบนนี้กรอกลงในช่อง หรือกดปุ่มใส่รหัสทันทีเพื่อเข้าสู่ระบบ"}
                </p>
              </div>

              {/* ช่องกรอก OTP 6 หลัก */}
              <div>
                <label className="block text-center text-xs font-bold text-ink2 mb-1.5">
                  กรอกรหัส OTP 6 หลัก เพื่อยืนยันตัวตน
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  required
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setOtpCode(val);
                  }}
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono font-black py-3 rounded-2xl border-2 border-brand/50 focus:border-brand focus:ring-4 focus:ring-brand/15 bg-card text-ink shadow-inner transition-all"
                />
                <div className="text-[11px] text-center text-ink3 mt-1.5">
                  รหัสจะหมดอายุภายใน 5 นาที
                </div>
              </div>

              {/* ปุ่มยืนยันรหัส */}
              <button
                type="submit"
                disabled={isSubmitting || otpCode.length !== 6}
                className="w-full btn-primary min-h-[46px] text-sm font-bold flex items-center justify-center gap-2 mt-2 shadow-md disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? "กำลังตรวจสอบรหัส..."
                    : verifyAction === "login"
                    ? "ยืนยันรหัสและเข้าสู่ระบบ →"
                    : "ยืนยันรหัสและสร้างบัญชี →"}
                </span>
              </button>

              {/* แถบขอรหัสใหม่ & ย้อนกลับ */}
              <div className="flex items-center justify-between text-xs pt-3 border-t border-line/70">
                <button
                  type="button"
                  onClick={() => {
                    setMode(verifyAction === "login" ? "signin" : "signup");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-ink3 hover:text-ink font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ย้อนกลับ / เปลี่ยนอีเมล</span>
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isSubmitting}
                  className={`font-bold flex items-center gap-1 ${
                    resendCooldown > 0
                      ? "text-ink3 cursor-not-allowed"
                      : "text-brand hover:underline cursor-pointer"
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? "animate-spin" : ""}`} />
                  <span>
                    {resendCooldown > 0
                      ? `ขอรหัสใหม่ใน (${resendCooldown}s)`
                      : "ขอรหัส OTP ใหม่อีกครั้ง"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <Link
            href="/"
            className="text-xs text-white/70 hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <span>กลับสู่หน้ารายการตรวจ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
