// ============================================================
//  userStore.ts — ระบบจัดการข้อมูลผู้ใช้งานและประวัติการล็อกอิน
//  รองรับทั้ง Supabase Cloud Database และ Local JSON (Fallback)
// ============================================================
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { AuthUser, UserRecord, LoginLog, UserRole } from "./types";
import { getSupabase } from "./supabase";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const LOGS_FILE = path.join(DATA_DIR, "login_logs.json");

// บัญชีเริ่มต้นสำหรับทดสอบระบบ
export const DEFAULT_USERS: UserRecord[] = [
  {
    id: "usr-admin-01",
    email: "admin@bigc.co.th",
    password: "admin1234",
    name: "ผู้ดูแลระบบกลาง",
    role: "admin",
    title: "System Administrator",
    phone: "02-655-0666",
    createdAt: new Date().toISOString(),
  },
  {
    id: "usr-sup-01",
    email: "supervisor.wichai@bigc.co.th",
    password: "sup1234",
    name: "วิชัย มุ่งมั่น",
    role: "supervisor",
    title: "Quality Supervisor (ผู้อนุมัติงาน)",
    phone: "089-123-4567",
    createdAt: new Date().toISOString(),
  },
];

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// ------------------------------------------------------------
// Local File Helpers
// ------------------------------------------------------------
async function readLocalUsers(): Promise<UserRecord[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(USERS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore
  }
  await writeLocalUsers(DEFAULT_USERS);
  return DEFAULT_USERS;
}

async function writeLocalUsers(users: UserRecord[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

async function readLocalLogs(): Promise<LoginLog[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(LOGS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

async function appendLocalLog(log: LoginLog): Promise<void> {
  await ensureDir();
  const logs = await readLocalLogs();
  logs.unshift(log);
  // เก็บประวัติสูงสุด 1,000 รายการในไฟล์สำรอง
  const trimmed = logs.slice(0, 1000);
  await fs.writeFile(LOGS_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
}

// ------------------------------------------------------------
// 1. อ่านรายชื่อผู้ใช้ทั้งหมด
// ------------------------------------------------------------
export async function listUsers(): Promise<UserRecord[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          email: row.email,
          name: row.name,
          role: row.role as UserRole,
          title: row.title || "",
          phone: row.phone || "",
          password: row.password,
          lastLoginAt: row.last_login_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      }
    } catch (e) {
      console.warn("Supabase listUsers failed, falling back to local:", e);
    }
  }
  return await readLocalUsers();
}

// ------------------------------------------------------------
// 2. ค้นหาผู้ใช้ตามอีเมล
// ------------------------------------------------------------
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalized = email.trim().toLowerCase();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("email", normalized)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role as UserRole,
          title: data.title || "",
          phone: data.phone || "",
          password: data.password,
          lastLoginAt: data.last_login_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch {
      // fallback
    }
  }

  const local = await readLocalUsers();
  const found = local.find((u) => u.email.toLowerCase() === normalized);
  return found || null;
}

// ------------------------------------------------------------
// 3. สร้างบัญชีผู้ใช้งานใหม่ (Sign Up)
// ------------------------------------------------------------
export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  title?: string;
  phone?: string;
}): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const normalized = data.email.trim().toLowerCase();

  const existing = await findUserByEmail(normalized);
  if (existing) {
    return { success: false, error: "อีเมลนี้มีผู้ใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบ หรือใช้อีเมลอื่น" };
  }

  const id = `usr-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const now = new Date().toISOString();

  const defaultTitle =
    data.role === "admin"
      ? "ผู้ดูแลระบบ (Admin)"
      : data.role === "pm"
      ? "Project Manager (วิศวกรผู้ตรวจรับ)"
      : "Quality Supervisor (ผู้อนุมัติงาน)";

  const newRecord: UserRecord = {
    id,
    email: normalized,
    name: data.name.trim(),
    password: data.password,
    role: data.role,
    title: data.title?.trim() || defaultTitle,
    phone: data.phone?.trim() || "-",
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // 1. บันทึกลง Supabase Database
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("users").upsert({
        id: newRecord.id,
        email: newRecord.email,
        name: newRecord.name,
        password: newRecord.password,
        role: newRecord.role,
        title: newRecord.title,
        phone: newRecord.phone,
        last_login_at: newRecord.lastLoginAt,
        created_at: newRecord.createdAt,
        updated_at: newRecord.updatedAt,
      });
    } catch (e) {
      console.warn("Supabase createUser error, falling back to local file:", e);
    }
  }

  // 2. บันทึกลง Local JSON File สำรอง
  const local = await readLocalUsers();
  local.push(newRecord);
  await writeLocalUsers(local);

  const authUser: AuthUser = {
    id: newRecord.id,
    email: newRecord.email,
    name: newRecord.name,
    role: newRecord.role,
    title: newRecord.title,
    phone: newRecord.phone,
  };

  return { success: true, user: authUser };
}

// ------------------------------------------------------------
// 4. บันทึกประวัติการล็อกอิน (Login Log)
// ------------------------------------------------------------
export async function recordLoginLog(logData: {
  userId?: string | null;
  email: string;
  name?: string;
  role?: string;
  status: "success" | "failed";
  ipAddress?: string;
  userAgent?: string;
}): Promise<LoginLog> {
  const id = `log-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const now = new Date().toISOString();

  const logEntry: LoginLog = {
    id,
    userId: logData.userId || null,
    email: logData.email.trim().toLowerCase(),
    name: logData.name || "-",
    role: logData.role || "-",
    status: logData.status,
    ipAddress: logData.ipAddress || "-",
    userAgent: logData.userAgent || "-",
    loggedInAt: now,
    createdAt: now,
  };

  // 1. บันทึกลง Supabase Database
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("login_logs").insert({
        id: logEntry.id,
        user_id: logEntry.userId,
        email: logEntry.email,
        name: logEntry.name,
        role: logEntry.role,
        status: logEntry.status,
        ip_address: logEntry.ipAddress,
        user_agent: logEntry.userAgent,
        logged_in_at: logEntry.loggedInAt,
        created_at: logEntry.createdAt,
      });
    } catch (e) {
      console.warn("Supabase login_logs insert error (table may not be created yet):", e);
    }

    // อัปเดต last_login_at ของผู้ใช้ใน Supabase
    if (logData.status === "success" && logData.userId) {
      try {
        await supabase
          .from("users")
          .update({ last_login_at: now, updated_at: now })
          .eq("id", logData.userId);
      } catch {
        // ignore
      }
    }
  }

  // 2. บันทึกลง Local JSON File สำรอง
  await appendLocalLog(logEntry);

  // อัปเดต last_login_at ของผู้ใช้ใน Local
  if (logData.status === "success") {
    try {
      const local = await readLocalUsers();
      const idx = local.findIndex((u) => u.email.toLowerCase() === logEntry.email);
      if (idx !== -1) {
        local[idx].lastLoginAt = now;
        local[idx].updatedAt = now;
        await writeLocalUsers(local);
      }
    } catch {
      // ignore
    }
  }

  return logEntry;
}

// ------------------------------------------------------------
// 5. อ่านประวัติการล็อกอิน (Login Logs)
// ------------------------------------------------------------
export async function listLoginLogs(limit = 50): Promise<LoginLog[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("login_logs")
        .select("*")
        .order("logged_in_at", { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          email: row.email,
          name: row.name,
          role: row.role,
          status: row.status as "success" | "failed",
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          loggedInAt: row.logged_in_at || row.created_at,
          createdAt: row.created_at,
        }));
      }
    } catch {
      // fallback
    }
  }

  const local = await readLocalLogs();
  return local.slice(0, limit);
}
