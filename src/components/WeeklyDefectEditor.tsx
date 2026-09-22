"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  WeeklyDefectRecord,
  DefectItem,
  DefectCategory,
  DefectSeverity,
  DefectStatus,
  CheckInData,
} from "@/lib/types";
import QRCheckIn from "./QRCheckIn";
import PhotoUploader from "./PhotoUploader";
import {
  ArrowLeft,
  Printer,
  Save,
  Plus,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Building2,
  User,
  Trash2,
  Camera,
  Check,
  X,
  Sparkles,
  ChevronDown,
  Filter,
} from "lucide-react";

const CATEGORIES: DefectCategory[] = [
  "โครงสร้าง",
  "สถาปัตย์",
  "สีและผนัง",
  "พื้นและกระเบื้อง",
  "ระบบ MEP",
  "หลังคาและกันซึม",
  "ความปลอดภัย",
  "ทั่วไป",
];

const SEVERITIES: { id: DefectSeverity; label: string; color: string }[] = [
  { id: "critical", label: "วิกฤต (Critical)", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold" },
  { id: "major", label: "ปานกลาง (Major)", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold" },
  { id: "minor", label: "เล็กน้อย (Minor)", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30" },
];

export default function WeeklyDefectEditor({ id }: { id: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<WeeklyDefectRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // ฟิลเตอร์รายการในหน้านี้
  const [catFilter, setCatFilter] = useState<string>("all");
  const [statFilter, setStatFilter] = useState<string>("all");

  // Modal เพิ่ม Defect ใหม่
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCat, setNewCat] = useState<DefectCategory>("โครงสร้าง");
  const [newLocation, setNewLocation] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSeverity, setNewSeverity] = useState<DefectSeverity>("major");
  const [newDueDate, setNewDueDate] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/defects/${id}`);
      if (!res.ok) throw new Error();
      const data: WeeklyDefectRecord = await res.json();
      setRecord(data);
    } catch {
      alert("ไม่พบข้อมูลใบตรวจ Defect นี้");
      router.push("/defects");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  // บันทึกข้อมูล
  const save = useCallback(async () => {
    if (!record) return;
    setSaving(true);
    setStatusMsg("กำลังบันทึก…");
    const savedAt = new Date().toISOString();
    const body: WeeklyDefectRecord = { ...record, savedAt };

    try {
      const res = await fetch(`/api/defects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error();
      setRecord(body);
      setDirty(false);
      setStatusMsg("บันทึกสำเร็จ");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch {
      setStatusMsg("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }, [record, id]);

  // จัดการเช็คอินหน้างาน
  const handleCheckIn = useCallback((checkInData: CheckInData) => {
    setDirty(true);
    setRecord((prev) => (prev ? { ...prev, checkIn: checkInData } : prev));
  }, []);

  const handleClearCheckIn = useCallback(() => {
    setDirty(true);
    setRecord((prev) => (prev ? { ...prev, checkIn: null } : prev));
  }, []);

  // เพิ่ม Defect ข้อใหม่
  const handleAddDefect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;

    const newItem: DefectItem = {
      id: crypto.randomUUID(),
      itemNo: (record?.defects.length || 0) + 1,
      category: newCat,
      location: newLocation.trim() || "ไม่ระบุตำแหน่ง",
      description: newDesc.trim(),
      severity: newSeverity,
      status: "open",
      dueDate: newDueDate || undefined,
      beforePhotos: [],
      afterPhotos: [],
      createdAt: new Date().toISOString(),
    };

    setDirty(true);
    setRecord((prev) =>
      prev ? { ...prev, defects: [...prev.defects, newItem] } : prev
    );

    setNewLocation("");
    setNewDesc("");
    setNewDueDate("");
    setShowAddModal(false);
  };

  // อัปเดต Defect แต่ละข้อ
  const updateDefect = useCallback((defectId: string, patch: Partial<DefectItem>) => {
    setDirty(true);
    setRecord((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        defects: prev.defects.map((d) => (d.id === defectId ? { ...d, ...patch } : d)),
      };
    });
  }, []);

  // ลบ Defect
  const removeDefect = useCallback((defectId: string) => {
    if (!confirm("ยืนยันการลบรายการ Defect นี้?")) return;
    setDirty(true);
    setRecord((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        defects: prev.defects.filter((d) => d.id !== defectId),
      };
    });
  }, []);

  // สถิติในรอบนี้
  const summary = useMemo(() => {
    if (!record) return { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, critical: 0, rate: 0 };
    const defects = record.defects;
    const total = defects.length;
    const open = defects.filter((d) => d.status === "open").length;
    const inProgress = defects.filter((d) => d.status === "in_progress").length;
    const resolved = defects.filter((d) => d.status === "resolved").length;
    const closed = defects.filter((d) => d.status === "closed").length;
    const critical = defects.filter((d) => d.severity === "critical" && d.status !== "closed").length;
    const rate = total > 0 ? Math.round((closed / total) * 100) : 0;
    return { total, open, inProgress, resolved, closed, critical, rate };
  }, [record]);

  // กรองรายการ
  const displayedDefects = useMemo(() => {
    if (!record) return [];
    let list = record.defects;

    if (catFilter !== "all") {
      list = list.filter((d) => d.category === catFilter);
    }

    if (statFilter !== "all") {
      list = list.filter((d) => d.status === statFilter);
    }

    return list;
  }, [record, catFilter, statFilter]);

  // Watermark Meta สำหรับภาพถ่ายในรอบนี้
  const watermarkMeta = useMemo(() => {
    return {
      storeName: record?.store,
      storeCode: record?.storeCode,
      pmName: record?.pm || record?.checkIn?.inspectorName,
      coords: record?.checkIn?.lat && record?.checkIn?.lng
        ? {
            lat: record.checkIn.lat,
            lng: record.checkIn.lng,
            accuracy: record.checkIn.accuracy,
          }
        : null,
    };
  }, [record]);

  if (loading || !record) {
    return (
      <div className="min-h-screen grid place-items-center bg-page">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full border-3 border-line border-t-brand animate-spin" />
          <div className="text-ink2 text-sm font-semibold">กำลังโหลดข้อมูลรอบตรวจ Defect…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-36 bg-page">
      {/* ─────────── Sticky Header ─────────── */}
      <header
        className="sticky z-30 bg-gradient-to-r from-[#0c2a47] via-[#12385c] to-brand text-white shadow-lift no-print"
        style={{ top: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-3">
          <div className="flex items-center gap-3">
            <Link
              href="/defects"
              aria-label="กลับหน้ารายการตรวจ Defect"
              className="w-10 h-10 shrink-0 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="chip bg-white/20 text-white font-bold text-xs">
                  สัปดาห์ที่ {record.weekNumber} (Week {record.weekNumber})
                </span>
                <h1 className="font-display font-bold text-lg sm:text-xl leading-tight truncate">
                  {record.store || "ตรวจ Defect รายสัปดาห์"}
                </h1>
                {record.storeCode && (
                  <span className="chip bg-black/20 text-white/90 text-xs font-mono">
                    {record.storeCode}
                  </span>
                )}
              </div>

              <div className="text-[12px] text-white/75 truncate mt-0.5">
                ตรวจเมื่อ: {record.inspDate || "-"}
                {record.pm && ` · PM: ${record.pm}`}
                {record.contractor && ` · ผู้รับเหมา: ${record.contractor}`}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                title="พิมพ์ / บันทึก PDF"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ PDF</span>
              </button>

              <div className="text-right pl-2 border-l border-white/15">
                <div className="tnum font-display font-bold text-xl sm:text-2xl leading-none text-emerald-300">
                  {summary.rate}%
                </div>
                <div className="tnum text-[11px] text-white/70">
                  ปิดแล้ว {summary.closed}/{summary.total}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 space-y-4">
        {/* ────────── 1. ระบบเช็คอิน QR + GPS หน้างาน ────────── */}
        <QRCheckIn
          storeName={record.store}
          storeCode={record.storeCode}
          pmName={record.pm}
          checkIn={record.checkIn}
          onCheckIn={handleCheckIn}
          onClearCheckIn={handleClearCheckIn}
        />

        {/* ────────── 2. แถบสรุปตัวเลข Defect ประจำรอบนี้ ────────── */}
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
            <div>
              <h2 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <Wrench className="w-4 h-4 text-brand" />
                <span>รายการ Defect ประจำสัปดาห์ที่ {record.weekNumber}</span>
              </h2>
              <p className="text-xs text-ink2 mt-0.5">
                บันทึกภาพถ่าย ก่อนแก้ไข (Before) และหลังแก้ไข (After) พร้อมระบุสถานะงาน
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold shadow-md shadow-brand/20 self-start sm:self-auto active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มรายการ Defect</span>
            </button>
          </div>

          {/* สถิติตัวเลข 4 สถานะ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-center text-xs">
            <div className="bg-sunken p-2.5 rounded-xl border border-line">
              <div className="text-ink3 text-[11px]">รอแก้ไข (Open)</div>
              <div className="tnum font-bold text-base text-rose-600 dark:text-rose-400 mt-0.5">
                {summary.open} จุด
              </div>
            </div>

            <div className="bg-sunken p-2.5 rounded-xl border border-line">
              <div className="text-ink3 text-[11px]">กำลังทำ (In Progress)</div>
              <div className="tnum font-bold text-base text-amber-600 dark:text-amber-400 mt-0.5">
                {summary.inProgress} จุด
              </div>
            </div>

            <div className="bg-sunken p-2.5 rounded-xl border border-line">
              <div className="text-ink3 text-[11px]">รอ PM ตรวจ (Resolved)</div>
              <div className="tnum font-bold text-base text-sky-600 dark:text-sky-400 mt-0.5">
                {summary.resolved} จุด
              </div>
            </div>

            <div className="bg-sunken p-2.5 rounded-xl border border-line">
              <div className="text-ink3 text-[11px]">ปิดงานแล้ว (Closed)</div>
              <div className="tnum font-bold text-base text-emerald-600 dark:text-emerald-400 mt-0.5">
                {summary.closed} จุด
              </div>
            </div>
          </div>
        </div>

        {/* ────────── 3. แถบตัวกรองสถานะ & หมวดงาน ────────── */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs bg-card p-3 rounded-2xl border border-line">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-ink3 font-semibold shrink-0">สถานะ:</span>
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "open", label: "รอแก้ไข" },
              { id: "in_progress", label: "กำลังทำ" },
              { id: "resolved", label: "รอตรวจ" },
              { id: "closed", label: "ปิดแล้ว" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatFilter(st.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                  statFilter === st.id ? "bg-brand text-white font-bold" : "bg-sunken text-ink2 hover:text-ink"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-ink3 font-semibold shrink-0">หมวด:</span>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="bg-sunken border border-line rounded-lg px-2.5 py-1 text-xs text-ink font-semibold"
            >
              <option value="all">ทุกหมวดงาน</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ────────── 4. รายการการ์ด Defect แต่ละจุด ────────── */}
        {displayedDefects.length === 0 ? (
          <div className="card text-center py-16 px-4">
            <Wrench className="w-12 h-12 text-ink3 mx-auto mb-2 opacity-50" />
            <h3 className="font-bold text-sm text-ink">ไม่พบรายการ Defect ตามเงื่อนไข</h3>
            <p className="text-ink2 text-xs mt-1">กดปุ่ม "+ เพิ่มรายการ Defect" ด้านบนเพื่อเริ่มบันทึกข้อบกพร่อง</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedDefects.map((d, index) => {
              const sev = SEVERITIES.find((s) => s.id === d.severity) || SEVERITIES[1];

              return (
                <div key={d.id} className="card p-4 sm:p-5 relative overflow-hidden">
                  {/* แถบสีซ้ายมือตามระดับความรุนแรง */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      d.status === "closed"
                        ? "bg-emerald-500"
                        : d.severity === "critical"
                        ? "bg-rose-500"
                        : d.severity === "major"
                        ? "bg-amber-500"
                        : "bg-slate-400"
                    }`}
                  />

                  <div className="pl-1 sm:pl-2">
                    {/* Header ของ Defect */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-line/60">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="tnum font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-sunken border border-line text-ink2">
                            #{d.itemNo || index + 1}
                          </span>

                          <span className="chip bg-brand/10 text-brand font-bold text-xs">
                            {d.category}
                          </span>

                          <span className={`chip border text-[11px] ${sev.color}`}>
                            {sev.label}
                          </span>

                          <span className="text-xs text-ink font-bold">
                            📍 {d.location}
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-ink mt-2">
                          {d.description}
                        </p>
                      </div>

                      {/* สวิตช์เปลี่ยนสถานะ 4 ขั้นตอน */}
                      <div className="inline-flex p-1 bg-sunken rounded-xl border border-line text-xs self-start shrink-0">
                        <button
                          type="button"
                          onClick={() => updateDefect(d.id, { status: "open" })}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                            d.status === "open"
                              ? "bg-rose-600 text-white shadow-sm"
                              : "text-ink3 hover:text-ink"
                          }`}
                        >
                          รอแก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDefect(d.id, { status: "in_progress" })}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                            d.status === "in_progress"
                              ? "bg-amber-500 text-white shadow-sm"
                              : "text-ink3 hover:text-ink"
                          }`}
                        >
                          กำลังทำ
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDefect(d.id, { status: "resolved", resolvedAt: new Date().toISOString() })}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                            d.status === "resolved"
                              ? "bg-sky-600 text-white shadow-sm"
                              : "text-ink3 hover:text-ink"
                          }`}
                        >
                          รอตรวจ
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDefect(d.id, { status: "closed", closedAt: new Date().toISOString() })}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                            d.status === "closed"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "text-ink3 hover:text-ink"
                          }`}
                        >
                          ปิดงาน ✓
                        </button>
                      </div>
                    </div>

                    {/* ช่องเปรียบเทียบรูปภาพ Before vs After พร้อมลายน้ำ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3.5 pt-1">
                      {/* รูปภาพก่อนแก้ไข (Before) */}
                      <div className="bg-sunken/40 p-3 rounded-xl border border-line/70">
                        <div className="flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 mb-1.5">
                          <span className="flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5" />
                            <span>รูปก่อนแก้ไข (Before)</span>
                          </span>
                          <span className="text-[10px] text-ink3 font-normal font-mono">
                            {d.beforePhotos.length} รูป
                          </span>
                        </div>

                        <PhotoUploader
                          photos={d.beforePhotos}
                          onChange={(photos) => updateDefect(d.id, { beforePhotos: photos })}
                          watermarkMeta={{
                            ...watermarkMeta,
                            itemName: `[BEFORE] Defect #${d.itemNo}: ${d.description.slice(0, 30)}`,
                          }}
                        />
                      </div>

                      {/* รูปภาพหลังแก้ไข (After) */}
                      <div className="bg-sunken/40 p-3 rounded-xl border border-line/70">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>รูปหลังแก้ไข (After Fix)</span>
                          </span>
                          <span className="text-[10px] text-ink3 font-normal font-mono">
                            {d.afterPhotos.length} รูป
                          </span>
                        </div>

                        <PhotoUploader
                          photos={d.afterPhotos}
                          onChange={(photos) => updateDefect(d.id, { afterPhotos: photos })}
                          watermarkMeta={{
                            ...watermarkMeta,
                            itemName: `[AFTER] Defect #${d.itemNo}: ${d.description.slice(0, 30)}`,
                          }}
                        />
                      </div>
                    </div>

                    {/* แถบความคิดเห็น & ปุ่มลบ */}
                    <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-3 text-ink3">
                        {d.dueDate && (
                          <span>กำหนดเสร็จ: <strong>{d.dueDate}</strong></span>
                        )}
                        {d.closedAt && (
                          <span className="text-emerald-600 font-semibold">
                            ✓ ปิดงานเมื่อ: {new Date(d.closedAt).toLocaleDateString("th-TH")}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeDefect(d.id)}
                        className="text-fail hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบข้อนี้</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ────────── Fixed Bottom Bar ────────── */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-md border-t border-line shadow-2xl p-3 no-print">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-ink2">
            {dirty ? (
              <span className="text-amber-500 font-bold animate-pulse">● มีการแก้ไขที่ยังไม่ได้บันทึก</span>
            ) : statusMsg ? (
              <span className="text-emerald-500 font-bold">{statusMsg}</span>
            ) : (
              <span>ข้อมูลบันทึกล่าสุดเรียบร้อย</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/defects"
              className="px-4 py-2 rounded-xl bg-sunken border border-line text-xs font-bold text-ink2 hover:text-ink"
            >
              กลับหน้ารายการ
            </Link>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-primary px-6 py-2.5 text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand/30"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "กำลังบันทึก…" : "บันทึกผลตรวจ Defect"}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* ────────── MODAL เพิ่ม DEFECT ใหม่ ────────── */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in duration-150"
        >
          <div className="card max-w-lg w-full bg-card shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-gradient-to-r from-brand to-[#12385c] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-300" />
                <h3 className="font-display font-bold text-base">เพิ่มรายการ Defect ใหม่</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDefect} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-ink2 mb-1">หมวดงาน (Category) *</label>
                  <select
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value as DefectCategory)}
                    className="field w-full font-bold"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-ink2 mb-1">ความรุนแรง (Severity) *</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as DefectSeverity)}
                    className="field w-full font-bold"
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink2 mb-1">ตำแหน่งหน้างาน (Area / Location) *</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="เช่น เสา C3, ผนังห้องน้ำ, ทางลาดคนพิการ, ใต้แผงสวิตช์บอร์ด"
                  className="field w-full"
                />
              </div>

              <div>
                <label className="block font-bold text-ink2 mb-1">รายละเอียดข้อบกพร่อง (Description) *</label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="ระบุข้อบกพร่องที่พบ และแนวทางแก้ไข เช่น รอยแตกร้าวที่มุมเสา กว้าง 2 มม. สั่งให้อัดฉีดอีพ็อกซี่และฉาบเก็บผิว"
                  className="field w-full"
                />
              </div>

              <div>
                <label className="block font-bold text-ink2 mb-1">กำหนดแก้ไขเสร็จ (Due Date)</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="field w-full"
                />
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-card border border-line font-bold text-ink2 hover:bg-sunken"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn-primary px-5 py-2 font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มรายการ Defect</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
