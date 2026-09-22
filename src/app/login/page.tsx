"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { DEMO_USERS, getRoleBadgeInfo } from "@/lib/auth";
import type { UserRole } from "@/lib/types";
import {
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, role: currentRole, user: currentUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // เข้าสู่ระบบแบบกรอกฟอร์ม
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setLoadingRole("form");

    const res = await login(email, password);
    setLoadingRole(null);

    if (res.success) {
      router.push("/");
    } else {
      setErrorMsg(res.error || "เข้าสู่ระบบไม่สำเร็จ");
    }
  }

  // เข้าสู่ระบบแบบ 1-Click สำหรับการทดสอบ
  async function handleQuickLogin(targetRole: UserRole) {
    setErrorMsg("");
    setLoadingRole(targetRole);

    await login(targetRole);
    setLoadingRole(null);
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0c233c] to-[#08182b] text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background blueprint decorative elements */}
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
          เข้าสู่ระบบตรวจรับงาน
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-white/70 max-w-sm mx-auto">
          ระบบบริหารจัดการการตรวจรับงานโครงสร้าง (ITP) และติดตาม Defect ประจำไซต์งาน Big-C
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        <div className="card bg-card/95 backdrop-blur-xl border-white/20 shadow-2xl p-6 sm:p-8 text-ink">
          {/* ข้อความแจ้งเตือนเมื่อเกิดข้อผิดพลาด */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* แจ้งเตือนกรณีล็อกอินอยู่แล้ว */}
          {currentUser && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-ink truncate">
                    เข้าสู่ระบบอยู่แล้ว: {currentUser.name}
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

          {/* ─────────── 1. ปุ่ม Quick Demo Login 3 บทบาท (คลิกเข้าได้ทันที) ─────────── */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-ink2 uppercase tracking-wider">
                ⚡ เลือกล็อกอินตามบทบาท (Quick Access)
              </span>
              <span className="text-[11px] text-brand font-semibold">ไม่ต้องจำรหัส</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {(["pm", "supervisor", "admin"] as UserRole[]).map((r) => {
                const badge = getRoleBadgeInfo(r);
                const demoUser = DEMO_USERS[r];
                const isLoadingThis = loadingRole === r;

                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleQuickLogin(r)}
                    disabled={Boolean(loadingRole)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-line hover:border-brand/50 hover:bg-brand/5 transition-all text-left group active:scale-98 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-sunken border border-line grid place-items-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                        {badge.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-ink">{badge.label}</span>
                          <span className={`chip ${badge.bg} ${badge.text} ${badge.border} text-[10px] py-0.2`}>
                            {r.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink3 truncate mt-0.5">
                          {badge.desc}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      <span className="w-7 h-7 rounded-lg bg-sunken group-hover:bg-brand group-hover:text-white grid place-items-center transition-colors">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line/80" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-ink3 font-medium">หรือเข้าสู่ระบบด้วยอีเมล</span>
            </div>
          </div>

          {/* ─────────── 2. ฟอร์มกรอกอีเมล & รหัสผ่าน ─────────── */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink2 mb-1.5">
                อีเมลผู้ใช้งาน (Email)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink3">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="เช่น pm.somchai@bigc.co.th"
                  className="field pl-10 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink2 mb-1.5">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink3">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านของคุณ"
                  className="field pl-10 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={Boolean(loadingRole)}
              className="w-full btn-primary min-h-[44px] text-sm font-bold flex items-center justify-center gap-2 mt-2"
            >
              <span>{loadingRole === "form" ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* ตารางแนะนำบัญชีทดสอบ */}
          <div className="mt-6 pt-5 border-t border-line/70 text-xs text-ink3">
            <div className="font-semibold text-ink2 mb-2">บัญชีตัวอย่างสำหรับทดสอบ:</div>
            <div className="space-y-1 text-[11.5px] tnum">
              <div>• <strong>Admin:</strong> admin@bigc.co.th / รหัส: admin1234</div>
              <div>• <strong>PM:</strong> pm.somchai@bigc.co.th / รหัส: pm1234</div>
              <div>• <strong>Supervisor:</strong> supervisor.wichai@bigc.co.th / รหัส: sup1234</div>
            </div>
          </div>
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
