// ============================================================
//  defectStore.ts — ที่เก็บข้อมูลการตรวจ Defect รายสัปดาห์
//  รองรับทั้ง Supabase Cloud Database และ Local JSON (Fallback)
// ============================================================
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { WeeklyDefectRecord, WeeklyDefectSummary } from "./types";
import { getSupabase } from "./supabase";

const DIR = path.join(process.cwd(), "data", "defects");

async function ensureDir() {
  await fs.mkdir(DIR, { recursive: true });
}

function fileOf(id: string) {
  const safe = String(id).replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(DIR, safe + ".json");
}

function summarizeDefects(defects: any[] = []) {
  const totalDefects = defects.length;
  const openCount = defects.filter((d) => d.status === "open").length;
  const inProgressCount = defects.filter((d) => d.status === "in_progress").length;
  const resolvedCount = defects.filter((d) => d.status === "resolved").length;
  const closedCount = defects.filter((d) => d.status === "closed").length;
  const criticalCount = defects.filter((d) => d.severity === "critical" && d.status !== "closed").length;
  const resolutionRate = totalDefects > 0 ? Math.round((closedCount / totalDefects) * 100) : 0;

  return {
    totalDefects,
    openCount,
    inProgressCount,
    resolvedCount,
    closedCount,
    criticalCount,
    resolutionRate,
  };
}

// ------------------------------------------------------------
// 1. อ่านรายการรอบตรวจ Defect ทั้งหมด
// ------------------------------------------------------------
export async function listWeeklyRecords(): Promise<WeeklyDefectSummary[]> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("weekly_defects")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((row: any) => {
          const defects = row.defects || [];
          const stats = summarizeDefects(defects);
          return {
            id: row.id,
            store: row.store || "(ยังไม่ระบุชื่อสาขา)",
            storeCode: row.store_code || "-",
            weekNumber: row.week_number || 1,
            inspDate: row.insp_date || "",
            contractor: row.contractor || "ผู้รับเหมาทั่วไป",
            pm: row.pm || "วิศวกรผู้ตรวจ",
            ...stats,
            checkInVerified: Boolean(row.check_in?.verified),
            savedAt: row.saved_at || null,
          };
        });
      }
    } catch (e) {
      console.warn("Supabase listWeeklyRecords failed, falling back to local files:", e);
    }
  }

  // Fallback อ่านจากไฟล์ในเครื่อง
  await ensureDir();
  const files = (await fs.readdir(DIR)).filter((f) => f.endsWith(".json"));
  const rows: WeeklyDefectSummary[] = [];

  for (const f of files) {
    try {
      const rec = JSON.parse(await fs.readFile(path.join(DIR, f), "utf8")) as WeeklyDefectRecord;
      const defects = rec.defects || [];
      const stats = summarizeDefects(defects);

      rows.push({
        id: f.replace(/\.json$/, ""),
        store: rec.store || "(ยังไม่ระบุชื่อสาขา)",
        storeCode: rec.storeCode || "-",
        weekNumber: rec.weekNumber || 1,
        inspDate: rec.inspDate || "",
        contractor: rec.contractor || "ผู้รับเหมาทั่วไป",
        pm: rec.pm || "วิศวกรผู้ตรวจ",
        ...stats,
        checkInVerified: Boolean(rec.checkIn?.verified),
        savedAt: rec.savedAt || null,
      });
    } catch {
      // ข้ามไฟล์เสีย
    }
  }

  rows.sort((a, b) => {
    const timeA = a.savedAt || a.inspDate || "";
    const timeB = b.savedAt || b.inspDate || "";
    return timeB.localeCompare(timeA);
  });

  return rows;
}

// ------------------------------------------------------------
// 2. อ่านข้อมูลรอบตรวจ 1 ใบ
// ------------------------------------------------------------
export async function getWeeklyRecord(id: string): Promise<WeeklyDefectRecord | null> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("weekly_defects")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          store: data.store || "",
          storeCode: data.store_code || "",
          weekNumber: data.week_number || 1,
          weekTitle: data.week_title || `ตรวจ Defect ประจำสัปดาห์ที่ ${data.week_number || 1}`,
          inspDate: data.insp_date || "",
          contractor: data.contractor || "",
          pm: data.pm || "",
          checkIn: data.check_in || null,
          defects: data.defects || [],
          overallNote: data.overall_note || "",
          savedAt: data.saved_at || null,
          createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
        };
      }
    } catch (e) {
      console.warn(`Supabase getWeeklyRecord(${id}) failed, falling back to local:`, e);
    }
  }

  try {
    return JSON.parse(await fs.readFile(fileOf(id), "utf8")) as WeeklyDefectRecord;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// 3. สร้างรอบตรวจ Defect ใหม่
// ------------------------------------------------------------
export async function createWeeklyRecord(data: Partial<WeeklyDefectRecord>): Promise<string> {
  const id = crypto.randomUUID();
  const rec: WeeklyDefectRecord = {
    id,
    store: data.store || "",
    storeCode: data.storeCode || "",
    weekNumber: data.weekNumber || 1,
    weekTitle: data.weekTitle || `ตรวจ Defect ประจำสัปดาห์ที่ ${data.weekNumber || 1}`,
    inspDate: data.inspDate || new Date().toISOString().slice(0, 10),
    contractor: data.contractor || "",
    pm: data.pm || "",
    checkIn: data.checkIn || null,
    defects: data.defects || [],
    overallNote: data.overallNote || "",
    savedAt: new Date().toISOString(),
    createdAt: Date.now(),
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("weekly_defects").insert({
        id,
        store: rec.store,
        store_code: rec.storeCode,
        week_number: rec.weekNumber,
        week_title: rec.weekTitle,
        insp_date: rec.inspDate,
        contractor: rec.contractor,
        pm: rec.pm,
        check_in: rec.checkIn,
        defects: rec.defects,
        overall_note: rec.overallNote,
        saved_at: rec.savedAt,
      });
    } catch (e) {
      console.error("Supabase createWeeklyRecord error:", e);
    }
  }

  try {
    await ensureDir();
    await fs.writeFile(fileOf(id), JSON.stringify(rec, null, 2), "utf8");
  } catch {
    // ignore
  }

  return id;
}

// ------------------------------------------------------------
// 4. บันทึก / แก้ไขรอบตรวจ Defect
// ------------------------------------------------------------
export async function saveWeeklyRecord(record: WeeklyDefectRecord): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("weekly_defects").upsert({
        id: record.id,
        store: record.store,
        store_code: record.storeCode,
        week_number: record.weekNumber,
        week_title: record.weekTitle,
        insp_date: record.inspDate,
        contractor: record.contractor,
        pm: record.pm,
        check_in: record.checkIn,
        defects: record.defects,
        overall_note: record.overallNote,
        saved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Supabase saveWeeklyRecord error:", e);
    }
  }

  try {
    await ensureDir();
    await fs.writeFile(fileOf(record.id), JSON.stringify(record, null, 2), "utf8");
  } catch {
    // ignore
  }
}

// ------------------------------------------------------------
// 5. ลบรอบตรวจ Defect
// ------------------------------------------------------------
export async function deleteWeeklyRecord(id: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("weekly_defects").delete().eq("id", id);
    } catch (e) {
      console.error("Supabase deleteWeeklyRecord error:", e);
    }
  }

  try {
    await fs.unlink(fileOf(id));
  } catch {
    // ignore
  }
}
