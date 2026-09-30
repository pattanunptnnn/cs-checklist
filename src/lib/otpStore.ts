// ============================================================
//  otpStore.ts — ระบบสร้าง จัดเก็บ และตรวจสอบรหัส OTP สำหรับยืนยันอีเมล
// ============================================================
import { promises as fs } from "fs";
import path from "path";
import { getSupabase } from "./supabase";

interface OtpEntry {
  otp: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

const memoryStore = new Map<string, OtpEntry>();
const OTP_FILE = path.join(process.cwd(), "data", "otps.json");
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 นาที
const MAX_ATTEMPTS = 5;

async function ensureDataDir() {
  const dir = path.join(process.cwd(), "data");
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // ignore
  }
}

async function loadPersistedOtps(): Promise<Record<string, OtpEntry>> {
  try {
    const raw = await fs.readFile(OTP_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function savePersistedOtps(data: Record<string, OtpEntry>): Promise<void> {
  try {
    await ensureDataDir();
    await fs.writeFile(OTP_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // ignore
  }
}

/**
 * สร้างและจัดเก็บรหัส OTP 6 หลักสำหรับอีเมล พร้อมส่งคำขอไปยัง Supabase Auth (ถ้าเป็นอีเมลจริง)
 */
export async function createOtp(email: string): Promise<{
  otp: string;
  expiresAt: number;
  supabaseTriggered: boolean;
}> {
  const normalizedEmail = email.trim().toLowerCase();
  
  // สุ่มรหัส 6 หลัก
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Date.now();
  const expiresAt = now + OTP_EXPIRY_MS;

  const entry: OtpEntry = {
    otp,
    expiresAt,
    attempts: 0,
    createdAt: now,
  };

  // เก็บใน memory
  memoryStore.set(normalizedEmail, entry);

  // เก็บในไฟล์สำรอง
  const persisted = await loadPersistedOtps();
  persisted[normalizedEmail] = entry;
  await savePersistedOtps(persisted);

  // ส่งคำขอไปยัง Supabase Auth (ถ้าเป็นเมลจริง Supabase จะส่ง OTP / Magic link ให้)
  let supabaseTriggered = false;
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
        },
      });
      if (!error) {
        supabaseTriggered = true;
      }
    } catch (e) {
      console.warn("Supabase signInWithOtp optional send:", e);
    }
  }

  return {
    otp,
    expiresAt,
    supabaseTriggered,
  };
}

/**
 * ตรวจสอบรหัส OTP ที่ผู้ใช้กรอก
 */
export async function verifyOtpCode(
  email: string,
  inputOtp: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanInput = inputOtp.trim();

  // ดึงจาก memory หรือไฟล์
  let entry = memoryStore.get(normalizedEmail);
  if (!entry) {
    const persisted = await loadPersistedOtps();
    entry = persisted[normalizedEmail];
  }

  if (!entry) {
    return {
      success: false,
      error: "ไม่พบคำขอรหัส OTP สำหรับอีเมลนี้ กรุณากดขอรหัสใหม่",
    };
  }

  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(normalizedEmail);
    return {
      success: false,
      error: "รหัส OTP หมดอายุแล้ว (เกิน 5 นาที) กรุณากดขอรหัสใหม่อีกครั้ง",
    };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    return {
      success: false,
      error: "กรอกรหัสผิดเกินจำนวนครั้งที่กำหนด กรุณากดขอรหัสใหม่",
    };
  }

  // ตรวจสอบรหัสตรงกันหรือไม่
  if (entry.otp !== cleanInput) {
    entry.attempts += 1;
    memoryStore.set(normalizedEmail, entry);
    
    // ลองเช็คกับ Supabase verifyOtp เผื่อผู้ใช้ใช้ token จาก Supabase email โดยตรง
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token: cleanInput,
          type: "email",
        });
        if (!error) {
          // Supabase ยืนยันผ่าน
          memoryStore.delete(normalizedEmail);
          const persisted = await loadPersistedOtps();
          delete persisted[normalizedEmail];
          await savePersistedOtps(persisted);
          return { success: true };
        }
      } catch {
        // ignore
      }
    }

    return {
      success: false,
      error: `รหัส OTP ไม่ถูกต้อง (เหลือโอกาสกรอกอีก ${MAX_ATTEMPTS - entry.attempts} ครั้ง)`,
    };
  }

  // รหัสถูกต้อง เคลียร์รหัสออกจาก Store
  memoryStore.delete(normalizedEmail);
  const persisted = await loadPersistedOtps();
  delete persisted[normalizedEmail];
  await savePersistedOtps(persisted);

  return { success: true };
}
