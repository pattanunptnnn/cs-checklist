"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { totalItems } from "@/lib/checklist";
import type { RecordSummary, PMSiteVisit, PMPerformance, PunctualityStatus } from "@/lib/types";
import {
  Users,
  Building2,
  Clock,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Award,
  ChevronRight,
  TrendingUp,
  ClipboardCheck,
  Calendar,
  Layers,
  ArrowLeft,
  RefreshCw,
  Wrench,
} from "lucide-react";
import UserNav from "./UserNav";

const TOTAL = totalItems();

function fmtShortDate(isoOrDate: string | null): string {
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

function fmtTime(iso: string | null): string {
  if (!iso) return "-";
  try {
    return (
      new Date(iso).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " น."
    );
  } catch {
    return "-";
  }
}

// คำนวณความตรงต่อเวลาของแต่ละงานตรวจ
function evaluatePunctuality(
  scheduledDateStr?: string,
  checkInTimestamp?: string | null,
  isVerified?: boolean
): { status: PunctualityStatus; note: string } {
  if (!isVerified || !checkInTimestamp) {
    return { status: "missing", note: "ยังไม่มีการเช็คอินยืนยันพิกัด" };
  }

  try {
    const checkInDate = new Date(checkInTimestamp);
    const hour = checkInDate.getHours();
    const minute = checkInDate.getMinutes();

    if (scheduledDateStr) {
      const scheduled = new Date(scheduledDateStr);
      // เทียบวันที่แบบ YYYY-MM-DD
      const checkInDayStr = checkInDate.toISOString().slice(0, 10);
      const schedDayStr = scheduled.toISOString().slice(0, 10);

      if (checkInDayStr < schedDayStr) {
        return { status: "on_time", note: "เข้าตรวจก่อนกำหนดนัดหมาย" };
      }
      if (checkInDayStr > schedDayStr) {
        return { status: "late", note: `เช็คอินช้ากว่าวันนัดหมาย (${checkInDayStr})` };
      }
    }

    // วันตรงกัน: ถ้าเช็คอินก่อนหรือเวลา 10:30 น. ถือว่าตรงเวลาช่วงเช้า
    if (hour < 10 || (hour === 10 && minute <= 30)) {
      return { status: "on_time", note: `ตรงเวลาช่วงเช้า (${fmtTime(checkInTimestamp)})` };
    } else {
      return { status: "late", note: `เข้าตรวจช่วงสาย/บ่าย (${fmtTime(checkInTimestamp)})` };
    }
  } catch {
    return { status: "on_time", note: "เช็คอินเข้าพื้นที่สำเร็จ" };
  }
}

export default function PMDashboard() {
  const router = useRouter();
  const [records, setRecords] = useState<RecordSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPm, setSelectedPm] = useState<string>("all");
  const [punctFilter, setPunctFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/records");
      if (res.ok) {
        const data: RecordSummary[] = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error("Failed to load records for dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // แปลงรายการทั้งหมดให้อยู่ในรูป PMSiteVisit
  const siteVisits = useMemo<PMSiteVisit[]>(() => {
    if (!records) return [];

    return records.map((r) => {
      const p = r.project || {};
      const pmName = (p.pm || r.checkIn?.inspectorName || "ไม่ระบุชื่อ PM").trim();
      const scheduledDate = p.inspDate || "";
      const checkInTimestamp = r.checkIn?.timestamp || null;
      const verified = Boolean(r.checkInVerified && r.checkIn?.verified);

      const { status: punctuality, note: punctualityNote } = evaluatePunctuality(
        scheduledDate,
        checkInTimestamp,
        verified
      );

      return {
        recordId: r.id,
        storeName: p.store || "(ยังไม่ระบุชื่อสาขา)",
        storeCode: p.storeCode || "-",
        contractor: p.contractor || "ผู้รับเหมาทั่วไป",
        pmName,
        scheduledDate,
        checkInTimestamp,
        punctuality,
        punctualityNote,
        verified,
        lat: r.checkIn?.lat,
        lng: r.checkIn?.lng,
        accuracy: r.checkIn?.accuracy,
        siteCode: r.checkIn?.siteCode,
        filledCount: r.filled,
        passCount: r.pass,
        failCount: r.fail,
        approvalStatus: r.approvalStatus || "รอตรวจ",
      };
    });
  }, [records]);

  // รวมสถิติ Performance แยกรายบุคคล PM
  const pmSummaries = useMemo<PMPerformance[]>(() => {
    const map = new Map<string, PMSiteVisit[]>();

    for (const v of siteVisits) {
      const list = map.get(v.pmName) || [];
      list.push(v);
      map.set(v.pmName, list);
    }

    const list: PMPerformance[] = [];

    map.forEach((visits, pmName) => {
      const totalSites = visits.length;
      const verifiedSites = visits.filter((v) => v.verified).length;
      const onTimeSites = visits.filter((v) => v.punctuality === "on_time").length;
      const lateSites = visits.filter((v) => v.punctuality === "late").length;
      const missingSites = visits.filter((v) => v.punctuality === "missing").length;

      const onTimeRate = totalSites > 0 ? Math.round((onTimeSites / totalSites) * 100) : 0;
      const verificationRate = totalSites > 0 ? Math.round((verifiedSites / totalSites) * 100) : 0;

      const totalPassed = visits.reduce((acc, v) => acc + v.passCount, 0);
      const totalFailed = visits.reduce((acc, v) => acc + v.failCount, 0);
      const totalFilled = visits.reduce((acc, v) => acc + v.filledCount, 0);

      const maxPossibleItems = totalSites * TOTAL;
      const completionRate = maxPossibleItems > 0 ? Math.round((totalFilled / maxPossibleItems) * 100) : 0;

      // คำนวณคะแนนประสิทธิภาพ Performance Score (0 - 100)
      // 35% On-Time + 35% Verified on-site + 20% Completion + 10% Defect diligence
      let score = Math.round(onTimeRate * 0.35 + verificationRate * 0.35 + completionRate * 0.2 + (totalFailed > 0 ? 10 : 5));
      score = Math.min(100, Math.max(0, score));

      let tier: PMPerformance["tier"] = "มาตรฐาน";
      if (score >= 88) tier = "ยอดเยี่ยม";
      else if (score >= 72) tier = "ดีมาก";
      else if (score < 50) tier = "ต้องปรับปรุง";

      list.push({
        pmName,
        totalSites,
        verifiedSites,
        onTimeSites,
        lateSites,
        missingSites,
        onTimeRate,
        verificationRate,
        totalPassed,
        totalFailed,
        totalFilled,
        completionRate,
        performanceScore: score,
        tier,
        visits,
      });
    });

    // เรียงลำดับจากคะแนนสูงสุด
    return list.sort((a, b) => b.performanceScore - a.performanceScore);
  }, [siteVisits]);

  // สถิติภาพรวมทั้งระบบ (Global KPIs)
  const globalKpis = useMemo(() => {
    const totalSites = siteVisits.length;
    const verifiedSites = siteVisits.filter((v) => v.verified).length;
    const onTimeSites = siteVisits.filter((v) => v.punctuality === "on_time").length;
    const lateSites = siteVisits.filter((v) => v.punctuality === "late").length;
    const totalNcrs = siteVisits.reduce((acc, v) => acc + v.failCount, 0);

    const onTimeRate = totalSites > 0 ? Math.round((onTimeSites / totalSites) * 100) : 0;
    const verificationRate = totalSites > 0 ? Math.round((verifiedSites / totalSites) * 100) : 0;

    return {
      totalPms: pmSummaries.length,
      totalSites,
      verifiedSites,
      onTimeSites,
      lateSites,
      onTimeRate,
      verificationRate,
      totalNcrs,
    };
  }, [siteVisits, pmSummaries]);

  // กรองรายการไซต์งานที่จะแสดงผล
  const filteredVisits = useMemo(() => {
    let list = siteVisits;

    if (selectedPm !== "all") {
      list = list.filter((v) => v.pmName === selectedPm);
    }

    if (punctFilter !== "all") {
      list = list.filter((v) => v.punctuality === punctFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((v) =>
        [v.storeName, v.storeCode, v.contractor, v.pmName, v.siteCode]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q))
      );
    }

    return list;
  }, [siteVisits, selectedPm, punctFilter, searchQuery]);

  return (
    <div className="min-h-screen pb-24 bg-page">
      {/* ─────────── Header แดชบอร์ดสุดหรู ─────────── */}
      <header className="relative bg-gradient-to-r from-brand via-[#16426a] to-[#0c2a47] text-white shadow-xl overflow-hidden">
        {/* ลวดลาย Blueprint grid */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-6">
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-white transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับหน้ารายการตรวจ</span>
              </Link>

              <span className="text-white/40 text-xs">/</span>
              <span className="text-xs text-white/80 font-medium">PM Management</span>
            </div>

            <div className="flex items-center gap-2">
              <UserNav />
              <button
                type="button"
                onClick={loadData}
                title="รีเฟรชข้อมูล"
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 grid place-items-center text-white text-xs transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-0.5 rounded-full text-xs font-semibold mb-2">
                <Sparkles className="w-3 h-3" />
                <span>Big-C PM Performance Tracking</span>
              </div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-white">
                แดชบอร์ดติดตามหน้างาน & ผลงาน PM
              </h1>
              <p className="text-xs sm:text-sm text-white/75 mt-1 max-w-xl">
                ตรวจสอบประวัติการเข้าไซต์งานจริง ความตรงต่อเวลา และคะแนนประสิทธิภาพวิศวกรผู้ตรวจ (PM) ทุกคน
              </p>
            </div>

            {/* แท็บสลับ 3 โมดูลหลัก */}
            <div className="inline-flex p-1 bg-black/25 backdrop-blur-md rounded-2xl border border-white/15 self-start md:self-auto text-xs">
              <Link
                href="/"
                className="px-3.5 py-1.5 rounded-xl font-semibold text-white/75 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ตรวจโครงสร้าง ITP</span>
              </Link>
              <Link
                href="/defects"
                className="px-3.5 py-1.5 rounded-xl font-semibold text-white/75 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>ตรวจ Defect รายวีค</span>
              </Link>
              <div className="px-3.5 py-1.5 rounded-xl font-bold bg-white text-brand shadow-sm flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>แดชบอร์ด PM</span>
              </div>
            </div>
          </div>

          {/* ────────── 5 การ์ด KPI รวมทั้งระบบ ────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
            <div className="card p-3.5 bg-white/10 backdrop-blur-md border-white/15 text-white">
              <div className="flex items-center justify-between text-white/75 text-xs">
                <span>PM ทั้งหมด</span>
                <Users className="w-4 h-4 text-sky-300" />
              </div>
              <div className="tnum font-display font-bold text-2xl mt-1.5">
                {globalKpis.totalPms} <span className="text-xs font-normal text-white/70">ท่าน</span>
              </div>
              <div className="text-[11px] text-white/60 mt-0.5 truncate">วิศวกรผู้รับผิดชอบ</div>
            </div>

            <div className="card p-3.5 bg-white/10 backdrop-blur-md border-white/15 text-white">
              <div className="flex items-center justify-between text-white/75 text-xs">
                <span>เข้าไซต์งาน</span>
                <Building2 className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="tnum font-display font-bold text-2xl mt-1.5">
                {globalKpis.totalSites} <span className="text-xs font-normal text-white/70">สาขา</span>
              </div>
              <div className="text-[11px] text-emerald-300 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>ยืนยันพิกัด {globalKpis.verifiedSites}</span>
              </div>
            </div>

            <div className="card p-3.5 bg-white/10 backdrop-blur-md border-white/15 text-white">
              <div className="flex items-center justify-between text-white/75 text-xs">
                <span>อัตราตรงเวลา</span>
                <Clock className="w-4 h-4 text-amber-300" />
              </div>
              <div className="tnum font-display font-bold text-2xl mt-1.5 text-amber-300">
                {globalKpis.onTimeRate}%
              </div>
              <div className="text-[11px] text-white/60 mt-0.5 truncate">
                ตรงเวลา {globalKpis.onTimeSites} / สาย {globalKpis.lateSites}
              </div>
            </div>

            <div className="card p-3.5 bg-white/10 backdrop-blur-md border-white/15 text-white">
              <div className="flex items-center justify-between text-white/75 text-xs">
                <span>เข้าตรวจหน้างานจริง</span>
                <ShieldCheck className="w-4 h-4 text-teal-300" />
              </div>
              <div className="tnum font-display font-bold text-2xl mt-1.5 text-teal-300">
                {globalKpis.verificationRate}%
              </div>
              <div className="text-[11px] text-white/60 mt-0.5 truncate">สแกน QR & GPS Verified</div>
            </div>

            <div className="card p-3.5 bg-white/10 backdrop-blur-md border-white/15 text-white col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-white/75 text-xs">
                <span>Defect / NCR</span>
                <AlertTriangle className="w-4 h-4 text-rose-300" />
              </div>
              <div className="tnum font-display font-bold text-2xl mt-1.5 text-rose-300">
                {globalKpis.totalNcrs} <span className="text-xs font-normal text-white/70">จุด</span>
              </div>
              <div className="text-[11px] text-rose-200 mt-0.5 truncate">ข้อบกพร่องที่ตรวจพบ</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-7 space-y-7">
        {/* ────────── ส่วนที่ 1: ลีดเดอร์บอร์ด & คัดเลือกดู PM แต่ละท่าน ────────── */}
        <section>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand/10 text-brand grid place-items-center">
                <Award className="w-4 h-4" />
              </div>
              <h2 className="font-display font-bold text-lg text-ink">
                วิศวกรผู้ตรวจ (PM Performance Ratings)
              </h2>
            </div>
            <div className="text-xs text-ink3">คลิกเลือก PM เพื่อกรองดูประวัติ</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* การ์ดตัวเลือก "ดูทั้งหมด" */}
            <div
              onClick={() => setSelectedPm("all")}
              className={`card p-4 cursor-pointer transition-all border-2 ${
                selectedPm === "all"
                  ? "border-brand shadow-lift bg-brand/5"
                  : "border-transparent hover:border-line hover:bg-sunken/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-brand text-white grid place-items-center font-bold text-sm shadow-md shadow-brand/20">
                  ALL
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-base text-ink truncate">
                    ดูภาพรวม PM ทุกท่าน
                  </div>
                  <div className="text-xs text-ink2 mt-0.5">
                    รวม {pmSummaries.length} วิศวกร · {globalKpis.totalSites} ใบตรวจ
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-xs">
                <span className="text-ink3">อัตราตรงเวลารวม</span>
                <span className="font-bold text-brand">{globalKpis.onTimeRate}%</span>
              </div>
            </div>

            {/* การ์ดของแต่ละ PM */}
            {pmSummaries.map((pm) => {
              const isSelected = selectedPm === pm.pmName;
              const tierBadge =
                pm.tier === "ยอดเยี่ยม"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : pm.tier === "ดีมาก"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";

              return (
                <div
                  key={pm.pmName}
                  onClick={() => setSelectedPm(pm.pmName)}
                  className={`card p-4 cursor-pointer transition-all border-2 ${
                    isSelected
                      ? "border-brand shadow-lift bg-brand/5"
                      : "border-transparent hover:border-line hover:bg-sunken/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1e5c9b] to-[#0f345c] text-white grid place-items-center font-bold text-base shadow-sm shrink-0">
                        {pm.pmName.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-display font-bold text-sm sm:text-base text-ink truncate">
                          {pm.pmName}
                        </div>
                        <span className={`chip border text-[10px] font-bold mt-0.5 ${tierBadge}`}>
                          ★ ระดับ {pm.tier} ({pm.performanceScore} คะแนน)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* สถิติ 3 ด้านของ PM */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-line/60 text-center text-xs">
                    <div>
                      <div className="text-[11px] text-ink3">เข้าตรวจ</div>
                      <div className="tnum font-bold text-ink mt-0.5">{pm.totalSites} ไซต์</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-ink3">ตรงเวลา</div>
                      <div className="tnum font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {pm.onTimeRate}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-ink3">พบ Defect</div>
                      <div className="tnum font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        {pm.totalFailed} จุด
                      </div>
                    </div>
                  </div>

                  {/* Progress bar On-Site Verification */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-ink3 mb-1">
                      <span>ยืนยันเข้าตรวจจริง (GPS)</span>
                      <span className="font-semibold text-teal-600 dark:text-teal-400">
                        {pm.verificationRate}% ({pm.verifiedSites}/{pm.totalSites})
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-line overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all duration-300"
                        style={{ width: `${pm.verificationRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ────────── ส่วนที่ 2: ประวัติการเข้าไซต์งาน & แผนงาน ────────── */}
        <section className="card p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-line">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand" />
                <h3 className="font-display font-bold text-base text-ink">
                  ประวัติการเข้าตรวจไซต์งาน & รายการยืนยันพิกัด
                </h3>
                {selectedPm !== "all" && (
                  <span className="chip bg-brand/10 text-brand font-bold text-xs">
                    PM: {selectedPm}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink2 mt-0.5">
                แสดงวัน-เวลาเช็คอินจริง เปรียบเทียบกับวันที่นัดหมาย พร้อมพิกัดดาวเทียม GPS
              </p>
            </div>

            {/* ฟิลเตอร์ & ค้นหา */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-ink3 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อสาขา / รหัส..."
                  className="field py-1.5 pl-8 text-xs w-full"
                />
              </div>

              {/* กรองตามสถานะความตรงเวลา */}
              <div className="inline-flex p-1 bg-sunken rounded-xl border border-line text-xs">
                <button
                  type="button"
                  onClick={() => setPunctFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    punctFilter === "all" ? "bg-card text-brand shadow-sm font-bold" : "text-ink3 hover:text-ink"
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setPunctFilter("on_time")}
                  className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                    punctFilter === "on_time" ? "bg-card text-emerald-600 shadow-sm font-bold" : "text-ink3 hover:text-ink"
                  }`}
                >
                  ตรงเวลา
                </button>
                <button
                  type="button"
                  onClick={() => setPunctFilter("late")}
                  className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                    punctFilter === "late" ? "bg-card text-amber-600 shadow-sm font-bold" : "text-ink3 hover:text-ink"
                  }`}
                >
                  เข้าสาย
                </button>
                <button
                  type="button"
                  onClick={() => setPunctFilter("missing")}
                  className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                    punctFilter === "missing" ? "bg-card text-rose-600 shadow-sm font-bold" : "text-ink3 hover:text-ink"
                  }`}
                >
                  ยังไม่เช็คอิน
                </button>
              </div>
            </div>
          </div>

          {/* รายการไซต์งาน */}
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-3 border-line border-t-brand rounded-full animate-spin mx-auto mb-3" />
              <p className="text-ink2 text-xs">กำลังรวบรวมประวัติการเข้าตรวจไซต์งาน…</p>
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-12 h-12 rounded-full bg-sunken grid place-items-center text-ink3 mx-auto mb-2">
                <Search className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm text-ink">ไม่พบประวัติไซต์งานที่ตรงกับเงื่อนไข</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedPm("all");
                  setPunctFilter("all");
                  setSearchQuery("");
                }}
                className="mt-2 text-xs text-brand font-bold underline"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            <div className="divide-y divide-line/70 mt-2">
              {filteredVisits.map((v) => {
                const pct = Math.round((v.filledCount / TOTAL) * 100);

                let punctBadge = {
                  label: "ตรงเวลา",
                  color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                  icon: CheckCircle2,
                };
                if (v.punctuality === "late") {
                  punctBadge = {
                    label: "เข้าสาย",
                    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    icon: Clock,
                  };
                } else if (v.punctuality === "missing") {
                  punctBadge = {
                    label: "ยังไม่เช็คอิน",
                    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                    icon: XCircle,
                  };
                }

                const PunctIcon = punctBadge.icon;

                return (
                  <div
                    key={v.recordId}
                    className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-sunken/40 px-2 sm:px-3 rounded-xl transition-colors"
                  >
                    {/* ข้อมูลสาขา & PM */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-base text-ink">
                          {v.storeName}
                        </span>
                        {v.storeCode !== "-" && (
                          <span className="chip bg-sunken text-ink2 text-[11px] font-mono">
                            {v.storeCode}
                          </span>
                        )}

                        <span className={`chip border text-[11px] font-bold inline-flex items-center gap-1 ${punctBadge.color}`}>
                          <PunctIcon className="w-3 h-3" />
                          <span>{punctBadge.label}</span>
                        </span>

                        {v.verified && (
                          <span className="chip bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-[10.5px] font-bold">
                            ✓ GPS หน้างานจริง
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-ink2 mt-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-brand" />
                          <span>PM: <strong>{v.pmName}</strong></span>
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-ink3" />
                          <span>ผู้รับเหมา: {v.contractor}</span>
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-ink3" />
                          <span>วันนัดตรวจ: {v.scheduledDate || "-"}</span>
                        </span>
                      </div>

                      {/* รายละเอียดการเช็คอิน & พิกัด */}
                      <div className="mt-2 text-xs flex items-center gap-3 flex-wrap bg-sunken/60 p-2 rounded-lg border border-line/60">
                        <span className="text-ink2">
                          <strong>ผลการเข้างาน:</strong> {v.punctualityNote}
                        </span>

                        {v.checkInTimestamp && (
                          <span className="text-ink3 text-[11px]">
                            เวลาจริง: {fmtShortDate(v.checkInTimestamp)} {fmtTime(v.checkInTimestamp)}
                          </span>
                        )}

                        {v.lat && v.lng && (
                          <a
                            href={`https://www.google.com/maps?q=${v.lat},${v.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand hover:underline font-semibold text-[11px] ml-auto"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>พิกัด {v.lat.toFixed(4)}, {v.lng.toFixed(4)}</span>
                            {v.accuracy && <span className="text-ink3 font-normal">(±{v.accuracy}ม.)</span>}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* สถิติงานตรวจ & ปุ่มเปิด */}
                    <div className="flex items-center gap-4 self-end lg:self-center shrink-0 pt-2 lg:pt-0">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2 text-xs font-semibold">
                          <span className="text-pass">✓ ผ่าน {v.passCount}</span>
                          {v.failCount > 0 && <span className="text-fail font-bold">✕ ไม่ผ่าน {v.failCount}</span>}
                        </div>
                        <div className="text-[11px] text-ink3 mt-0.5">
                          บันทึกแล้ว {v.filledCount}/{TOTAL} ข้อ ({pct}%)
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => router.push(`/record/${v.recordId}`)}
                        className="btn-secondary px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <span>เปิดใบตรวจ</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
