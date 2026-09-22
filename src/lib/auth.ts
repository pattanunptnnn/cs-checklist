// ============================================================
//  auth.ts — ข้อมูลผู้ใช้และระบบตรวจสอบสิทธิ์ 3 บทบาท
//  Admin / Project Manager (PM) / Supervisor
// ============================================================

import type { AuthUser, UserRole } from "./types";

export interface RegisteredUser extends AuthUser {
  password?: string;
  createdAt?: string;
}

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

const USERS_STORAGE_KEY = "bigc_cs_registered_users";

export function getRegisteredUsers(): RegisteredUser[] {
  if (typeof window === "undefined") return Object.values(DEMO_USERS);
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      const initial = Object.values(DEMO_USERS);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return Object.values(DEMO_USERS);
  } catch {
    return Object.values(DEMO_USERS);
  }
}

export function saveRegisteredUsers(users: RegisteredUser[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("Failed to save registered users:", e);
  }
}

export function registerUser(data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  title?: string;
  phone?: string;
}): { success: boolean; user?: AuthUser; error?: string } {
  const users = getRegisteredUsers();
  const normalizedEmail = data.email.trim().toLowerCase();

  if (!data.name.trim()) {
    return { success: false, error: "กรุณากรอกชื่อ - นามสกุล" };
  }
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { success: false, error: "กรุณากรอกรูปแบบอีเมลให้ถูกต้อง" };
  }
  if (!data.password || data.password.length < 4) {
    return { success: false, error: "รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร" };
  }
  if (!["admin", "pm", "supervisor"].includes(data.role)) {
    return { success: false, error: "กรุณาเลือกบทบาทหน้าที่ในระบบ" };
  }

  const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return { success: false, error: "อีเมลนี้มีผู้ใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบ หรือใช้อีเมลอื่น" };
  }

  const defaultTitle =
    data.role === "admin"
      ? "ผู้ดูแลระบบ (Admin)"
      : data.role === "pm"
      ? "Project Manager (วิศวกรผู้ตรวจรับ)"
      : "Quality Supervisor (ผู้อนุมัติงาน)";

  const newUser: RegisteredUser = {
    id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: data.name.trim(),
    email: normalizedEmail,
    password: data.password,
    role: data.role,
    title: data.title?.trim() || defaultTitle,
    phone: data.phone?.trim() || "-",
    createdAt: new Date().toISOString(),
  };

  const updated = [...users, newUser];
  saveRegisteredUsers(updated);

  const authUser: AuthUser = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    title: newUser.title,
    phone: newUser.phone,
  };

  return { success: true, user: authUser };
}

export function authenticateUser(
  email: string,
  password: string
): { success: boolean; user?: AuthUser; error?: string } {
  const users = getRegisteredUsers();
  const normalizedEmail = email.trim().toLowerCase();

  const found = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!found) {
    return {
      success: false,
      error: "ไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาตรวจสอบอีเมลหรือสมัครสร้างบัญชีใหม่",
    };
  }

  if (found.password && found.password !== password) {
    return {
      success: false,
      error: "รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านอีกครั้ง",
    };
  }

  const authUser: AuthUser = {
    id: found.id,
    name: found.name,
    email: found.email,
    role: found.role,
    title: found.title,
    phone: found.phone,
  };

  return { success: true, user: authUser };
}

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
