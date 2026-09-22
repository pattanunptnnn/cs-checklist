"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WeeklyDefectSummary } from "@/lib/types";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Layers,
  Users,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Trash2,
  X,
  Sparkles,
  RefreshCw,
  FolderOpen,
} from "lucide-react";

function fmtDate(iso: string): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function WeeklyDefectList() {
  const router = useRouter();
  const [rows, setRows] = useState<WeeklyDefectSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [weekFilter, setWeekFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "has_open" | "all_closed">("all");

  // State Modal สร้างรอบตรวจใหม่
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formStore, setFormStore] = useState("");
  const [formStoreCode, setFormStoreCode] = useState("");
  const [formWeekNumber, setFormWeekNumber] = useState(1);
  const [formInspDate, setFormInspDate] = useState(new Date().toISOString().slice(0, 10));
  const [formContractor, setFormContractor] = useState("");
  const [formPm, setFormPm] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/defects");
      if (res.ok) {
        const data: WeeklyDefectSummary[] = await res.json();
        setRows(data);
      }
    } catch (err) {
      console.error("Failed to load weekly defects:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // สรุปสถิติภาพรวม
  const stats = useMemo(() => {
    if (!rows) return { totalRounds: 0, totalDefects: 0, open: 0, inProgress: 0, closed: 0, critical: 0, rate: 0 };
    const totalRounds = rows.length;
    let totalDefects = 0;
    let open = 0;
    let inProgress = 0;
    let closed = 0;
    let critical = 0;

    for (const r of rows) {
      totalDefects += r.totalDefects;
      open += r.openCount;
      inProgress += r.inProgressCount;
      closed += r.closedCount;
      critical += r.criticalCount;
    }

    const rate = totalDefects > 0 ? Math.round((closed / totalDefects) * 100) : 0;
    return { totalRounds, totalDefects, open, inProgress, closed, critical, rate };
  }, [rows]);

  // กรองรายการ
  const filteredRows = useMemo(() => {
    if (!rows) return [];
    let list = rows;

    if (weekFilter !== "all") {
      const wNum = parseInt(weekFilter, 10);
      list = list.filter((r) => r.weekNumber === wNum);
    }

    if (statusFilter === "has_open") {
      list = list.filter((r) => r.openCount > 0 || r.inProgressCount > 0);
    } else if (statusFilter === "all_closed") {
      list = list.filter((r) => r.totalDefects > 0 && r.openCount === 0 && r.inProgressCount === 0);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [r.store, r.storeCode, r.contractor, r.pm]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q))
      );
    }

    return list;
  }, [rows, weekFilter, statusFilter, searchQuery]);

  // สร้างรอบตรวจใหม่
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formStore.trim()) {
      alert("กรุณากรอกชื่อสาขา");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/defects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store: formStore.trim(),
          storeCode: formStoreCode.trim(),
          weekNumber: Number(formWeekNumber) || 1,
          weekTitle: `ตรวจ Defect สัปดาห์ที่ ${formWeekNumber}`,
          inspDate: formInspDate,
          contractor: formContractor.trim(),
          pm: formPm.trim(),
          defects: [],
        }),
      });

      if (!res.ok) throw new Error();
      const { id } = await res.json();
      setShowCreateModal(false);
      router.push(`/defects/${id}`);
    } catch {
      alert("สร้างรอบตรวจไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setIsCreating(false);
    }
  }

  // ลบรอบตรวจ
  async function handleDelete(id: string, store: string, week: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`ยืนยันการลบรอบตรวจ "${store} (Week ${week})"?\nรายการ Defect และรูปทั้งหมดจะถูกลบถาวร`)) return;

    try {
      await fetch(`/api/defects/${id}`, { method: "DELETE" });
      loadData();
    } catch {
      alert("ลบไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-page">
      {/* ─────────── Hero Header ─────────── */}
      <header className="relative bg-gradient-to-r from-[#0c2a47] via-[#12385c] to-brand text-white shadow-xl overflow-hidden">
        {/* ลาย Grid Blueprint */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-6">
          {/* Top Bar Switcher (3 แท็บเชื่อมต่อในระบบเดียวกัน) */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/15">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-white/90">
                Big-C Quality Control · Punch List
              </span>
            </div>

            {/* แท็บสลับ 3 โมดูลหลัก */}
            <div className="inline-flex p-1 bg-black/25 backdrop-blur-md rounded-2xl border border-white/15 text-xs">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-xl font-semibold text-white/80 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ตรวจโครงสร้าง ITP</span>
              </Link>

              <div className="px-3.5 py-1.5 rounded-xl font-bold bg-white text-brand shadow-sm flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" />
                <span>ตรวจ Defect รายวีค</span>
              </div>

              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-xl font-semibold text-white/80 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>แดชบอร์ด PM</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3 py-0.5 rounded-full text-xs font-semibold mb-2">
                <Sparkles className="w-3 h-3" />
                <span>Weekly Defect Inspection & Tracking</span>
              </div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-white">
                ระบบตรวจและติดตาม Defect รายสัปดาห์
              </h1>
              <p className="text-xs sm:text-sm text-white/75 mt-1 max-w-xl">
                บันทึกรายการข้อบกพร่องหน้างานแยกตามสัปดาห์ พร้อมภาพถ่าย Before / After และติดตามการแก้ไขจนปิดงาน
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold shadow-lg shadow-brand/30 self-start md:self-auto active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ สร้างรอบตรวจสัปดาห์ใหม่</span>
            </button>
          </div>

          {/* ────────── 5 KPI Summary Cards ────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
            <div className="card p-3.5 bg-white/10 backdrop-blur-md border-white/15 text-white">
              <div className="flex items-center justify-between text-white/75 text-xs">
                <span>รอบตรวจทั้งหมด</span>
                <Calendar className="w-4 h-4 text-sky-300" />
              </div>
              <div className="tnum font-display font-bold text-2xl mt-1.5">
                {stats.totalRounds} <span className="text-xs font-normal text-white/70">รอบ</span>
              </div>
              <div className="text-[11px] text-white/60 mt-0.5 truncate">แยกตามสาขาและสัปดาห์</div>
            </div>

            <div className="card p-3.5 bg-white/10 backdrop-blur-md border-white/15 text-white">
              <div className="flex items-center justify-between text-white/75 text-xs">
                <span>Defect ทั้งหมด</span>
                <Wrench className="w-4 h-4 text-amber-300" />
              </div>
              <div className="tnum font-display font-bold text-2xl mt-1.5 text-amber-300">
                {stats.totalDefects} <span className="text-xs font-normal text-white/70">จุด</span>
              </div>
              <div className="text-[11px] text-rose-300 mt-0.5 truncate">
                {stats.critical > 0 ? `● วิกฤต ${stats.critical} จุด` : "ไม่มีข้อบกพร่องวิกฤต"}
              </div>
            </div>

            <div className="card p-3.5 bg-white/10 backdrop-blur-md border-white/15 text-white">
              <div className="flex items-center justify-between text-white/75 text-xs">
                <span>รอแก้ไข / กำลังทำ</span>
                <Clock className="w-4 h-4 text-orange-300" />
              </div>
              <div className="tnum font-display font-bold text-2xl mt-1.5 text-orange-300">
                {stats.open + stats.inProgress} <span className="text-xs font-normal text-white/70">จุด</span>
              </div>
              <div className="text-[11px] text-white/60 mt-0.5 truncate">
                รอตรวจ {stats.open} · กำลังทำ {stats.inProgress}
              </div>
            </div>

            <div className="card p-3.5 bg-white/10 backdrop-blur-md border-white/15 text-white">
              <div className="flex items-center justify-between text-white/75 text-xs">
                <span>แก้ไขเสร็จแล้ว</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="tnum font-display font-bold text-2xl mt-1.5 text-emerald-300">
                {stats.closed} <span className="text-xs font-normal text-white/70">จุด</span>
              </div>
              <div className="text-[11px] text-emerald-200 mt-0.5 truncate">PM ตรวจปิดงานแล้ว</div>
            </div>

            <div className="card p-3.5 bg-white/10 backdrop-blur-md border-white/15 text-white col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-white/75 text-xs">
                <span>อัตราปิด Defect</span>
                <Sparkles className="w-4 h-4 text-teal-300" />
              </div>
              <div className="tnum font-display font-bold text-2xl mt-1.5 text-teal-300">
                {stats.rate}%
              </div>
              <div className="text-[11px] text-white/60 mt-0.5 truncate">
                {stats.closed}/{stats.totalDefects} จุดสมบูรณ์
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ────────── Main Content ────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* แถบค้นหา & ตัวกรองสัปดาห์ */}
        <div className="card p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* กล่องค้นหา */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-ink3 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อสาขา, รหัสสาขา, ผู้รับเหมา, หรือชื่อ PM..."
                className="field pl-9 py-2 text-xs w-full"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* กรองสัปดาห์ */}
              <div className="flex items-center gap-1.5 text-xs bg-sunken p-1 rounded-xl border border-line">
                <span className="text-ink3 px-2 font-medium">สัปดาห์:</span>
                <select
                  value={weekFilter}
                  onChange={(e) => setWeekFilter(e.target.value)}
                  className="bg-card border border-line rounded-lg px-2.5 py-1 text-xs text-ink font-semibold"
                >
                  <option value="all">ทุกสัปดาห์</option>
                  <option value="1">สัปดาห์ที่ 1</option>
                  <option value="2">สัปดาห์ที่ 2</option>
                  <option value="3">สัปดาห์ที่ 3</option>
                  <option value="4">สัปดาห์ที่ 4</option>
                  <option value="5">สัปดาห์ที่ 5</option>
                  <option value="6">สัปดาห์ที่ 6</option>
                </select>
              </div>

              {/* กรองสถานะ */}
              <div className="inline-flex p-1 bg-sunken rounded-xl border border-line text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    statusFilter === "all" ? "bg-card text-brand shadow-sm font-bold" : "text-ink3 hover:text-ink"
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("has_open")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    statusFilter === "has_open" ? "bg-card text-orange-600 shadow-sm font-bold" : "text-ink3 hover:text-ink"
                  }`}
                >
                  ยังมีค้าง
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("all_closed")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    statusFilter === "all_closed" ? "bg-card text-emerald-600 shadow-sm font-bold" : "text-ink3 hover:text-ink"
                  }`}
                >
                  ปิดครบแล้ว
                </button>
              </div>

              <button
                type="button"
                onClick={loadData}
                title="รีเฟรชข้อมูล"
                className="w-8 h-8 rounded-xl bg-sunken hover:bg-line border border-line grid place-items-center text-ink2 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ── รายการรอบตรวจ Defect ── */}
        {loading ? (
          <div className="card py-16 text-center">
            <div className="w-8 h-8 border-3 border-line border-t-brand rounded-full animate-spin mx-auto mb-3" />
            <p className="text-ink2 text-xs font-semibold">กำลังโหลดรายการตรวจ Defect…</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="card text-center py-16 px-6 border-dashed border-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 grid place-items-center mx-auto mb-3">
              <Wrench className="w-7 h-7" />
            </div>
            <h3 className="font-display font-bold text-lg text-ink">ยังไม่มีรอบตรวจ Defect</h3>
            <p className="text-ink2 text-xs sm:text-sm max-w-sm mx-auto mt-1 leading-relaxed">
              เริ่มต้นสร้างรอบตรวจประจำสัปดาห์สำหรับไซต์งาน เพื่อเริ่มบันทึกข้อบกพร่องพร้อมรูป Before/After
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-5 btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างรอบตรวจแรก</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredRows.map((r) => {
              const isComplete = r.totalDefects > 0 && r.openCount === 0 && r.inProgressCount === 0;

              return (
                <div
                  key={r.id}
                  onClick={() => router.push(`/defects/${r.id}`)}
                  className="group relative card card-hover p-4 sm:p-5 cursor-pointer overflow-hidden border-2 border-transparent hover:border-brand/40 transition-all"
                >
                  {/* แถบสีสถานะซ้ายมือ */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      isComplete
                        ? "bg-emerald-500"
                        : r.criticalCount > 0
                        ? "bg-rose-500"
                        : r.totalDefects === 0
                        ? "bg-slate-400"
                        : "bg-amber-500"
                    }`}
                  />

                  <div className="pl-2 sm:pl-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Badge สัปดาห์ */}
                          <span className="chip bg-brand/10 text-brand border border-brand/20 font-bold text-xs">
                            สัปดาห์ที่ {r.weekNumber} (Week {r.weekNumber})
                          </span>

                          <span className="font-display font-bold text-lg text-ink group-hover:text-brand transition-colors truncate">
                            {r.store}
                          </span>

                          {r.storeCode && r.storeCode !== "-" && (
                            <span className="chip bg-sunken text-ink2 text-xs font-mono">
                              {r.storeCode}
                            </span>
                          )}

                          {r.checkInVerified && (
                            <span className="chip bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-[11px] font-bold">
                              ✓ GPS หน้างาน
                            </span>
                          )}

                          {r.criticalCount > 0 && (
                            <span className="chip bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-bold animate-pulse">
                              ● วิกฤต {r.criticalCount} จุด
                            </span>
                          )}
                        </div>

                        {/* ข้อมูลโครงการ */}
                        <div className="flex items-center gap-3 text-xs text-ink2 mt-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-ink3" />
                            <span>ตรวจเมื่อ: {fmtDate(r.inspDate)}</span>
                          </span>

                          {r.pm && (
                            <span className="inline-flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-ink3" />
                              <span>PM: <strong>{r.pm}</strong></span>
                            </span>
                          )}

                          {r.contractor && (
                            <span className="inline-flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-ink3" />
                              <span>ผู้รับเหมา: {r.contractor}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ปุ่มจัดการลบ */}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(r.id, r.store, r.weekNumber, e)}
                        title="ลบรอบตรวจนี้"
                        className="shrink-0 w-8 h-8 rounded-xl grid place-items-center text-ink3 hover:text-fail hover:bg-fail/10 transition-colors opacity-30 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* สรุปตัวเลข Defect & Progress Bar */}
                    <div className="mt-4 pt-3 border-t border-line/60">
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-ink">รวม <strong>{r.totalDefects}</strong> จุด</span>
                          <span className="text-orange-600 dark:text-orange-400">
                            • รอแก้ {r.openCount + r.inProgressCount}
                          </span>
                          <span className="text-pass">
                            • ปิดแล้ว {r.closedCount}
                          </span>
                        </div>
                        <span className="tnum font-bold text-ink2">{r.resolutionRate}% สำเร็จ</span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-line overflow-hidden flex">
                        <div
                          className="bg-pass transition-all duration-300"
                          style={{ width: `${r.totalDefects > 0 ? (r.closedCount / r.totalDefects) * 100 : 0}%` }}
                        />
                        <div
                          className="bg-amber-400 transition-all duration-300"
                          style={{ width: `${r.totalDefects > 0 ? ((r.openCount + r.inProgressCount) / r.totalDefects) * 100 : 0}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-2.5 text-[11.5px] text-ink3">
                        <span>{r.savedAt ? `บันทึกล่าสุด: ${fmtDate(r.savedAt)}` : "ยังไม่เคยบันทึก"}</span>
                        <span className="text-brand font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                          <span>เปิดตรวจ Defect</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ────────── MODAL สร้างรอบตรวจสัปดาห์ใหม่ ────────── */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in duration-150"
        >
          <div className="card max-w-md w-full bg-card shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-gradient-to-r from-brand to-[#12385c] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-300" />
                <h3 className="font-display font-bold text-base">สร้างรอบตรวจ Defect สัปดาห์ใหม่</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center text-xs transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block font-bold text-ink2 mb-1">ชื่อสาขา (Store) *</label>
                  <input
                    type="text"
                    required
                    value={formStore}
                    onChange={(e) => setFormStore(e.target.value)}
                    placeholder="เช่น สาขาลาดพร้าว 101"
                    className="field w-full"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink2 mb-1">รหัสสาขา</label>
                  <input
                    type="text"
                    value={formStoreCode}
                    onChange={(e) => setFormStoreCode(e.target.value)}
                    placeholder="B101"
                    className="field w-full font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-ink2 mb-1">ตรวจสัปดาห์ที่ (Week) *</label>
                  <select
                    value={formWeekNumber}
                    onChange={(e) => setFormWeekNumber(Number(e.target.value))}
                    className="field w-full font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
                      <option key={w} value={w}>
                        สัปดาห์ที่ {w} (Week {w})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-ink2 mb-1">วันที่เข้าตรวจ *</label>
                  <input
                    type="date"
                    required
                    value={formInspDate}
                    onChange={(e) => setFormInspDate(e.target.value)}
                    className="field w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink2 mb-1">วิศวกรผู้ตรวจ (PM)</label>
                <input
                  type="text"
                  value={formPm}
                  onChange={(e) => setFormPm(e.target.value)}
                  placeholder="เช่น สมชาย วิศวกรรม"
                  className="field w-full"
                />
              </div>

              <div>
                <label className="block font-bold text-ink2 mb-1">ผู้รับเหมา (Contractor)</label>
                <input
                  type="text"
                  value={formContractor}
                  onChange={(e) => setFormContractor(e.target.value)}
                  placeholder="เช่น บริษัท ก่อสร้างไทย จำกัด"
                  className="field w-full"
                />
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-card border border-line font-bold text-ink2 hover:bg-sunken"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn-primary px-5 py-2 font-bold flex items-center gap-1.5 shadow-md"
                >
                  {isCreating ? "กำลังสร้าง…" : "สร้างรอบตรวจ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
