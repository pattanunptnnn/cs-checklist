"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { getRoleBadgeInfo, DEMO_USERS } from "@/lib/auth";
import type { UserRole, LoginLog } from "@/lib/types";
import {
  User,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Sparkles,
  Check,
  LogIn,
  UserPlus,
  Clock,
  X,
  RefreshCw,
} from "lucide-react";

export default function UserNav() {
  const { user, role, switchRole, logout, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // State สำหรับ Modal ประวัติการล็อกอิน
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  async function fetchLogs() {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/auth/logs?limit=30");
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error("Failed to fetch login logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  }

  // ปิดเมนูเมื่อคลิกนอกพื้นที่
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all active:scale-95 shadow-sm"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>เข้าสู่ระบบ</span>
      </Link>
    );
  }

  const badge = getRoleBadgeInfo(role);

  return (
    <div className="flex items-center gap-1.5" ref={menuRef}>
      {/* 1. ปุ่มโปรไฟล์ผู้ใช้งาน และดรอปดาวน์ */}
      <div className="relative inline-block text-left">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-2xl bg-black/25 hover:bg-black/35 backdrop-blur-md border border-white/20 text-white transition-all shadow-sm active:scale-95"
        >
          {/* อวาตาร์ไอคอนตาม Role */}
          <span className="w-6 h-6 rounded-full bg-white/20 text-white grid place-items-center text-xs shadow-inner">
            {badge.icon}
          </span>

          {/* ชื่อและป้ายบทบาท */}
          <div className="text-left hidden sm:block leading-tight">
            <div className="text-xs font-bold truncate max-w-[130px]">{user.name}</div>
            <div className="text-[10px] text-white/75 font-medium">{badge.shortLabel}</div>
          </div>

          <ChevronDown
            className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* เมนูดรอปดาวน์ */}
        {open && (
          <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-card border border-line shadow-2xl z-50 p-2 text-ink animate-in fade-in zoom-in-95 duration-150">
            {/* ข้อมูลบัญชีปัจจุบัน */}
            <div className="p-2.5 rounded-xl bg-sunken border border-line/60 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{badge.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-ink truncate">{user.name}</div>
                  <div className="text-[11px] text-ink3 truncate">{user.email}</div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-line/50 flex items-center justify-between text-[11px]">
                <span className="text-ink3">บทบาทในระบบ:</span>
                <span className={`chip ${badge.bg} ${badge.text} ${badge.border} font-bold text-[10px]`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-[10.5px] text-ink3 mt-1 leading-snug">{badge.desc}</p>
            </div>

            {/* เมนูลิงก์จัดการบัญชี */}
            <div className="space-y-1">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-ink hover:bg-sunken transition-colors"
              >
                <UserPlus className="w-4 h-4 text-brand" />
                <span>สมัครสร้างบัญชีใหม่ / สลับบัญชี</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setShowLogs(true);
                  fetchLogs();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-ink hover:bg-sunken transition-colors cursor-pointer"
              >
                <Clock className="w-4 h-4 text-sky-500" />
                <span>ดูประวัติการเข้าสู่ระบบ (Login Logs)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>ออกจากระบบ (Sign Out)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. ปุ่มออกจากระบบ (Log out) ชัดเจนทันทีบน Navbar */}
      <button
        type="button"
        onClick={logout}
        title="ออกจากระบบ (Log out)"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/35 text-white text-xs font-semibold transition-all active:scale-95 shadow-sm cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5 text-rose-300" />
        <span className="hidden sm:inline">ออกจากระบบ</span>
      </button>

      {/* 3. Modal แสดงประวัติการเข้าสู่ระบบ (Login History) */}
      {showLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-2xl rounded-3xl border border-line shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-ink animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-sunken/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 grid place-items-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-ink">ประวัติการเข้าสู่ระบบ (Login Logs)</h3>
                  <p className="text-[11px] text-ink3">บันทึกลง Database ทุกครั้งที่มีการ Sign in เข้าใช้งาน</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={fetchLogs}
                  disabled={loadingLogs}
                  className="p-1.5 rounded-xl hover:bg-card border border-line/60 text-ink3 hover:text-ink text-xs transition-colors cursor-pointer"
                  title="รีเฟรชประวัติ"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingLogs ? "animate-spin" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogs(false)}
                  className="p-1.5 rounded-xl hover:bg-card border border-line/60 text-ink3 hover:text-ink text-xs transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {loadingLogs ? (
                <div className="text-center py-10 text-xs text-ink3 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-brand" />
                  <span>กำลังโหลดข้อมูลประวัติการล็อกอิน...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-ink3 text-xs">
                  ยังไม่มีประวัติการเข้าสู่ระบบ
                </div>
              ) : (
                logs.map((log) => {
                  const isSuccess = log.status === "success";
                  const dateStr = log.loggedInAt
                    ? new Date(log.loggedInAt).toLocaleString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "-";

                  return (
                    <div
                      key={log.id}
                      className={`p-3 rounded-2xl border transition-all text-xs flex items-start justify-between gap-3 ${
                        isSuccess
                          ? "bg-card border-line hover:border-brand/40"
                          : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-500/20 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 mt-0.5 ${
                            isSuccess
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-rose-500/15 text-rose-500"
                          }`}
                        >
                          {isSuccess ? <ShieldCheck className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-ink truncate">{log.name || log.email}</span>
                            <span
                              className={`chip text-[10px] py-0.5 ${
                                isSuccess
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {isSuccess ? "สำเร็จ" : "รหัสผ่านผิด"}
                            </span>
                            {log.role && log.role !== "-" && (
                              <span className="chip bg-sunken text-ink3 text-[9.5px]">
                                {log.role.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-ink3 truncate mt-0.5">{log.email}</div>
                          <div className="text-[10px] text-ink3/80 mt-1 flex items-center gap-2 flex-wrap">
                            <span>🌐 IP: {log.ipAddress || "-"}</span>
                            <span>•</span>
                            <span className="truncate max-w-[280px]">อุปกรณ์: {log.userAgent || "-"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-ink3 shrink-0 text-right">
                        {dateStr}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-line bg-sunken/40 flex items-center justify-between text-xs text-ink3">
              <span>แสดงสูงสุด {logs.length} รายการล่าสุด</span>
              <button
                type="button"
                onClick={() => setShowLogs(false)}
                className="px-4 py-1.5 rounded-xl bg-card hover:bg-line border border-line text-ink font-semibold text-xs cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
