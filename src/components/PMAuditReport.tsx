"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { BIGC_PMS } from "@/lib/auth";
import type { RecordSummary, WeeklyDefectSummary } from "@/lib/types";
import {
  Printer,
  ArrowLeft,
  Building2,
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  ImageIcon,
  ShieldCheck,
  Calendar,
  Layers,
  Wrench,
  Search,
  ExternalLink,
  ChevronDown,
  XCircle,
} from "lucide-react";

// แปลงชื่อ PM ให้ตรงกับรายชื่อมาตรฐาน Big-C
function matchPmName(rawPmName?: string): string {
  if (!rawPmName) return "ไม่ระบุชื่อ PM";
  const clean = rawPmName
    .replace(/^K\.\s*/i, "")
    .replace(/\s*\([^)]*\)$/, "")
    .trim()
    .toLowerCase();
  const found = BIGC_PMS.find((bp) => {
    const bpClean = bp.name.replace(/^K\.\s*/i, "").trim().toLowerCase();
    return clean === bpClean || clean.includes(bpClean) || bpClean.includes(clean);
  });
  return found ? found.name : rawPmName.trim();
}

function fmtDate(isoOrDate: string | null | undefined): string {
  if (!isoOrDate) return "-";
  try {
    const d = new Date(isoOrDate);
    if (isNaN(d.getTime())) return isoOrDate;
    return d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return isoOrDate;
  }
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return (
      new Date(iso).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " น."
    );
  } catch {
    return "";
  }
}

interface StoreItemInspection {
  id: string;
  kind: "itp" | "weekly";
  typeLabel: string;
  storeName: string;
  storeCode: string;
  dateStr: string;
  checkInVerified: boolean;
  checkInTimestamp: string | null;
  lat?: number;
  lng?: number;
  hasSelfie: boolean;
  selfiePhoto?: string;
  hasInspectionPhotos: boolean;
  inspectionPhotoCount: number;
  defectCount: number;
  hasDefectPhotos: boolean;
  defectPhotoCount: number;
  // ผลการตรวจจริง: ถ้าไม่มีรูปถ่ายตรวจ ต้องขึ้น 0% ไม่ใช่ 100%
  completionRate: number;
  statusLabel: string;
  remark?: string;
}

interface PMAuditData {
  name: string;
  zone: string;
  // Total visits/records
  totalInspections: number;
  itpCount: number;
  weeklyCount: number;
  // Unique store count
  uniqueStoresCount: number;
  // Check-in
  checkInCount: number;
  checkInRate: number;
  // Selfie
  selfieCount: number;
  selfieRate: number;
  // Actual inspection with attached photos (หลักฐานการตรวจจริง)
  inspectedWithPhotosCount: number;
  inspectedWithPhotosRate: number; // % สาขาที่มีรูปตรวจจริง
  totalInspectionPhotos: number;
  // Defect branches & points
  defectBranchesCount: number;
  totalDefects: number;
  // Defect attached photos
  defectPhotosBranchesCount: number;
  totalDefectPhotos: number;
  // Stores detail list
  stores: StoreItemInspection[];
}

export default function PMAuditReport() {
  const [records, setRecords] = useState<RecordSummary[] | null>(null);
  const [weeklyDefects, setWeeklyDefects] = useState<WeeklyDefectSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPm, setSelectedPm] = useState<string>("all");
  const [showSelfieThumbnails, setShowSelfieThumbnails] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [recRes, defRes] = await Promise.all([
          fetch("/api/records"),
          fetch("/api/defects"),
        ]);
        if (recRes.ok) setRecords(await recRes.json());
        if (defRes.ok) setWeeklyDefects(await defRes.json());
      } catch (err) {
        console.error("Failed to load audit report data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // รวมและคำนวณข้อมูลตามรายชื่อ PM ให้ครบทุกรายการในฐานข้อมูล (ทั้ง ITP และ Weekly Defect)
  const pmAuditList = useMemo<PMAuditData[]>(() => {
    const recs = records || [];
    const defs = weeklyDefects || [];

    // แผนที่เก็บข้อมูลของแต่ละ PM
    const pmMap = new Map<string, StoreItemInspection[]>();

    // 1. เริ่มต้นใส่ PM ทางการทั้ง 7 ท่านเสมอ
    for (const p of BIGC_PMS) {
      pmMap.set(p.name, []);
    }

    // 2. นำข้อมูล ITP (โครงสร้าง) เข้าแมป
    for (const r of recs) {
      const p = r.project || {};
      const rawPm = (p.pm || r.checkIn?.inspectorName || "").trim();
      const pmName = matchPmName(rawPm);

      // ดึงชื่อสาขาอย่างชาญฉลาด ไม่ให้ซ้ำเป็น DEMO code
      let storeName = p.store || p.storeName || p.branch || "";
      if (!storeName) {
        if (r.checkIn?.address && r.checkIn.address !== "หน้างาน Big-C Mini") {
          storeName = r.checkIn.address;
        } else if (p.storeCode && p.storeCode !== "BIGC-SITE-DEMO") {
          storeName = `บิ๊กซี มินิ (รหัส ${p.storeCode})`;
        } else if (r.checkIn?.lat && r.checkIn?.lng) {
          storeName = `บิ๊กซี มินิ (พิกัด ${r.checkIn.lat.toFixed(4)}, ${r.checkIn.lng.toFixed(4)})`;
        } else {
          storeName = `บิ๊กซี มินิ (ใบงาน #${r.id.slice(0, 8)})`;
        }
      }

      const storeCode =
        p.storeCode && p.storeCode !== "BIGC-SITE-DEMO"
          ? p.storeCode
          : r.checkIn?.siteCode && r.checkIn.siteCode !== "BIGC-SITE-DEMO"
          ? r.checkIn.siteCode
          : "-";

      const isVerified = Boolean(r.checkInVerified || r.checkIn?.verified);
      const hasSelfie = Boolean(r.hasSelfie || r.checkIn?.selfiePhoto);
      const photoCount = r.photoCount || 0;
      const failCount = r.fail || 0;
      const hasPhotos = photoCount > 0;

      // กฎสำคัญ: ถ้าไม่มีรูปถ่ายว่าตรวจจริง ต้องขึ้น 0% ไม่ใช่ 100%
      const completionRate = hasPhotos ? 100 : 0;

      const item: StoreItemInspection = {
        id: r.id,
        kind: "itp",
        typeLabel: "ตรวจโครงสร้าง ITP",
        storeName,
        storeCode,
        dateStr: p.inspDate || fmtDate(r.checkIn?.timestamp || r.savedAt),
        checkInVerified: isVerified,
        checkInTimestamp: r.checkIn?.timestamp || null,
        lat: r.checkIn?.lat,
        lng: r.checkIn?.lng,
        hasSelfie,
        selfiePhoto: r.selfiePhoto || r.checkIn?.selfiePhoto,
        hasInspectionPhotos: hasPhotos,
        inspectionPhotoCount: photoCount,
        defectCount: failCount,
        hasDefectPhotos: failCount > 0 && photoCount > 0,
        defectPhotoCount: failCount > 0 ? photoCount : 0,
        completionRate,
        statusLabel: !hasPhotos
          ? "0% (ไม่มีรูปตรวจยืนยัน)"
          : failCount > 0
          ? `พบจุดแก้ไข ${failCount} ข้อ (มีรูป ${photoCount} รูป)`
          : `ผ่าน 100% (มีรูป ${photoCount} รูป)`,
        remark: p.remark,
      };

      const existing = pmMap.get(pmName) || [];
      existing.push(item);
      pmMap.set(pmName, existing);
    }

    // 3. นำข้อมูล Weekly Defect เข้าแมป
    for (const w of defs) {
      const pmName = matchPmName(w.pm);
      const isVerified = Boolean(w.checkInVerified || w.checkIn?.verified);
      const hasSelfie = Boolean(w.hasSelfie || w.checkIn?.selfiePhoto);
      const photoCount = w.photoCount || 0;
      const defectCount = w.totalDefects || 0;
      const doneCount = (w.closedCount || 0) + (w.resolvedCount || 0);
      const hasPhotos = photoCount > 0;

      // กฎสำคัญ: ถ้าไม่มีรูปถ่ายว่าตรวจจริง ต้องขึ้น 0% ไม่ใช่ 100%
      let completionRate = 0;
      if (hasPhotos) {
        if (defectCount > 0) {
          completionRate = Math.round((doneCount / defectCount) * 100);
        } else {
          completionRate = 100;
        }
      }

      const item: StoreItemInspection = {
        id: w.id,
        kind: "weekly",
        typeLabel: `Defect วีค ${w.weekNumber}`,
        storeName: w.store || "บิ๊กซี มินิ",
        storeCode: w.storeCode && w.storeCode !== "BIGC-SITE-DEMO" ? w.storeCode : "-",
        dateStr: w.inspDate || fmtDate(w.checkIn?.timestamp || w.savedAt),
        checkInVerified: isVerified,
        checkInTimestamp: w.checkIn?.timestamp || null,
        lat: w.checkIn?.lat,
        lng: w.checkIn?.lng,
        hasSelfie,
        selfiePhoto: w.selfiePhoto || w.checkIn?.selfiePhoto,
        hasInspectionPhotos: hasPhotos,
        inspectionPhotoCount: photoCount,
        defectCount,
        hasDefectPhotos: hasPhotos,
        defectPhotoCount: photoCount,
        completionRate,
        statusLabel: !hasPhotos
          ? "0% (ไม่มีรูปตรวจยืนยัน)"
          : defectCount === 0
          ? `ไม่มี Defect (มีรูป ${photoCount} รูป)`
          : `พบ ${defectCount} จุด (${doneCount} แก้แล้ว / มีรูป ${photoCount} รูป)`,
        remark: w.overallNote,
      };

      const existing = pmMap.get(pmName) || [];
      existing.push(item);
      pmMap.set(pmName, existing);
    }

    // 4. คำนวณสรุปสถิติตามโจทย์ของผู้บริหาร
    const result: PMAuditData[] = [];

    pmMap.forEach((stores, name) => {
      // ข้าม PM ที่ไม่มีข้อมูลเลยและไม่ใช่ 7 PM หลัก
      if (stores.length === 0 && !BIGC_PMS.some((p) => p.name === name)) {
        return;
      }

      const pmInfo = BIGC_PMS.find((p) => p.name === name);
      const zone = pmInfo?.zone || "วิศวกรภายนอก/โครงการ";

      // หาสาขาที่ไม่ซ้ำกัน
      const uniqueStores = new Set(stores.map((s) => s.storeName));
      const totalInspections = stores.length;
      const uniqueStoresCount = uniqueStores.size;

      const itpCount = stores.filter((s) => s.kind === "itp").length;
      const weeklyCount = stores.filter((s) => s.kind === "weekly").length;

      // สาขาที่เช็คอิน GPS
      const checkInCount = stores.filter((s) => s.checkInVerified).length;
      const checkInRate = totalInspections > 0 ? Math.round((checkInCount / totalInspections) * 100) : 0;

      // สาขาที่มี Selfie
      const selfieCount = stores.filter((s) => s.hasSelfie).length;
      const selfieRate = totalInspections > 0 ? Math.round((selfieCount / totalInspections) * 100) : 0;

      // สาขาที่มีการแนบรูปผลตรวจจริง (ถ้าไม่มีรูป = 0%)
      const inspectedWithPhotosCount = stores.filter((s) => s.hasInspectionPhotos).length;
      const inspectedWithPhotosRate =
        totalInspections > 0 ? Math.round((inspectedWithPhotosCount / totalInspections) * 100) : 0;
      const totalInspectionPhotos = stores.reduce((acc, s) => acc + s.inspectionPhotoCount, 0);

      // สาขาที่พบ Defect
      const defectBranchesCount = stores.filter((s) => s.defectCount > 0).length;
      const totalDefects = stores.reduce((acc, s) => acc + s.defectCount, 0);

      // สาขาที่มีการแนบรูป Defect
      const defectPhotosBranchesCount = stores.filter((s) => s.defectCount > 0 && s.defectPhotoCount > 0).length;
      const totalDefectPhotos = stores.reduce((acc, s) => acc + s.defectPhotoCount, 0);

      // เรียงลำดับรายการสาขาตามวันที่
      stores.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

      result.push({
        name,
        zone,
        totalInspections,
        itpCount,
        weeklyCount,
        uniqueStoresCount,
        checkInCount,
        checkInRate,
        selfieCount,
        selfieRate,
        inspectedWithPhotosCount,
        inspectedWithPhotosRate,
        totalInspectionPhotos,
        defectBranchesCount,
        totalDefects,
        defectPhotosBranchesCount,
        totalDefectPhotos,
        stores,
      });
    });

    // เรียงตาม PM ที่มีงานตรวจมากสุดลงไป
    return result.sort((a, b) => b.totalInspections - a.totalInspections);
  }, [records, weeklyDefects]);

  // กรองตาม PM ที่เลือก หรือข้อความค้นหา
  const displayedPms = useMemo(() => {
    let list = pmAuditList;
    if (selectedPm !== "all") {
      list = list.filter((p) => p.name === selectedPm);
    }
    const q = searchFilter.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.zone.toLowerCase().includes(q) ||
          p.stores.some((s) => s.storeName.toLowerCase().includes(q) || s.storeCode.toLowerCase().includes(q))
      );
    }
    return list;
  }, [pmAuditList, selectedPm, searchFilter]);

  // ภาพรวมทั้งระบบ (Grand Total ครบ 100% ทุกใบงาน)
  const grandTotal = useMemo(() => {
    const totalPms = pmAuditList.length;
    const totalInspections = pmAuditList.reduce((acc, p) => acc + p.totalInspections, 0);
    const totalItp = pmAuditList.reduce((acc, p) => acc + p.itpCount, 0);
    const totalWeekly = pmAuditList.reduce((acc, p) => acc + p.weeklyCount, 0);

    // คำนวณสาขาจริงที่ไม่ซ้ำกันทั่วทั้งระบบ
    const allUniqueStores = new Set<string>();
    pmAuditList.forEach((p) => {
      p.stores.forEach((s) => allUniqueStores.add(s.storeName));
    });
    const totalUniqueStores = allUniqueStores.size;

    const totalCheckIns = pmAuditList.reduce((acc, p) => acc + p.checkInCount, 0);
    const totalSelfies = pmAuditList.reduce((acc, p) => acc + p.selfieCount, 0);
    const totalInspectedWithPhotos = pmAuditList.reduce((acc, p) => acc + p.inspectedWithPhotosCount, 0);
    const totalAllInspectionPhotos = pmAuditList.reduce((acc, p) => acc + p.totalInspectionPhotos, 0);
    const totalDefectBranches = pmAuditList.reduce((acc, p) => acc + p.defectBranchesCount, 0);
    const totalDefectPoints = pmAuditList.reduce((acc, p) => acc + p.totalDefects, 0);
    const totalDefectPhotoBranches = pmAuditList.reduce((acc, p) => acc + p.defectPhotosBranchesCount, 0);
    const totalAllDefectPhotos = pmAuditList.reduce((acc, p) => acc + p.totalDefectPhotos, 0);

    return {
      totalPms,
      totalInspections,
      totalItp,
      totalWeekly,
      totalUniqueStores,
      totalCheckIns,
      checkInPct: totalInspections > 0 ? Math.round((totalCheckIns / totalInspections) * 100) : 0,
      totalSelfies,
      selfiePct: totalInspections > 0 ? Math.round((totalSelfies / totalInspections) * 100) : 0,
      totalInspectedWithPhotos,
      inspectedWithPhotosPct:
        totalInspections > 0 ? Math.round((totalInspectedWithPhotos / totalInspections) * 100) : 0,
      totalAllInspectionPhotos,
      totalDefectBranches,
      totalDefectPoints,
      totalDefectPhotoBranches,
      totalAllDefectPhotos,
    };
  }, [pmAuditList]);

  const handlePrint = () => {
    window.print();
  };

  const currentDateThai = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 print:bg-white print:text-black">
      {/* ─────────── แถบควบคุมด้านบน (ซ่อนเมื่อพิมพ์) ─────────── */}
      <div className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับแดชบอร์ด PM</span>
            </Link>
            <div className="h-4 w-[1px] bg-slate-300" />
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
              <FileText className="w-4 h-4 text-brand" />
              <span>รายงานตรวจสอบ PM & แนบรูป (PDF Export)</span>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* ตัวกรองเลือก PM */}
            <div className="relative">
              <select
                value={selectedPm}
                onChange={(e) => setSelectedPm(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 pr-8 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="all">แสดง PM ทั้งหมด ({pmAuditList.length} ท่าน)</option>
                {pmAuditList.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.zone}) - รวม {p.totalInspections} ใบงาน ({p.uniqueStoresCount} สาขา)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* ค้นหาสาขา */}
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาชื่อสาขา / PM..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 w-44"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            </div>

            {/* สวิตช์แสดงรูป Selfie */}
            <button
              type="button"
              onClick={() => setShowSelfieThumbnails(!showSelfieThumbnails)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                showSelfieThumbnails
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{showSelfieThumbnails ? "รูปภาพ: แสดง" : "รูปภาพ: ซ่อน"}</span>
            </button>

            {/* ปุ่มสั่งพิมพ์ / บันทึกเป็น PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-md shadow-red-500/20 active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ พิมพ์ / บันทึก PDF รายงานฉบับเต็ม</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────── เนื้อหารายงานสำหรับการพิมพ์ / Export PDF ─────────── */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 print:p-0">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl shadow-sm">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">กำลังรวบรวมข้อมูลรายงานตรวจสอบ PM และสาขา...</p>
          </div>
        ) : (
          <div className="space-y-6 print:space-y-4">
            {/* ─────────── ปกหัวข้อรายงาน (Header เอกสารทางการ) ─────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-2 print:pb-4 border-b-2 border-b-brand">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                      BIG-C SUPERCENTER
                    </span>
                    <span className="text-xs text-slate-500">ฝ่ายบริหารและควบคุมงานก่อสร้าง (Project Management)</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    รายงานสรุปการตรวจหน้างาน เช็คอิน และการแนบรูปภาพผลตรวจ รายบุคคล PM
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    รายงานสถิติการเข้าตรวจสอบหน้างานจริง (GPS Check-in), ภาพถ่าย Selfie ยืนยันตัวตน,
                    การแนบรูปผลตรวจจริง (ถ้าไม่มีรูปแสดง 0%) และข้อบกพร่อง Defect แยกรายบุคคลพร้อมระบุชื่อสาขาทั้งหมด
                  </p>
                </div>

                <div className="text-right sm:self-center shrink-0 text-xs text-slate-600 space-y-0.5 bg-slate-50 print:bg-transparent p-3 rounded-xl border border-slate-100 print:border-none">
                  <div>
                    <span className="text-slate-400">วันที่ออกรายงาน: </span>
                    <span className="font-semibold text-slate-800">{currentDateThai}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">สถานะข้อมูล: </span>
                    <span className="font-semibold text-emerald-700">อัปเดตเรียลไทม์ครบ 100%</span>
                  </div>
                  <div>
                    <span className="text-slate-400">จำนวน PM: </span>
                    <span className="font-semibold text-slate-800">{displayedPms.length} ท่าน</span>
                  </div>
                </div>
              </div>

              {/* การ์ดสถิติภาพรวมผู้บริหาร (Grand Summary Cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-5 pt-4 border-t border-slate-100">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-brand" />
                    <span>ใบงานตรวจรวม</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {grandTotal.totalInspections}{" "}
                    <span className="text-[10px] font-normal text-slate-500">
                      ({grandTotal.totalUniqueStores} สาขาจริง)
                    </span>
                  </div>
                  <div className="text-[9.5px] text-slate-400 mt-0.5">
                    ITP: {grandTotal.totalItp} | Defect: {grandTotal.totalWeekly}
                  </div>
                </div>

                <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/80">
                  <div className="text-[11px] font-medium text-emerald-800 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>เช็คอิน GPS จริง</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-700 mt-0.5">
                    {grandTotal.totalCheckIns}{" "}
                    <span className="text-xs font-semibold">({grandTotal.checkInPct}%)</span>
                  </div>
                  <div className="text-[9.5px] text-emerald-600 mt-0.5">พิกัดหน้างานสำเร็จ</div>
                </div>

                <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200/80">
                  <div className="text-[11px] font-medium text-blue-800 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    <span>ภาพถ่าย Selfie</span>
                  </div>
                  <div className="text-lg font-bold text-blue-700 mt-0.5">
                    {grandTotal.totalSelfies}{" "}
                    <span className="text-xs font-semibold">({grandTotal.selfiePct}%)</span>
                  </div>
                  <div className="text-[9.5px] text-blue-600 mt-0.5">ยืนยันตัวตน PM</div>
                </div>

                <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-200/80">
                  <div className="text-[11px] font-medium text-indigo-800 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ตรวจจริงมีรูปยืนยัน</span>
                  </div>
                  <div className="text-lg font-bold text-indigo-700 mt-0.5">
                    {grandTotal.totalInspectedWithPhotos}{" "}
                    <span className="text-xs font-semibold">({grandTotal.inspectedWithPhotosPct}%)</span>
                  </div>
                  <div className="text-[9.5px] text-indigo-600 mt-0.5">
                    แนบรูปแล้ว {grandTotal.totalAllInspectionPhotos} รูป
                  </div>
                </div>

                <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
                  <div className="text-[11px] font-medium text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>สาขาที่พบ Defect</span>
                  </div>
                  <div className="text-lg font-bold text-amber-700 mt-0.5">
                    {grandTotal.totalDefectBranches}{" "}
                    <span className="text-[10px] font-normal text-amber-600">
                      ({grandTotal.totalDefectPoints} จุด)
                    </span>
                  </div>
                  <div className="text-[9.5px] text-amber-600 mt-0.5">จุดบกพร่องที่พบ</div>
                </div>

                <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-200/80">
                  <div className="text-[11px] font-medium text-purple-800 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                    <span>แนบรูป Defect</span>
                  </div>
                  <div className="text-lg font-bold text-purple-700 mt-0.5">
                    {grandTotal.totalDefectPhotoBranches}{" "}
                    <span className="text-[10px] font-normal text-purple-600">
                      ({grandTotal.totalAllDefectPhotos} รูป)
                    </span>
                  </div>
                  <div className="text-[9.5px] text-purple-600 mt-0.5">ภาพ Before / After</div>
                </div>
              </div>
            </div>

            {/* ─────────── ตารางสรุปภาพรวมเปรียบเทียบ PM ทุกคน ─────────── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 print:shadow-none print:border-slate-300 print:break-inside-avoid">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-brand" />
                  <h2 className="text-base font-bold text-slate-900">
                    ตารางสรุปเปรียบเทียบผลงาน PM แต่ละท่าน (PM Summary Matrix)
                  </h2>
                </div>
                <span className="text-xs text-slate-500">
                  *ถ้าไม่มีรูปถ่ายตรวจจริง อัตราผลตรวจจะแสดง 0% เพื่อความโปร่งใส
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-y border-slate-200 print:bg-slate-200">
                      <th className="py-2.5 px-3">ลำดับ</th>
                      <th className="py-2.5 px-3">ชื่อ PM</th>
                      <th className="py-2.5 px-3">โซนรับผิดชอบ</th>
                      <th className="py-2.5 px-3 text-center">ใบงาน (สาขาจริง)</th>
                      <th className="py-2.5 px-3 text-center">เช็คอิน (สาขา / %)</th>
                      <th className="py-2.5 px-3 text-center">Selfies (สาขา / %)</th>
                      <th className="py-2.5 px-3 text-center bg-indigo-50/50 print:bg-transparent">
                        ตรวจจริงมีรูป (% / สาขา)
                      </th>
                      <th className="py-2.5 px-3 text-center">Defect (สาขา / จุด)</th>
                      <th className="py-2.5 px-3 text-center">แนบรูป Defect (สาขา / รูป)</th>
                      <th className="py-2.5 px-3 text-center">สถานะการตรวจ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayedPms.map((pm, idx) => {
                      const hasPhotos = pm.inspectedWithPhotosCount > 0;
                      return (
                        <tr
                          key={pm.name}
                          className="hover:bg-slate-50 transition-colors print:hover:bg-transparent"
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{pm.name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{pm.zone}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                            <div>{pm.totalInspections} ใบงาน</div>
                            <div className="text-[10px] font-normal text-slate-500">
                              ({pm.uniqueStoresCount} สาขาจริง)
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`font-semibold ${
                                pm.checkInCount > 0 ? "text-emerald-700" : "text-slate-400"
                              }`}
                            >
                              {pm.checkInCount} สาขา
                            </span>{" "}
                            <span className="text-[11px] text-slate-500">({pm.checkInRate}%)</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`font-semibold ${
                                pm.selfieCount > 0 ? "text-blue-700" : "text-slate-400"
                              }`}
                            >
                              {pm.selfieCount} สาขา
                            </span>{" "}
                            <span className="text-[11px] text-slate-500">({pm.selfieRate}%)</span>
                          </td>

                          {/* คอลัมน์ตรวจจริงมีรูปยืนยัน: ถ้าไม่มีรูปถ่าย = 0% */}
                          <td className="py-2.5 px-3 text-center bg-indigo-50/30 print:bg-transparent">
                            {hasPhotos ? (
                              <div>
                                <span className="font-bold text-indigo-700">
                                  {pm.inspectedWithPhotosRate}%
                                </span>{" "}
                                <span className="text-[11px] text-slate-600">
                                  ({pm.inspectedWithPhotosCount} สาขา / {pm.totalInspectionPhotos} รูป)
                                </span>
                              </div>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                0% (ไม่มีรูปตรวจ)
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`font-semibold ${
                                pm.defectBranchesCount > 0 ? "text-amber-700" : "text-slate-400"
                              }`}
                            >
                              {pm.defectBranchesCount} สาขา
                            </span>{" "}
                            <span className="text-[11px] text-slate-500">({pm.totalDefects} จุด)</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`font-semibold ${
                                pm.defectPhotosBranchesCount > 0 ? "text-purple-700" : "text-slate-400"
                              }`}
                            >
                              {pm.defectPhotosBranchesCount} สาขา
                            </span>{" "}
                            <span className="text-[11px] text-slate-500">
                              ({pm.totalDefectPhotos} รูป)
                            </span>
                          </td>

                          {/* สถานะการตรวจ */}
                          <td className="py-2.5 px-3 text-center">
                            {hasPhotos ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>มีรูปตรวจจริง ({pm.inspectedWithPhotosRate}%)</span>
                              </span>
                            ) : pm.totalInspections > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>0% ไม่มีรูปตรวจยืนยัน</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                                <span>ยังไม่มีใบงาน</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─────────── รายละเอียดเจาะลึกแยกราย PM พร้อมรายชื่อสาขาทั้งหมด ─────────── */}
            <div className="space-y-6">
              {displayedPms.map((pm, pmIdx) => (
                <div
                  key={pm.name}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 print:shadow-none print:border-slate-300 print:break-inside-avoid print:mb-6"
                >
                  {/* หัวการ์ด PM แต่ละคน */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {pm.name.replace(/^K\.\s*/i, "").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{pm.name}</h3>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {pm.zone}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          วิศวกรผู้ควบคุมงาน Big-C • รับผิดชอบรวม {pm.totalInspections} ใบงาน (ITP:{" "}
                          {pm.itpCount} | Defect: {pm.weeklyCount}) รวม {pm.uniqueStoresCount} สาขาจริง
                        </p>
                      </div>
                    </div>

                    {/* Badge สรุปของ PM คนนี้ */}
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                        📍 เช็คอิน {pm.checkInCount}/{pm.totalInspections} สาขา ({pm.checkInRate}%)
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                        🤳 Selfie {pm.selfieCount} สาขา ({pm.selfieRate}%)
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-lg border font-semibold ${
                          pm.inspectedWithPhotosCount > 0
                            ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        📸 รูปตรวจจริง: {pm.inspectedWithPhotosRate}% ({pm.inspectedWithPhotosCount} สาขา /{" "}
                        {pm.totalInspectionPhotos} รูป)
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                        ⚠️ Defect {pm.defectBranchesCount} สาขา ({pm.totalDefects} จุด)
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-semibold">
                        🖼️ รูป Defect {pm.defectPhotosBranchesCount} สาขา ({pm.totalDefectPhotos} รูป)
                      </span>
                    </div>
                  </div>

                  {/* ตารางแสดงรายชื่อสาขา และรายละเอียดการตรวจของ PM ท่านนี้ */}
                  {pm.stores.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      ยังไม่มีประวัติการเข้าตรวจสาขาสำหรับ PM ท่านนี้ในระบบ
                    </div>
                  ) : (
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 font-semibold border-y border-slate-200 print:bg-slate-100">
                            <th className="py-2 px-2.5 w-10 text-center">#</th>
                            <th className="py-2 px-2.5">ชื่อสาขา (Store Name)</th>
                            <th className="py-2 px-2.5">ประเภทใบตรวจ</th>
                            <th className="py-2 px-2.5">วันที่เข้าตรวจ</th>
                            <th className="py-2 px-2.5">พิกัด GPS / เช็คอิน</th>
                            <th className="py-2 px-2.5 text-center">ภาพ Selfie</th>
                            <th className="py-2 px-2.5 text-center">แนบรูปตรวจจริง</th>
                            <th className="py-2 px-2.5 text-center bg-indigo-50/50 print:bg-transparent">
                              % ผลตรวจจริง
                            </th>
                            <th className="py-2 px-2.5 text-center">Defect ที่พบ</th>
                            <th className="py-2 px-2.5 text-center">แนบรูป Defect</th>
                            <th className="py-2 px-2.5">หมายเหตุ / Remote</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {pm.stores.map((store, sIdx) => (
                            <tr
                              key={`${store.id}-${sIdx}`}
                              className="hover:bg-slate-50/80 transition-colors print:hover:bg-transparent"
                            >
                              <td className="py-2.5 px-2.5 text-center font-medium text-slate-400">
                                {sIdx + 1}
                              </td>

                              {/* ชื่อสาขา และ รหัสสาขา */}
                              <td className="py-2.5 px-2.5 font-bold text-slate-900">
                                <div>{store.storeName}</div>
                                {store.storeCode && store.storeCode !== "-" && (
                                  <div className="text-[10px] font-normal text-slate-500">
                                    รหัสสาขา: {store.storeCode}
                                  </div>
                                )}
                              </td>

                              {/* ประเภทใบตรวจ */}
                              <td className="py-2.5 px-2.5">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    store.kind === "itp"
                                      ? "bg-sky-100 text-sky-800"
                                      : "bg-purple-100 text-purple-800"
                                  }`}
                                >
                                  {store.typeLabel}
                                </span>
                              </td>

                              {/* วันที่ตรวจ */}
                              <td className="py-2.5 px-2.5 text-slate-700 whitespace-nowrap">
                                <div>{store.dateStr}</div>
                                {store.checkInTimestamp && (
                                  <div className="text-[10px] text-slate-500">
                                    {fmtTime(store.checkInTimestamp)}
                                  </div>
                                )}
                              </td>

                              {/* สถานะเช็คอิน GPS */}
                              <td className="py-2.5 px-2.5">
                                {store.checkInVerified ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>เช็คอินสำเร็จ</span>
                                    </span>
                                    {store.lat && store.lng ? (
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        {store.lat.toFixed(4)}, {store.lng.toFixed(4)}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                                    <span>ไม่มีพิกัด GPS</span>
                                  </span>
                                )}
                              </td>

                              {/* ภาพถ่าย Selfie */}
                              <td className="py-2.5 px-2.5 text-center">
                                {store.hasSelfie && store.selfiePhoto ? (
                                  <div className="flex flex-col items-center gap-1">
                                    {showSelfieThumbnails ? (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewImage(store.selfiePhoto || null)}
                                        className="no-print w-9 h-9 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-brand shadow-xs transition-all"
                                        title="คลิกเพื่อดูรูปขยาย"
                                      >
                                        <img
                                          src={store.selfiePhoto}
                                          alt="Selfie"
                                          className="w-full h-full object-cover"
                                        />
                                      </button>
                                    ) : null}
                                    <span className="text-[10px] font-semibold text-blue-700">มีรูป Selfie</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400">-</span>
                                )}
                              </td>

                              {/* สาขาที่ตรวจจริงและแนบรูป */}
                              <td className="py-2.5 px-2.5 text-center">
                                {store.hasInspectionPhotos ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    <ImageIcon className="w-3 h-3" />
                                    <span>แนบแล้ว ({store.inspectionPhotoCount} รูป)</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">ไม่มีรูปแนบ</span>
                                )}
                              </td>

                              {/* % ผลการตรวจจริง: ถ้าไม่มีรูปถ่ายว่าตรวจ ต้องขึ้น 0% ไม่ใช่ 100% */}
                              <td className="py-2.5 px-2.5 text-center bg-indigo-50/20 print:bg-transparent">
                                {store.hasInspectionPhotos ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>{store.completionRate}% (มีรูปตรวจ)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    <span>0% (ไม่มีรูปถ่าย)</span>
                                  </span>
                                )}
                              </td>

                              {/* Defect ที่พบ */}
                              <td className="py-2.5 px-2.5 text-center">
                                {store.defectCount > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span>พบ {store.defectCount} จุด</span>
                                  </span>
                                ) : store.hasInspectionPhotos ? (
                                  <span className="text-[10px] text-emerald-700 font-semibold">
                                    ไม่พบ Defect
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">ไม่มีข้อมูล</span>
                                )}
                              </td>

                              {/* การแนบรูป Defect */}
                              <td className="py-2.5 px-2.5 text-center">
                                {store.defectCount > 0 ? (
                                  store.hasDefectPhotos ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                      <ImageIcon className="w-3 h-3" />
                                      <span>แนบ {store.defectPhotoCount} รูป</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-red-500 font-medium">ยังไม่แนบรูป</span>
                                  )
                                ) : (
                                  <span className="text-[10px] text-slate-400">-</span>
                                )}
                              </td>

                              {/* หมายเหตุ / Remote Video Call */}
                              <td className="py-2.5 px-2.5 text-slate-600 max-w-xs">
                                {store.remark ? (
                                  <div className="text-[11px] bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                    {store.remark}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ─────────── ลายเซ็นและผู้รับรองเอกสารท้ายรายงาน ─────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 print:shadow-none print:border-slate-300 print:break-inside-avoid mt-6">
              <div className="text-xs font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                การรับรองผลการตรวจสอบข้อมูลและการรายงาน
              </div>
              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                <div>
                  <div className="h-16 border-b border-dashed border-slate-300 flex items-end justify-center pb-2">
                    <span className="text-slate-400 text-[10px]">(ลงชื่อวิศวกรผู้ตรวจ / PM)</span>
                  </div>
                  <div className="mt-2 font-semibold text-slate-800">วิศวกรผู้ควบคุมงาน (PM)</div>
                  <div className="text-[10px] text-slate-500">ผู้รับผิดชอบการตรวจสอบหน้างาน</div>
                </div>

                <div>
                  <div className="h-16 border-b border-dashed border-slate-300 flex items-end justify-center pb-2">
                    <span className="text-slate-400 text-[10px]">(ลงชื่อหัวหน้างานตรวจสอบ)</span>
                  </div>
                  <div className="mt-2 font-semibold text-slate-800">Quality Supervisor</div>
                  <div className="text-[10px] text-slate-500">ผู้ทวนสอบความถูกต้องพิกัด & รูปภาพ</div>
                </div>

                <div>
                  <div className="h-16 border-b border-dashed border-slate-300 flex items-end justify-center pb-2">
                    <span className="text-slate-400 text-[10px]">(ลงชื่อผู้บริหารโครงการ)</span>
                  </div>
                  <div className="mt-2 font-semibold text-slate-800">Project Director / Management</div>
                  <div className="text-[10px] text-slate-500">ผู้มีอำนาจอนุมัติ Big-C Supercenter</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─────────── Modal ดูภาพขยาย (สำหรับตรวจสอบหน้าจอ) ─────────── */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="no-print fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-2xl w-full bg-white rounded-2xl p-2 shadow-2xl overflow-hidden">
            <img
              src={previewImage}
              alt="ภาพถ่ายยืนยันตัวตน"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            <div className="p-3 text-center">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── CSS พิเศษสำหรับ Print / PDF ─────────── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
