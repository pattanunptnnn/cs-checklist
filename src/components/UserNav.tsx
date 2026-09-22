"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { getRoleBadgeInfo, DEMO_USERS } from "@/lib/auth";
import type { UserRole } from "@/lib/types";
import {
  User,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Sparkles,
  Check,
  LogIn,
  UserPlus,
} from "lucide-react";

export default function UserNav() {
  const { user, role, switchRole, logout, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
                  logout();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
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
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/35 text-white text-xs font-semibold transition-all active:scale-95 shadow-sm"
      >
        <LogOut className="w-3.5 h-3.5 text-rose-300" />
        <span className="hidden sm:inline">ออกจากระบบ</span>
      </button>
    </div>
  );
}
