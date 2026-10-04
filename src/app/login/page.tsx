"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getRoleBadgeInfo, BIGC_PMS, getRegisteredUsers } from "@/lib/auth";
import type { UserRole } from "@/lib/types";
import {
  Lock,
  Mail,
  User,
  Phone,
  Briefcase,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
} from "lucide-react";

type AuthMode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { login, register, user: currentUser } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");

  // State สำหรับ Sign In (เข้าสู่ระบบโดยตรง ไม่ต้อง OTP)
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // State สำหรับ Sign Up (สมัครสมาชิกใหม่ — เข้าใช้งานได้ทันที ไม่ต้อง OTP)
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpRole, setSignUpRole] = useState<UserRole>("pm");
  const [signUpTitle, setSignUpTitle] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 1. จัดการการเข้าสู่ระบบ (Sign In) — เข้าสู่ระบบโดยตรง
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const email = signInEmail.trim().toLowerCase();
    const pwd = signInPassword;

    if (!email || !email.includes("@")) {
      setErrorMsg("กรุณากรอกอีเมลให้ถูกต้อง เช่น yourname@example.com");
      return;
    }
    if (!pwd) {
      setErrorMsg("กรุณากรอกรหัสผ่านของคุณ");
      return;
    }

    setIsSubmitting(true);
    const res = await login(email, pwd);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    setSuccessMsg("เข้าสู่ระบบสำเร็จ! กำลังนำคุณไปยังหน้าหลัก...");
    setTimeout(() => {
      router.push("/");
    }, 350);
  }

  // 2. จัดการการสร้างบัญชีใหม่ (Sign Up) — บันทึกและเข้าสู่ระบบทันที (ไม่ต้องมี OTP)
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

    // ตรวจสอบว่ามีผู้ใช้นี้อยู่แล้วหรือไม่
    const users = getRegisteredUsers();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      setErrorMsg("อีเมลนี้มีผู้ใช้งานในระบบแล้ว กรุณาไปที่แท็บ 'เข้าสู่ระบบ'");
      return;
    }

    setIsSubmitting(true);
    const regRes = await register({
      name: signUpName.trim(),
      email,
      password: signUpPassword,
      role: signUpRole,
      title: signUpTitle.trim() || undefined,
      phone: signUpPhone.trim() || undefined,
    });
    setIsSubmitting(false);

    if (regRes.success) {
      setSuccessMsg("สมัครสมาชิกและสร้างบัญชีสำเร็จ! กำลังเข้าสู่ระบบ...");
      setTimeout(() => {
        router.push("/");
      }, 400);
    } else {
      setErrorMsg(regRes.error || "สร้างบัญชีไม่สำเร็จ");
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
          {mode === "signin" ? "เข้าสู่ระบบตรวจรับงาน" : "สร้างบัญชีผู้ใช้งานใหม่"}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-white/70 max-w-sm mx-auto">
          {mode === "signin"
            ? "กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบได้ทันที"
            : "กรอกข้อมูลและเลือกบทบาทหน้าที่ของคุณเพื่อเริ่มใช้งานในระบบ"}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        <div className="card bg-card/95 backdrop-blur-xl border-white/20 shadow-2xl p-6 sm:p-8 text-ink">
          {/* สถานะถ้ามีบัญชีล็อกอินอยู่แล้ว */}
          {currentUser && (
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

          {/* ────────── แถบสลับ Sign In / Sign Up ────────── */}
          <div className="grid grid-cols-2 p-1 bg-sunken rounded-2xl border border-line mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === "signin"
                  ? "bg-brand text-white shadow-sm"
                  : "text-ink3 hover:text-ink hover:bg-white/40"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>เข้าสู่ระบบ (Sign In)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === "signup"
                  ? "bg-brand text-white shadow-sm"
                  : "text-ink3 hover:text-ink hover:bg-white/40"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>สมัครสมาชิกใหม่ (Sign Up)</span>
            </button>
          </div>

          {/* ────────── 1. ฟอร์มเข้าสู่ระบบ (Sign In) ────────── */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
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
                    autoFocus
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="กรอกอีเมลของคุณ"
                    className="field pl-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-ink2">
                    รหัสผ่าน (Password) <span className="text-rose-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink3">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showSignInPassword ? "text" : "password"}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่าน"
                    className="field pl-10 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink3 hover:text-ink cursor-pointer"
                  >
                    {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary min-h-[46px] text-sm font-bold flex items-center justify-center gap-2 mt-4 shadow-md cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ (Sign In) →"}</span>
              </button>

              {/* ลิงก์สลับไปสร้างบัญชี */}
              <div className="text-center pt-2">
                <span className="text-xs text-ink3">ยังไม่มีบัญชีผู้ใช้งาน? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-xs font-bold text-brand hover:underline cursor-pointer"
                >
                  สมัครสร้างบัญชีใหม่ที่นี่
                </button>
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
                {signUpRole === "pm" && (
                  <div className="mb-2">
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const pm = BIGC_PMS.find((p) => p.name === val);
                          setSignUpName(val);
                          if (pm) setSignUpTitle(`Project Manager (${pm.zone})`);
                        }
                      }}
                      className="field text-xs mb-1.5 py-2 cursor-pointer bg-card"
                      defaultValue=""
                    >
                      <option value="">-- เลือกชื่อ PM ประจำโซน (7 ท่าน) หรือพิมพ์ด้านล่าง --</option>
                      {BIGC_PMS.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name} ({p.zone})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink3">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder="เช่น K. Thienchai หรือชื่อ-นามสกุลจริง"
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
                    placeholder="เช่น somsaks@company.com หรือ yourname@gmail.com"
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
                      type={showSignUpPassword ? "text" : "password"}
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
                      type={showSignUpPassword ? "text" : "password"}
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
                className="w-full btn-primary min-h-[46px] text-sm font-bold flex items-center justify-center gap-2 mt-4 shadow-md cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? "กำลังสร้างบัญชี..." : "ลงทะเบียนและเข้าใช้งานทันที →"}</span>
              </button>

              {/* ลิงก์สลับไปเข้าสู่ระบบ */}
              <div className="text-center pt-2">
                <span className="text-xs text-ink3">มีบัญชีผู้ใช้งานอยู่แล้ว? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-xs font-bold text-brand hover:underline cursor-pointer"
                >
                  เข้าสู่ระบบที่นี่
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
