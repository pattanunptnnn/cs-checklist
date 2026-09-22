// ============================================================
//  types.ts — ชนิดข้อมูล (TypeScript types) ของทั้งระบบ
// ============================================================

// สถานะการตรวจแต่ละรายการ
export type Status = "pass" | "fail" | "na" | "";

// รายการตรวจ 1 ข้อ (มาจากข้อมูล ITP)
export interface ChecklistItem {
  no: string | number;
  name: string;
  crit?: string;      // เกณฑ์การยอมรับ (Acceptance Criteria)
  tool?: string;      // เครื่องมือ/วิธีตรวจ
  hold?: boolean;     // เป็น Hold Point หรือไม่
  measure?: boolean;  // ต้องวัดค่าตัวเลขหรือไม่
  ctype?: string;     // ประเภทเกณฑ์
  cls?: string;       // ระดับความสำคัญ: "วิกฤต" / "สำคัญ"
  pt?: string;        // จุดตรวจ: R/H/W
  cov?: string;       // ความครอบคลุม: "100%" / "สุ่ม"
  photoReq?: boolean; // ต้องมีรูปหรือไม่
  design?: string;    // ค่าออกแบบ (สำหรับรายการทดสอบ)
  unit?: string;      // หน่วย (สำหรับรายการทดสอบ)
}

export interface ChecklistBlock {
  title: string;
  hold?: boolean;
  photo?: string;
  items: ChecklistItem[];
}

export interface ChecklistSection {
  id: string;
  code: string;
  name: string;
  optional?: boolean;
  desc?: string;
  blocks: ChecklistBlock[];
}

export interface ChecklistData {
  form: { formNo: string; rev: string; eff: string; title: string };
  projectFields: [string, string][];
  sections: ChecklistSection[];
  tests: { id: string; code: string; name: string; desc?: string; items: ChecklistItem[] };
  signRoles: [string, string][];
  approveOpts: string[];
}

// ---------- ข้อมูลที่ผู้ใช้กรอก ----------

// ผลตรวจของรายการ 1 ข้อ
export interface ItemResult {
  status: Status;
  note?: string;
  actual?: string;    // ค่าที่วัดได้จริง
  photos?: string[];  // รายการ URL ของรูป เช่น /uploads/xxxx.jpg
}

// ผลทดสอบในหมวด Tests
export interface TestResult {
  actual?: string;
  passed?: boolean | null; // true = ผ่าน, false = ไม่ผ่าน, null = ยังไม่ได้ตรวจ
  note?: string;
  photos?: string[];
}

// ข้อมูลการลงนาม
export interface SignatureData {
  name: string;
  date: string;
  roleTitle?: string;
  signed?: boolean;
}

// ข้อมูลการเช็คอินหน้างานของ PM ด้วย QR Code + GPS
export interface CheckInData {
  timestamp: string;      // เวลาที่สแกนเช็คอิน ISO
  inspectorName?: string; // ชื่อ PM หรือผู้ตรวจ
  siteCode?: string;      // รหัสไซต์งานที่ได้จาก QR
  lat?: number;           // ละติจูด GPS จริง
  lng?: number;           // ลองจิจูด GPS จริง
  accuracy?: number;      // ความแม่นยำ (เมตร)
  address?: string;       // รายละเอียดตำแหน่ง
  verified: boolean;      // เช็คอินสำเร็จหรือไม่
}

// ใบตรวจรับ 1 ใบ
export interface InspectionRecord {
  id: string;
  project: Record<string, string>;
  items: Record<string, ItemResult>; // key = `${sectionId}|${blockIndex}|${itemIndex}`
  testResults?: Record<string, TestResult>; // key = `test_${itemIndex}`
  signatures?: Record<string, SignatureData>; // key = "prep" | "check" | "approve"
  approvalStatus?: string; // เช่น "รอตรวจ", "อนุมัติให้ดำเนินการต่อ", etc.
  approvalComment?: string;
  checkIn?: CheckInData | null; // ข้อมูลเช็คอินเข้าพื้นที่
  savedAt: string | null;
  createdAt?: number;
}

// ข้อมูลสรุปสำหรับหน้ารายการ
export interface RecordSummary {
  id: string;
  project: Record<string, string>;
  savedAt: string | null;
  pass: number;
  fail: number;
  filled: number;
  approvalStatus?: string;
  checkInVerified?: boolean;
  checkIn?: CheckInData | null;
}

// สถานะความตรงต่อเวลา
export type PunctualityStatus = "on_time" | "late" | "missing";

// สรุปประวัติการเข้าไซต์งานของ PM
export interface PMSiteVisit {
  recordId: string;
  storeName: string;
  storeCode: string;
  contractor: string;
  pmName: string;
  scheduledDate: string;      // วันที่นัดตรวจ (inspDate)
  checkInTimestamp: string | null; // เวลาเช็คอินจริง
  punctuality: PunctualityStatus;
  punctualityNote: string;
  verified: boolean;
  lat?: number;
  lng?: number;
  accuracy?: number;
  siteCode?: string;
  filledCount: number;
  passCount: number;
  failCount: number;
  approvalStatus: string;
}

// สรุปสถิติ Performance ของ PM แต่ละคน
export interface PMPerformance {
  pmName: string;
  totalSites: number;
  verifiedSites: number;
  onTimeSites: number;
  lateSites: number;
  missingSites: number;
  onTimeRate: number;      // % ความตรงต่อเวลา
  verificationRate: number;// % การเข้าตรวจหน้างานจริง
  totalPassed: number;
  totalFailed: number;     // จำนวนข้อบกพร่องที่ตรวจพบ
  totalFilled: number;
  completionRate: number;  // % การตรวจครบถ้วน
  performanceScore: number;// คะแนนรวม 0-100
  tier: "ยอดเยี่ยม" | "ดีมาก" | "มาตรฐาน" | "ต้องปรับปรุง";
  visits: PMSiteVisit[];
}

// ============================================================
//  ระบบตรวจ Defect รายสัปดาห์ (Weekly Defect Inspection)
// ============================================================

export type DefectSeverity = "critical" | "major" | "minor";
export type DefectStatus = "open" | "in_progress" | "resolved" | "closed";
export type DefectCategory =
  | "โครงสร้าง"
  | "สถาปัตย์"
  | "สีและผนัง"
  | "พื้นและกระเบื้อง"
  | "ระบบ MEP"
  | "หลังคาและกันซึม"
  | "ความปลอดภัย"
  | "ทั่วไป";

// รายการ Defect 1 จุด
export interface DefectItem {
  id: string;
  itemNo: number;
  category: DefectCategory;
  location: string;       // ตำแหน่งหน้างาน เช่น เสา C3, ห้องน้ำ, บริเวณทางลาด
  description: string;    // รายละเอียดข้อบกพร่อง
  severity: DefectSeverity;
  status: DefectStatus;
  dueDate?: string;       // กำหนดแก้ไขเสร็จ
  beforePhotos: string[]; // รูปก่อนแก้ (มีลายน้ำ)
  afterPhotos: string[];  // รูปหลังแก้ (มีลายน้ำ)
  contractorNote?: string;// หมายเหตุผู้รับเหมา
  pmComment?: string;     // ความเห็น PM ผู้ตรวจ
  createdAt: string;
  resolvedAt?: string;
  closedAt?: string;
}

// ใบรอบตรวจ Defect ประจำสัปดาห์ 1 ใบ
export interface WeeklyDefectRecord {
  id: string;
  store: string;
  storeCode: string;
  weekNumber: number;     // สัปดาห์ที่ (1, 2, 3...)
  weekTitle?: string;     // เช่น "สัปดาห์ที่ 2 (งานผนังและงานระบบ)"
  inspDate: string;       // วันที่ตรวจ
  contractor: string;
  pm: string;
  checkIn?: CheckInData | null; // พิกัด GPS & QR เช็คอิน
  defects: DefectItem[];
  overallNote?: string;
  savedAt: string | null;
  createdAt?: number;
}

// ข้อมูลสรุปสำหรับหน้ารายการ Weekly Defect
export interface WeeklyDefectSummary {
  id: string;
  store: string;
  storeCode: string;
  weekNumber: number;
  inspDate: string;
  contractor: string;
  pm: string;
  totalDefects: number;
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  closedCount: number;
  criticalCount: number;
  resolutionRate: number; // % แก้เสร็จ (closed / total)
  checkInVerified: boolean;
  savedAt: string | null;
}

