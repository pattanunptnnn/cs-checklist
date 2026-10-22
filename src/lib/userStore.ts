// ============================================================
//  userStore.ts — ระบบจัดการข้อมูลผู้ใช้งานและประวัติการล็อกอิน
//  รองรับทั้ง Supabase Cloud Database และ Local JSON (Fallback)
// ============================================================
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { AuthUser, UserRecord, LoginLog, UserRole } from "./types";
import { getSupabase } from "./supabase";
import { BIGC_PMS } from "./auth";

// ตรวจสอบ Serverless / Vercel Environment
const isVercel = Boolean(
  process.env.VERCEL ||
  process.env.NOW_REGION ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NODE_ENV === "production" && !process.env.LOCAL_DEV
);

// บน Vercel ให้เขียนไฟล์ลง /tmp เท่านั้น เพื่อไม่ให้ติดสิทธิ์ Read-only filesystem
const DATA_DIR = isVercel ? path.join("/tmp", "cs_data") : path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const LOGS_FILE = path.join(DATA_DIR, "login_logs.json");

// สร้างบัญชีเริ่มต้นสำหรับ Admin, Supervisor และ PM ทั้ง 7 ท่าน
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
  ...BIGC_PMS.map((pm) => ({
    id: pm.id,
    email: pm.email || `${pm.name.replace(/^k\.\s*/i, "").toLowerCase().replace(/\s+/g, "")}@bigc.co.th`,
    password: "pm1234",
    name: pm.name,
    role: "pm" as UserRole,
    title: `Project Manager (${pm.zone})`,
    phone: pm.phone || "081-xxx-xxxx",
    createdAt: new Date().toISOString(),
  })),
];

// In-memory cache ป้องกัน File I/O Error บน Serverless
let memoryUsers: UserRecord[] = [...DEFAULT_USERS];
let memoryLogs: LoginLog[] = [];

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // ป้องกัน error บนสภาพแวดล้อม read-only
  }
}

// ------------------------------------------------------------
// Local File Helpers (Safe with try/catch)
// ------------------------------------------------------------
async function readLocalUsers(): Promise<UserRecord[]> {
  try {
    await ensureDir();
    const raw = await fs.readFile(USERS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryUsers = parsed;
      return parsed;
    }
  } catch {
    // ignore
  }
  return memoryUsers;
}

async function writeLocalUsers(users: UserRecord[]): Promise<void> {
  memoryUsers = users;
  try {
    await ensureDir();
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

async function readLocalLogs(): Promise<LoginLog[]> {
  try {
    await ensureDir();
    const raw = await fs.readFile(LOGS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryLogs = parsed;
      return parsed;
    }
  } catch {
    // ignore
  }
  return memoryLogs;
}

async function appendLocalLog(log: LoginLog): Promise<void> {
  memoryLogs.unshift(log);
  memoryLogs = memoryLogs.slice(0, 1000);
  try {
    await ensureDir();
    await fs.writeFile(LOGS_FILE, JSON.stringify(memoryLogs, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

// ------------------------------------------------------------
// 1. อ่านรายชื่อผู้ใช้ทั้งหมด (Supabase Cloud + System Record Backup)
// ------------------------------------------------------------
export async function listUsers(): Promise<UserRecord[]> {
  const supabase = getSupabase();
  if (supabase) {
    // 1.1 ลองอ่านจากตาราง public.users ใน Supabase โดยตรง
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: UserRecord[] = data.map((row: any) => ({
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
        memoryUsers = mapped;
        return mapped;
      }
    } catch {
      // ตาราง users อาจยังไม่ได้สร้าง
    }

    // 1.2 หากยังไม่มีตาราง users ให้อ่านจากตาราง inspection_records (system_auth_users)
    try {
      const { data, error } = await supabase
        .from("inspection_records")
        .select("*")
        .eq("id", "system_auth_users")
        .maybeSingle();

      if (!error && data && data.items && Array.isArray(data.items.users) && data.items.users.length > 0) {
        memoryUsers = data.items.users;
        return data.items.users;
      }
    } catch {
      // ignore
    }
  }

  return await readLocalUsers();
}

// ------------------------------------------------------------
// 2. ค้นหาผู้ใช้ตามอีเมล หรือชื่อ (Case-insensitive)
// ------------------------------------------------------------
export async function findUserByEmail(emailOrName: string): Promise<UserRecord | null> {
  const normalized = emailOrName.trim().toLowerCase();
  const allUsers = await listUsers();

  const found = allUsers.find(
    (u) =>
      u.email.toLowerCase() === normalized ||
      u.name.toLowerCase() === normalized ||
      u.name.toLowerCase().replace(/^k\.\s*/i, "").trim() === normalized.replace(/^k\.\s*/i, "").trim()
  );

  if (found) return found;

  // ตรวจสอบกับ DEFAULT_USERS เพิ่มเติม
  const def = DEFAULT_USERS.find(
    (u) =>
      u.email.toLowerCase() === normalized ||
      u.name.toLowerCase() === normalized ||
      u.name.toLowerCase().replace(/^k\.\s*/i, "").trim() === normalized.replace(/^k\.\s*/i, "").trim()
  );

  return def || null;
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
  const normalizedEmail = data.email.trim().toLowerCase();

  const existing = await findUserByEmail(normalizedEmail);
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
    email: normalizedEmail,
    name: data.name.trim(),
    password: data.password,
    role: data.role,
    title: data.title?.trim() || defaultTitle,
    phone: data.phone?.trim() || "-",
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const allUsers = await listUsers();
  const updatedUsers = [newRecord, ...allUsers.filter((u) => u.email.toLowerCase() !== normalizedEmail)];

  // บันทึกลง Supabase
  const supabase = getSupabase();
  if (supabase) {
    // บันทึกลงตาราง users (ถ้ามี)
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
    } catch {
      // ignore
    }

    // บันทึกลง inspection_records system_auth_users เสมอ เพื่อให้ sync บน cloud ได้ 100%
    try {
      await supabase.from("inspection_records").upsert({
        id: "system_auth_users",
        project: { name: "system_auth_storage", updatedAt: now },
        items: { users: updatedUsers },
        saved_at: now,
      });
    } catch (e) {
      console.warn("Supabase system_auth_users upsert warning:", e);
    }
  }

  // บันทึก Local / In-memory
  await writeLocalUsers(updatedUsers);

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

  // 1. บันทึกลง Supabase
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
    } catch {
      // ignore
    }

    // บันทึกลง system_auth_login_logs สำรอง
    try {
      const currentLogs = await listLoginLogs(50);
      const updatedLogs = [logEntry, ...currentLogs.filter((l) => l.id !== logEntry.id)].slice(0, 100);
      await supabase.from("inspection_records").upsert({
        id: "system_auth_login_logs",
        project: { name: "system_auth_login_logs", updatedAt: now },
        items: { logs: updatedLogs },
        saved_at: now,
      });
    } catch {
      // ignore
    }

    // อัปเดต last_login_at ของผู้ใช้
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

  // 2. บันทึก Local File & Memory
  await appendLocalLog(logEntry);

  return logEntry;
}

// ------------------------------------------------------------
// 5. อ่านประวัติการล็อกอิน (Login Logs)
// ------------------------------------------------------------
export async function listLoginLogs(limit = 50): Promise<LoginLog[]> {
  const supabase = getSupabase();
  if (supabase) {
    // 5.1 ลองอ่านจาก public.login_logs ก่อน
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
      // ignore
    }

    // 5.2 ถ้าไม่มีตาราง login_logs ให้อ่านจาก system_auth_login_logs
    try {
      const { data, error } = await supabase
        .from("inspection_records")
        .select("*")
        .eq("id", "system_auth_login_logs")
        .maybeSingle();

      if (!error && data && data.items && Array.isArray(data.items.logs) && data.items.logs.length > 0) {
        return data.items.logs.slice(0, limit);
      }
    } catch {
      // ignore
    }
  }

  const local = await readLocalLogs();
  return local.slice(0, limit);
}
