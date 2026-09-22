// ============================================================
//  auth.ts — ข้อมูลผู้ใช้และระบบตรวจสอบสิทธิ์ 3 บทบาท
//  Admin / Project Manager (PM) / Supervisor
// ============================================================

import type { AuthUser, UserRole } from "./types";

export const DEMO_USERS: Record<UserRole, AuthUser & { password: string }> = {
  admin: {
    id: "usr-admin-01",
    email: "admin@bigc.co.th",
    password: "admin1234",
    name: "ผู้ดูแลระบบกลาง",
    role: "admin",
    title: "System Administrator",
    phone: "02-655-0666",
  },
  pm: {
    id: "usr-pm-01",
    email: "pm.somchai@bigc.co.th",
    password: "pm1234",
    name: "สมชาย ใจดี",
    role: "pm",
    title: "Project Manager (วิศวกรหน้าไซต์)",
    phone: "081-456-7890",
  },
  supervisor: {
    id: "usr-sup-01",
    email: "supervisor.wichai@bigc.co.th",
    password: "sup1234",
    name: "วิชัย มุ่งมั่น",
    role: "supervisor",
    title: "Quality Supervisor (ผู้อนุมัติงาน)",
    phone: "089-123-4567",
  },
};

export interface RoleBadgeInfo {
  label: string;
  shortLabel: string;
  icon: string;
  bg: string;
  text: string;
  border: string;
  ring: string;
  desc: string;
}

export function getRoleBadgeInfo(role: UserRole): RoleBadgeInfo {
  switch (role) {
    case "admin":
      return {
        label: "ผู้ดูแลระบบ (Admin)",
        shortLabel: "Admin",
        icon: "👑",
        bg: "bg-purple-500/15",
        text: "text-purple-700 dark:text-purple-300",
        border: "border-purple-500/30",
        ring: "ring-purple-500/20",
        desc: "เห็นข้อมูลทุกส่วน แต่ไม่มีอำนาจอนุมัติผลตรวจ",
      };
    case "pm":
      return {
        label: "วิศวกรโครงการ (PM)",
        shortLabel: "Project Manager",
        icon: "🛠️",
        bg: "bg-sky-500/15",
        text: "text-sky-700 dark:text-sky-300",
        border: "border-sky-500/30",
        ring: "ring-sky-500/20",
        desc: "ตรวจรับงานหน้าไซต์จริง เช็คอิน กรอกข้อมูล แนบรูป",
      };
    case "supervisor":
      return {
        label: "หัวหน้างาน (Supervisor)",
        shortLabel: "Supervisor",
        icon: "🛡️",
        bg: "bg-emerald-500/15",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-500/30",
        ring: "ring-emerald-500/20",
        desc: "ตรวจทานงานทุกไซต์ และเป็นผู้มีอำนาจอนุมัติขั้นสุดท้าย",
      };
  }
}

// ตรวจสอบว่าบทบาทนี้มีสิทธิ์อนุมัติผลตรวจหรือไม่ (เฉพาะ Supervisor)
export function canApproveInspection(role?: UserRole | null): boolean {
  return role === "supervisor";
}

// ตรวจสอบว่าบทบาทนี้มีสิทธิ์เซ็นในช่อง "3. ผู้อนุมัติ" หรือไม่ (เฉพาะ Supervisor)
export function canSignAsApprover(role?: UserRole | null): boolean {
  return role === "supervisor";
}

// ตรวจสอบว่าบทบาทนี้มีสิทธิ์เซ็นในช่อง "1. ผู้จัดทำ" หรือ "2. ผู้ตรวจสอบ" หรือไม่
export function canSignInspection(role?: UserRole | null): boolean {
  return role === "pm" || role === "supervisor" || role === "admin";
}
