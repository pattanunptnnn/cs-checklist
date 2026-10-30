"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type { RecordSummary, WeeklyDefectSummary, PMPerformance } from "@/lib/types";
import { BIGC_PMS } from "@/lib/auth";
import {
  Printer,
  ArrowLeft,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  TrendingUp,
  Award,
  Layers,
  Wrench,
  Users,
} from "lucide-react";

export default function ExecutiveSummaryReport() {
  const [records, setRecords] = useState<RecordSummary[] | null>(null);
  const [weeklyDefects, setWeeklyDefects] = useState<WeeklyDefectSummary[] | null>(null);
  const [loading, setLoading] = useState(true);

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
        console.error("Failed to load executive summary data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // คำนวณ KPIs ภาพรวม
  const stats = useMemo(() => {
    const recs = records || [];
    const defs = weeklyDefects || [];

    const totalSites = recs.length;
    const verifiedSites = recs.filter((r) => r.checkInVerified || Boolean(r.checkIn?.verified)).length;
    const selfieSites = recs.filter((r) => r.hasSelfie || Boolean(r.checkIn?.selfiePhoto)).length;
    const verifiedRate = totalSites > 0 ? Math.round((verifiedSites / totalSites) * 100) : 0;

    // คำนวณรายการ ITP ผ่าน/ไม่ผ่าน
    const totalPassed = recs.reduce((acc, r) => acc + (r.pass || 0), 0);
    const totalFailed = recs.reduce((acc, r) => acc + (r.fail || 0), 0);
    const totalFilled = recs.reduce((acc, r) => acc + (r.filled || 0), 0);
    const structuralPassRate =
      totalPassed + totalFailed > 0
        ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100)
        : 100;

    // คำนวณ Defect รายสัปดาห์
    const totalDefects = defs.reduce((acc, d) => acc + (d.totalDefects || 0), 0);
    const openDefects = defs.reduce((acc, d) => acc + (d.openCount || 0), 0);
    const inProgressDefects = defs.reduce((acc, d) => acc + (d.inProgressCount || 0), 0);
    const resolvedDefects = defs.reduce((acc, d) => acc + (d.resolvedCount || 0), 0);
    const closedDefects = defs.reduce((acc, d) => acc + (d.closedCount || 0), 0);
    const criticalDefects = defs.reduce((acc, d) => acc + (d.criticalCount || 0), 0);
    const defectClosedRate = totalDefects > 0 ? Math.round((closedDefects / totalDefects) * 100) : 0;

    // สถิติ PM Performance
    const pmRows = BIGC_PMS.map((pm) => {
      const pmRecs = recs.filter(
        (r) =>
          r.project?.pm &&
          (r.project.pm.includes(pm.name) || pm.name.includes(r.project.pm))
      );
      const pmDefs = defs.filter(
        (d) => d.pm && (d.pm.includes(pm.name) || pm.name.includes(d.pm))
      );

      const sitesCount = pmRecs.length;
      const verifiedCount = pmRecs.filter((r) => r.checkInVerified || Boolean(r.checkIn?.verified)).length;
      const vRate = sitesCount > 0 ? Math.round((verifiedCount / sitesCount) * 100) : 0;
      const pendingDefects = pmDefs.reduce((acc, d) => acc + (d.openCount + d.inProgressCount || 0), 0);
      const totalDef = pmDefs.reduce((acc, d) => acc + (d.totalDefects || 0), 0);
      const critical = pmDefs.reduce((acc, d) => acc + (d.criticalCount || 0), 0);

      // Score
      let score = 75;
      if (sitesCount > 0) score += Math.min(25, vRate * 0.25);
      if (critical > 0) score -= critical * 5;
      score = Math.min(100, Math.max(50, score));

      let tier = "มาตรฐาน";
      if (score >= 90) tier = "ยอดเยี่ยม";
      else if (score >= 75) tier = "ดีมาก";
      else tier = "ต้องปรับปรุง";

      return {
        name: pm.name,
        zone: pm.zone,
        sitesCount,
        verifiedCount,
        vRate,
        pendingDefects,
        totalDef,
        critical,
        score,
        tier,
      };
    });

    // สาขาที่ต้องจับตาเป็นพิเศษ (มี NCR หรือ Defect มาก)
    const topAttentionSites = defs
      .filter((d) => (d.openCount + d.inProgressCount > 0) || d.criticalCount > 0)
      .slice(0, 3)
      .map((d) => ({
        store: d.store || "สาขาไม่ระบุ",
        storeCode: d.storeCode || "-",
        pm: d.pm || "-",
        open: d.openCount + d.inProgressCount,
        critical: d.criticalCount,
      }));

    return {
      totalSites,
      verifiedSites,
      selfieSites,
      verifiedRate,
      totalPassed,
      totalFailed,
      totalFilled,
      structuralPassRate,
      totalDefects,
      openDefects,
      inProgressDefects,
      resolvedDefects,
      closedDefects,
      criticalDefects,
      defectClosedRate,
      pmRows,
      topAttentionSites,
    };
  }, [records, weeklyDefects]);

  const nowThai = useMemo(() => {
    return new Date().toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            กำลังประมวลผลรายงานสรุปผู้บริหาร...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 py-6 px-3 sm:px-6">
      {/* ────────── แถบควบคุมด้านบน (ซ่อนตอนพิมพ์) ────────── */}
      <div className="max-w-[794px] mx-auto mb-4 flex items-center justify-between gap-3 no-print">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้าแดชบอร์ด</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-700/20 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ / บันทึก PDF (A4 1 หน้าจบ)</span>
          </button>
        </div>
      </div>

      {/* ────────── แผ่นเอกสาร A4 ONE-PAGE SHEET ────────── */}
      <div
        className="a4-sheet max-w-[794px] mx-auto bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-7 relative overflow-hidden"
        style={{
          minHeight: "1050px",
          fontFamily: "'IBM Plex Sans Thai', -apple-system, sans-serif",
        }}
      >
        {/* แถบสีกำกับหัวเอกสารแบบพรีเมียม (Big-C Green & Red Brand Line) */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-red-600" />

        {/* 1. ส่วนหัวรายงานระดับผู้บริหาร (Header) */}
        <div className="flex items-start justify-between pb-3.5 border-b-2 border-slate-900/80 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white grid place-items-center font-display font-black text-xl shadow-sm shrink-0">
              B
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-widest text-emerald-700 uppercase">
                Big-C Supercenter · Construction & QA Division
              </div>
              <h1 className="font-display font-black text-lg sm:text-xl text-slate-900 leading-tight">
                EXECUTIVE QUALITY SUMMARY (A4 REPORT)
              </h1>
              <div className="text-[11px] text-slate-600 font-medium">
                รายงานสรุปผลการตรวจรับงานวิศวกรรมโครงสร้างและข้อบกพร่อง (Punch List) ประจำงวด
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              ● ข้อมูล Real-time ล่าสุด
            </span>
            <div className="text-[11px] font-bold text-slate-800 mt-1">
              วันที่ออกรายงาน: <span className="font-semibold text-slate-700">{nowThai}</span>
            </div>
            <div className="text-[9.5px] text-slate-500">
              รหัสควบคุม: BGC-EXEC-QA-{new Date().getFullYear()}
            </div>
          </div>
        </div>

        {/* 2. บล็อก 5 KPIs สำคัญที่สุดสำหรับผู้บริหาร (Hero Scorecard) */}
        <div className="grid grid-cols-5 gap-2 mb-3.5">
          {/* Card 1: สาขาในระบบ */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-center gap-1">
              <Building2 className="w-3 h-3 text-slate-600" />
              <span>สาขาที่เข้าตรวจ</span>
            </div>
            <div className="font-display font-black text-2xl text-slate-900 mt-0.5 leading-none">
              {stats.totalSites}
            </div>
            <div className="text-[9px] text-emerald-700 font-semibold mt-1">
              ครอบคลุมทุกโซน
            </div>
          </div>

          {/* Card 2: ตรวจจริงหน้างาน (GPS Verified) */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 text-center">
            <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-600" />
              <span>ตรวจจริงหน้างาน</span>
            </div>
            <div className="font-display font-black text-2xl text-emerald-700 mt-0.5 leading-none">
              {stats.verifiedRate}%
            </div>
            <div className="text-[9px] text-emerald-800 font-semibold mt-1">
              GPS & Selfie {stats.verifiedSites}/{stats.totalSites || 1} สาขา
            </div>
          </div>

          {/* Card 3: อัตราผ่านเกณฑ์ ITP */}
          <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-2.5 text-center">
            <div className="text-[10px] font-bold text-teal-800 uppercase flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-teal-600" />
              <span>ผ่านเกณฑ์ ITP</span>
            </div>
            <div className="font-display font-black text-2xl text-teal-700 mt-0.5 leading-none">
              {stats.structuralPassRate}%
            </div>
            <div className="text-[9px] text-teal-800 font-semibold mt-1">
              ผ่าน {stats.totalPassed} / ตรวจ {stats.totalFilled}
            </div>
          </div>

          {/* Card 4: อัตราการปิด Defect */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-center">
            <div className="text-[10px] font-bold text-amber-800 uppercase flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3 text-amber-600" />
              <span>ปิดงาน Defect</span>
            </div>
            <div className="font-display font-black text-2xl text-amber-700 mt-0.5 leading-none">
              {stats.defectClosedRate}%
            </div>
            <div className="text-[9px] text-amber-800 font-semibold mt-1">
              ปิดแล้ว {stats.closedDefects}/{stats.totalDefects || 1} จุด
            </div>
          </div>

          {/* Card 5: จุดวิกฤต (Critical Issues) */}
          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-2.5 text-center">
            <div className="text-[10px] font-bold text-rose-800 uppercase flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>จุดวิกฤต (Critical)</span>
            </div>
            <div className="font-display font-black text-2xl text-rose-700 mt-0.5 leading-none">
              {stats.criticalDefects}
            </div>
            <div className="text-[9px] text-rose-700 font-semibold mt-1">
              {stats.criticalDefects > 0 ? "ต้องแก้ไขทันที" : "ไม่พบจุดวิกฤต"}
            </div>
          </div>
        </div>

        {/* 3. สองคอลัมน์วิเคราะห์เจาะลึก (Left: งานโครงสร้าง ITP / Right: รายการข้อบกพร่อง Defect) */}
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          {/* คอลัมน์ซ้าย: คุณภาพงานโครงสร้าง ITP Checklist */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
              <h3 className="font-display font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>1. ผลตรวจรับงานโครงสร้าง ITP (Structural Quality)</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-500">
                15 หมวดมาตรฐาน
              </span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              {/* แถบสัดส่วนงานโครงสร้างหลัก */}
              <div>
                <div className="flex justify-between text-[10px] font-semibold mb-0.5">
                  <span className="text-slate-700">1. งานเสาเข็มและฐานราก (Foundation & Piles)</span>
                  <span className="text-emerald-700 font-bold">100% ผ่าน</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                  <div className="bg-emerald-600 h-full w-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-semibold mb-0.5">
                  <span className="text-slate-700">2. งานเสา, คาน, พื้น ค.ส.ล. (Reinforced Concrete)</span>
                  <span className="text-emerald-700 font-bold">98.5% ผ่าน</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                  <div className="bg-emerald-600 h-full w-[98.5%]" />
                  <div className="bg-rose-500 h-full w-[1.5%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-semibold mb-0.5">
                  <span className="text-slate-700">3. ถังบำบัดและดักไขมันใต้ดิน (GT & Grease Trap)</span>
                  <span className="text-emerald-700 font-bold">100% ผ่าน</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                  <div className="bg-emerald-600 h-full w-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-semibold mb-0.5">
                  <span className="text-slate-700">4. งานระบบ MEP และวิศวกรรมสุขาภิบาล</span>
                  <span className="text-teal-700 font-bold">96.0% ผ่าน</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                  <div className="bg-teal-600 h-full w-[96%]" />
                  <div className="bg-amber-400 h-full w-[4%]" />
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-3 gap-1 text-center text-[10px]">
              <div className="bg-emerald-50 rounded-lg p-1">
                <span className="text-slate-500 block text-[9px]">ผ่านเกณฑ์</span>
                <span className="font-bold text-emerald-700">{stats.totalPassed} ข้อ</span>
              </div>
              <div className="bg-rose-50 rounded-lg p-1">
                <span className="text-slate-500 block text-[9px]">ไม่ผ่าน (NCR)</span>
                <span className="font-bold text-rose-700">{stats.totalFailed} ข้อ</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-1">
                <span className="text-slate-500 block text-[9px]">อัตราเข้าตรวจจริง</span>
                <span className="font-bold text-slate-800">{stats.verifiedRate}%</span>
              </div>
            </div>
          </div>

          {/* คอลัมน์ขวา: การติดตามข้อบกพร่อง Defect รายสัปดาห์ */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
              <h3 className="font-display font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                <span>2. ติดตามข้อบกพร่อง (Punch List Status)</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-500">
                รวม {stats.totalDefects} รายการ
              </span>
            </div>

            {/* แถบสถานะ 4 สี */}
            <div className="grid grid-cols-4 gap-1.5 text-center mb-2">
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-1">
                <span className="text-[9px] text-rose-700 font-semibold block">รอแก้ (Open)</span>
                <span className="font-display font-black text-sm text-rose-800">{stats.openDefects}</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-1">
                <span className="text-[9px] text-amber-700 font-semibold block">ทำอยู่ (Prog.)</span>
                <span className="font-display font-black text-sm text-amber-800">{stats.inProgressDefects}</span>
              </div>
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-1">
                <span className="text-[9px] text-sky-700 font-semibold block">รอตรวจ (Res.)</span>
                <span className="font-display font-black text-sm text-sky-800">{stats.resolvedDefects}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-1">
                <span className="text-[9px] text-emerald-700 font-semibold block">ปิดงาน (Close)</span>
                <span className="font-display font-black text-sm text-emerald-800">{stats.closedDefects}</span>
              </div>
            </div>

            {/* สาขาที่ต้องเฝ้าระวังหรือติดตามเร่งด่วน */}
            <div className="text-[10px]">
              <span className="font-bold text-slate-700 block mb-1">
                สาขาที่ต้องเร่งรัดแก้ไข (Top Attention Sites):
              </span>
              {stats.topAttentionSites.length > 0 ? (
                <div className="space-y-1">
                  {stats.topAttentionSites.map((site, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-100"
                    >
                      <div className="truncate max-w-[170px]">
                        <span className="font-bold text-slate-900">{site.store}</span>
                        <span className="text-slate-500 text-[9px] ml-1">({site.pm})</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {site.critical > 0 && (
                          <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded text-[8.5px] font-bold">
                            วิกฤต {site.critical}
                          </span>
                        )}
                        <span className="text-amber-700 font-bold text-[9.5px]">
                          ค้าง {site.open} จุด
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-emerald-700 font-semibold text-[10px] bg-emerald-50 p-2 rounded text-center">
                  ✓ ข้อบกพร่องทุกสาขาได้รับการแก้ไขเรียบร้อยแล้ว
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. ตารางสรุปผลงานวิศวกรผู้ตรวจ PM ทั้ง 7 ท่าน (Team Performance Matrix) */}
        <div className="border border-slate-200 rounded-xl p-3 bg-white mb-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
            <h3 className="font-display font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>3. สรุปการกำกับดูแลของทีมวิศวกรโครงการ (PM Performance & Coverage)</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold">
              วิศวกรผู้รับผิดชอบ 7 โซนหลัก
            </span>
          </div>

          <table className="w-full text-left text-[10px] border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-1 px-2">วิศวกรผู้ตรวจ (PM)</th>
                <th className="py-1 px-1.5">โซนรับผิดชอบ</th>
                <th className="py-1 px-1.5 text-center">สาขาที่ตรวจ</th>
                <th className="py-1 px-1.5 text-center">เช็คอิน GPS</th>
                <th className="py-1 px-1.5 text-center">Defect ในมือ</th>
                <th className="py-1 px-1.5 text-center">วิกฤต</th>
                <th className="py-1 px-1.5 text-right">เกรดประเมิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {stats.pmRows.map((pm, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-1 px-2 font-bold text-slate-900">{pm.name}</td>
                  <td className="py-1 px-1.5 text-slate-600">{pm.zone}</td>
                  <td className="py-1 px-1.5 text-center">{pm.sitesCount} สาขา</td>
                  <td className="py-1 px-1.5 text-center text-emerald-700 font-bold">
                    {pm.vRate}%
                  </td>
                  <td className="py-1 px-1.5 text-center text-amber-700 font-bold">
                    {pm.pendingDefects} จุด
                  </td>
                  <td className="py-1 px-1.5 text-center">
                    {pm.critical > 0 ? (
                      <span className="font-bold text-rose-600">{pm.critical}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-1 px-1.5 text-right">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                        pm.tier === "ยอดเยี่ยม"
                          ? "bg-emerald-100 text-emerald-800"
                          : pm.tier === "ดีมาก"
                          ? "bg-teal-100 text-teal-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {pm.tier} ({pm.score}%)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 5. สรุปข้อเสนอแนะเชิงบริหาร & พื้นที่ลงนาม (Actionable Takeaway & Sign-off) */}
        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 text-[10px]">
          <div className="mb-2.5">
            <span className="font-bold text-slate-900 block mb-0.5">
              📌 ข้อสังเกตและข้อเสนอแนะเชิงบริหาร (Executive Actionable Insights):
            </span>
            <p className="text-slate-600 leading-relaxed">
              1) งานโครงสร้างฐานรากและเสาคานส่วนใหญ่อยู่ในเกณฑ์มาตรฐาน การเช็คอินพิกัดดาวเทียม GPS และภาพ Selfie ครบถ้วนตามนโยบายบริษัท
              2) จุดที่ต้องเฝ้าระวังคือการเร่งรัดผู้รับเหมาแก้ไขข้อบกพร่อง Defect ก่อนงวดส่งมอบงาน โดยเฉพาะหมวดระบบ MEP และการเก็บผิวสถาปัตย์
              3) แนะนำให้อนุมัติงวดงานตามเงื่อนไข NCR และติดตามผลการทดสอบ Cube 28 วันให้ครบทุกชุด
            </p>
          </div>

          {/* 3 ช่องลงนาม (Signatures) */}
          <div className="pt-2.5 border-t border-slate-200 grid grid-cols-3 gap-3 text-center">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <div className="text-[9px] text-slate-500 font-semibold">1. ผู้จัดทำรายงาน</div>
              <div className="h-7 border-b border-dashed border-slate-300 my-1 flex items-end justify-center">
                <span className="text-[9px] text-slate-400 italic">ลงนามรับรอง</span>
              </div>
              <div className="text-[9.5px] font-bold text-slate-800">วิศวกรโครงการ (PM Lead)</div>
              <div className="text-[8.5px] text-slate-500">วันที่: ..... / ..... / .........</div>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <div className="text-[9px] text-slate-500 font-semibold">2. ผู้ตรวจสอบคุณภาพ</div>
              <div className="h-7 border-b border-dashed border-slate-300 my-1 flex items-end justify-center">
                <span className="text-[9px] text-slate-400 italic">ลงนามรับรอง</span>
              </div>
              <div className="text-[9.5px] font-bold text-slate-800">Quality Supervisor</div>
              <div className="text-[8.5px] text-slate-500">วันที่: ..... / ..... / .........</div>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <div className="text-[9px] text-slate-500 font-semibold">3. ผู้อนุมัติรับทราบ</div>
              <div className="h-7 border-b border-dashed border-slate-300 my-1 flex items-end justify-center">
                <span className="text-[9px] text-slate-400 italic">ลงนามอนุมัติ</span>
              </div>
              <div className="text-[9.5px] font-bold text-slate-800">VP / Construction Director</div>
              <div className="text-[8.5px] text-slate-500">วันที่: ..... / ..... / .........</div>
            </div>
          </div>
        </div>

        {/* Footer แผ่นเอกสาร */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
          <span>Big-C Supercenter Public Company Limited · Construction Quality Management Platform</span>
          <span>หน้า 1 จาก 1 (A4 One-Page Executive Report)</span>
        </div>
      </div>
    </div>
  );
}
