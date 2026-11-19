// ============================================================
//  store.ts — ที่เก็บข้อมูลใบตรวจ
//  รองรับทั้ง Supabase Cloud Database และ Local JSON (Fallback)
// ============================================================
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { InspectionRecord, RecordSummary } from "./types";
import { getSupabase } from "./supabase";

const DIR = path.join(process.cwd(), "data", "records");

async function ensureDir() {
  try {
    await fs.mkdir(DIR, { recursive: true });
  } catch {
    // ป้องกัน error บนสภาพแวดล้อม read-only เช่น Vercel Serverless
  }
}

function fileOf(id: string) {
  const safe = String(id).replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(DIR, safe + ".json");
}

function calculateSummary(rec: InspectionRecord): { pass: number; fail: number; filled: number } {
  let pass = 0, fail = 0, filled = 0;
  for (const k of Object.keys(rec.items || {})) {
    const st = rec.items[k]?.status;
    if (st) {
      filled++;
      if (st === "pass") pass++;
      else if (st === "fail") fail++;
    }
  }
  return { pass, fail, filled };
}

// Cache สำหรับเก็บผลลัพธ์เพื่อประสิทธิภาพสูง ไม่โหลดซ้ำซ้อน
let cachedRecords: { data: RecordSummary[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 15000; // แคช 15 วินาที

export function invalidateRecordsCache() {
  cachedRecords = null;
}

// ------------------------------------------------------------
// 1. อ่านรายการใบตรวจทั้งหมด (ครบทุกใบ ไม่ตัดทอน)
// ------------------------------------------------------------
export async function listRecords(): Promise<RecordSummary[]> {
  if (cachedRecords && Date.now() - cachedRecords.timestamp < CACHE_TTL_MS) {
    return cachedRecords.data;
  }

  const supabase = getSupabase();

  if (supabase) {
    try {
      const pageSize = 25;
      const allRows: any[] = [];
      let page = 0;
      const maxPages = 20;

      while (page < maxPages) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        // ดึงทีละชุดเพื่อป้องกัน Supabase Statement Timeout
        const { data, error } = await supabase
          .from("inspection_records")
          .select("id, project, items, check_in, approval_status, saved_at, created_at")
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) {
          console.warn(`Supabase listRecords chunk ${page} error, trying lightweight:`, error.message);
          const { data: lightData, error: lightError } = await supabase
            .from("inspection_records")
            .select("id, project, check_in, approval_status, saved_at, created_at")
            .order("created_at", { ascending: false })
            .range(from, to);

          if (!lightError && Array.isArray(lightData) && lightData.length > 0) {
            allRows.push(...lightData);
            if (lightData.length < pageSize) break;
            page++;
            continue;
          }
          break;
        }

        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < pageSize) break;
        page++;
      }

      if (allRows.length > 0) {
        const validRows = allRows.filter((row: any) => row.id && !String(row.id).startsWith("system_"));
        const results: RecordSummary[] = validRows.map((row: any) => {
          const rec: InspectionRecord = {
            id: row.id,
            project: row.project || {},
            items: row.items || {},
            checkIn: row.check_in || null,
            approvalStatus: row.approval_status || "รอตรวจ",
            savedAt: row.saved_at || null,
          };
          const { pass, fail, filled } = calculateSummary(rec);
          const p = rec.project || {};
          const finalPass = pass > 0 ? pass : Number(p.passCount || p.pass || 0);
          const finalFail = fail > 0 ? fail : Number(p.failCount || p.fail || 0);
          const finalFilled = filled > 0 ? filled : Number(p.filledCount || p.filled || (finalPass + finalFail));

          let photoCount = 0;
          if (rec.items && typeof rec.items === "object") {
            for (const k of Object.keys(rec.items)) {
              const pArr = (rec.items as any)[k]?.photos;
              if (Array.isArray(pArr)) photoCount += pArr.length;
            }
          }

          return {
            id: rec.id,
            project: rec.project,
            savedAt: rec.savedAt,
            pass: finalPass,
            fail: finalFail,
            filled: finalFilled,
            approvalStatus: rec.approvalStatus,
            checkInVerified: Boolean(row.check_in?.verified),
            checkIn: row.check_in || null,
            hasSelfie: Boolean(row.check_in?.selfiePhoto),
            selfiePhoto: row.check_in?.selfiePhoto,
            photoCount,
            hasPhotos: photoCount > 0,
          };
        });

        cachedRecords = { data: results, timestamp: Date.now() };
        return results;
      }
    } catch (e) {
      console.warn("Supabase listRecords failed, falling back to local files:", e);
    }
  }

  // Fallback อ่านจากโฟลเดอร์ในเครื่อง (Safe with try/catch)
  try {
    await ensureDir();
    const files = (await fs.readdir(DIR)).filter((f) => f.endsWith(".json"));
    const rows: RecordSummary[] = [];

    for (const f of files) {
      try {
        const rec = JSON.parse(await fs.readFile(path.join(DIR, f), "utf8")) as InspectionRecord;
        const { pass, fail, filled } = calculateSummary(rec);
        let photoCount = 0;
        if (rec.items && typeof rec.items === "object") {
          for (const k of Object.keys(rec.items)) {
            const pArr = (rec.items as any)[k]?.photos;
            if (Array.isArray(pArr)) photoCount += pArr.length;
          }
        }
        rows.push({
          id: f.replace(/\.json$/, ""),
          project: rec.project || {},
          savedAt: rec.savedAt || null,
          pass,
          fail,
          filled,
          approvalStatus: rec.approvalStatus || undefined,
          checkInVerified: Boolean(rec.checkIn?.verified),
          checkIn: rec.checkIn || null,
          hasSelfie: Boolean(rec.checkIn?.selfiePhoto),
          selfiePhoto: rec.checkIn?.selfiePhoto,
          photoCount,
          hasPhotos: photoCount > 0,
        });
      } catch {
        // ข้ามไฟล์ที่เสีย
      }
    }

    rows.sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
    return rows;
  } catch (fsErr) {
    console.warn("Local storage read error, returning empty list:", fsErr);
    return [];
  }
}

// ------------------------------------------------------------
// 2. อ่านข้อมูลใบตรวจ 1 ใบ
// ------------------------------------------------------------
export async function getRecord(id: string): Promise<InspectionRecord | null> {
  if (String(id).startsWith("system_")) return null;
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("inspection_records")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          project: data.project || {},
          items: data.items || {},
          testResults: data.project?.testResults || {},
          signatures: data.project?.signatures || {},
          approvalStatus: data.approval_status || "รอตรวจ",
          approvalComment: data.project?.approvalComment || "",
          checkIn: data.check_in || null,
          savedAt: data.saved_at || null,
          createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
        };
      }
    } catch (e) {
      console.warn(`Supabase getRecord(${id}) failed, falling back to local:`, e);
    }
  }

  // Fallback อ่านจากไฟล์ในเครื่อง
  try {
    return JSON.parse(await fs.readFile(fileOf(id), "utf8")) as InspectionRecord;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// 3. สร้างใบตรวจใหม่
// ------------------------------------------------------------
export async function createRecord(rec: Partial<InspectionRecord>): Promise<string> {
  const id = crypto.randomUUID();
  const full: InspectionRecord = {
    id,
    project: rec.project || {},
    items: rec.items || {},
    testResults: rec.testResults || {},
    signatures: rec.signatures || {},
    approvalStatus: rec.approvalStatus || "รอตรวจ",
    approvalComment: rec.approvalComment || "",
    checkIn: rec.checkIn || null,
    savedAt: rec.savedAt ?? null,
    createdAt: Date.now(),
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("inspection_records").insert({
        id,
        project: {
          ...full.project,
          testResults: full.testResults,
          signatures: full.signatures,
          approvalComment: full.approvalComment,
        },
        items: full.items,
        check_in: full.checkIn,
        approval_status: full.approvalStatus,
        saved_at: full.savedAt,
      });
    } catch (e) {
      console.error("Supabase createRecord error:", e);
    }
  }

  // บันทึกลง Local File เผื่อไว้
  try {
    await ensureDir();
    await fs.writeFile(fileOf(id), JSON.stringify(full, null, 2), "utf8");
  } catch {
    // ignore local write failure
  }

  // ล้างแคชเพื่อให้ดึงข้อมูลใหม่ทันที
  invalidateRecordsCache();
  return id;
}

// ------------------------------------------------------------
// 4. บันทึก / แก้ไขใบตรวจ
// ------------------------------------------------------------
export async function saveRecord(id: string, rec: Partial<InspectionRecord>): Promise<void> {
  const existing = await getRecord(id);
  const full: InspectionRecord = {
    id,
    project: rec.project || existing?.project || {},
    items: rec.items || existing?.items || {},
    testResults: rec.testResults || existing?.testResults || {},
    signatures: rec.signatures || existing?.signatures || {},
    approvalStatus: rec.approvalStatus || existing?.approvalStatus || "รอตรวจ",
    approvalComment: rec.approvalComment ?? existing?.approvalComment ?? "",
    checkIn: rec.checkIn !== undefined ? rec.checkIn : (existing?.checkIn || null),
    savedAt: rec.savedAt ?? new Date().toISOString(),
    createdAt: existing?.createdAt ?? Date.now(),
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("inspection_records").upsert({
        id,
        project: {
          ...full.project,
          testResults: full.testResults,
          signatures: full.signatures,
          approvalComment: full.approvalComment,
        },
        items: full.items,
        check_in: full.checkIn,
        approval_status: full.approvalStatus,
        saved_at: full.savedAt,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Supabase saveRecord error:", e);
    }
  }

  // บันทึกลง Local File ด้วย
  try {
    await ensureDir();
    await fs.writeFile(fileOf(id), JSON.stringify(full, null, 2), "utf8");
  } catch {
    // ignore
  }

  // ล้างแคช
  invalidateRecordsCache();
}

// ------------------------------------------------------------
// 5. ลบใบตรวจ
// ------------------------------------------------------------
export async function deleteRecord(id: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("inspection_records").delete().eq("id", id);
    } catch (e) {
      console.error("Supabase deleteRecord error:", e);
    }
  }

  try {
    await fs.unlink(fileOf(id));
  } catch {
    // ignore if file doesn't exist
  }

  // ล้างแคช
  invalidateRecordsCache();
}
