"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { checklist, totalItems } from "@/lib/checklist";
import type { RecordSummary } from "@/lib/types";
import Link from "next/link";
import UserNav from "./UserNav";
import {
  Plus,
  Search,
  X,
  Trash2,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  Building2,
  User,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Users,
  Layers,
  Wrench,
} from "lucide-react";

const TOTAL = totalItems();

function fmtShort(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("th-TH", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function RecordList() {
  const router = useRouter();
  const [rows, setRows] = useState<RecordSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_progress" | "has_fail" | "completed">("all");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/records");
      const data = await res.json();
      setRows(data);
      setFailed(false);
    } catch {
      setFailed(true);
      setRows([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    if (!rows) return null;
    let list = rows;

    if (statusFilter === "has_fail") {
      list = list.filter((r) => r.fail > 0);
    } else if (statusFilter === "completed") {
      list = list.filter((r) => r.filled === TOTAL);
    } else if (statusFilter === "in_progress") {
      list = list.filter((r) => r.filled > 0 && r.filled < TOTAL && r.fail === 0);
    }

    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((r) => {
      const p = r.project || {};
      return [p.store, p.storeCode, p.contractor, p.pm]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, q, statusFilter]);

  // สถิติรวม
  const stats = useMemo(() => {
    if (!rows) return { totalRecords: 0, hasFail: 0, completed: 0, inProgress: 0 };
    return {
      totalRecords: rows.length,
      hasFail: rows.filter((r) => r.fail > 0).length,
      completed: rows.filter((r) => r.filled === TOTAL).length,
      inProgress: rows.filter((r) => r.filled > 0 && r.filled < TOTAL && r.fail === 0).length,
    };
  }, [rows]);

  async function newRecord() {
    setCreating(true);
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: {
            inspDate: new Date().toISOString().slice(0, 10),
          },
          items: {},
          savedAt: null,
          approvalStatus: "รอตรวจ",
        }),
      });
      const { id } = await res.json();
      router.push(`/record/${id}`);
    } catch {
      setCreating(false);
      setFailed(true);
    }
  }

  async function remove(id: string, name: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`ยืนยันการลบใบตรวจ "${name}"?\nข้อมูลผลตรวจและรูปที่แนบทั้งหมดจะถูกลบถาวร`)) return;
    try {
      await fetch(`/api/records/${id}`, { method: "DELETE" });
      load();
    } catch {
      alert("ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }

  return (
    <div className="min-h-screen pb-20">
      {/* ─────────── Hero Header หรูหราและชัดเจน ─────────── */}
      <header className="relative bg-gradient-to-br from-brand via-[#1a4a76] to-[#0f2d4a] text-white shadow-xl overflow-hidden">
        {/* ลาย Background Blueprint Grid จางๆ */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-7 pb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/15">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-white/90">
                {checklist.form.formNo} · Rev.{checklist.form.rev}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* แท็บสลับ 3 โมดูลหลัก */}
              <div className="inline-flex p-1 bg-black/25 backdrop-blur-md rounded-2xl border border-white/15 text-xs">
                <div className="px-3.5 py-1.5 rounded-xl font-bold bg-white text-brand shadow-sm flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>ตรวจโครงสร้าง ITP</span>
                </div>
                <Link
                  href="/defects"
                  className="px-3 py-1.5 rounded-xl font-semibold text-white/80 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>ตรวจ Defect รายวีค</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="px-3 py-1.5 rounded-xl font-semibold text-white/80 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>แดชบอร์ด PM</span>
                </Link>
              </div>

              {/* โปรไฟล์ & สลับบทบาท */}
              <UserNav />
            </div>
          </div>

          <div className="mt-3 sm:flex sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-white leading-tight">
                {checklist.form.title}
              </h1>
              <p className="text-sm text-white/75 mt-1">
                รายการตรวจมาตรฐานงานวิศวกรรมโครงสร้าง ({checklist.sections.length} หมวดหลัก · {TOTAL} รายการ ITP)
              </p>
            </div>

            <button
              onClick={newRecord}
              disabled={creating}
              className="mt-4 sm:mt-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                         bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-display font-bold
                         text-[15px] shadow-lg shadow-amber-500/25 transition-all shrink-0 disabled:opacity-60"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>{creating ? "กำลังสร้าง…" : "สร้างใบตรวจใหม่"}</span>
            </button>
          </div>

          {/* แถบสถิติสรุปภาพรวม */}
          {rows && rows.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-5 border-t border-white/15">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3.5 py-2.5 border border-white/10">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/70">
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>ใบตรวจทั้งหมด</span>
                </div>
                <div className="tnum font-display font-bold text-2xl text-white mt-0.5">{stats.totalRecords}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3.5 py-2.5 border border-white/10">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ตรวจครบแล้ว</span>
                </div>
                <div className="tnum font-display font-bold text-2xl text-emerald-300 mt-0.5">{stats.completed}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3.5 py-2.5 border border-white/10">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-300">
                  <Clock className="w-3.5 h-3.5" />
                  <span>กำลังตรวจ</span>
                </div>
                <div className="tnum font-display font-bold text-2xl text-amber-300 mt-0.5">{stats.inProgress}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3.5 py-2.5 border border-white/10">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-300">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>มีรายการไม่ผ่าน</span>
                </div>
                <div className="tnum font-display font-bold text-2xl text-rose-300 mt-0.5">{stats.hasFail}</div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {failed && (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-2xl p-4 text-[14px] mb-5 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold">เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ชั่วคราว</div>
              <div className="text-[13px] text-ink2 mt-0.5">กรุณาตรวจสอบการทำงานของเซิร์ฟเวอร์แล้วกดโหลดข้อมูลใหม่</div>
            </div>
            <button onClick={load} className="font-bold text-brand underline shrink-0 px-2 py-1">
              โหลดใหม่
            </button>
          </div>
        )}

        {/* ── แถบเครื่องมือ ค้นหา + ตัวกรองสถานะ ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink3 w-4 h-4" />
            <input
              id="search-records"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาตามชื่อสาขา, รหัสสาขา, ผู้รับเหมา, หรือผู้ตรวจ..."
              className="field pl-10 pr-9 bg-card"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink text-sm w-5 h-5 rounded-full grid place-items-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "in_progress", label: "กำลังตรวจ" },
              { id: "has_fail", label: "ไม่ผ่าน" },
              { id: "completed", label: "ตรวจครบ" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-2 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap ${
                  statusFilter === tab.id
                    ? "bg-brand text-white shadow-sm"
                    : "bg-card text-ink2 border border-line hover:text-ink hover:bg-sunken"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── โหลดข้อมูลอยู่ ── */}
        {rows === null && (
          <div className="text-center py-24">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full border-3 border-line border-t-brand animate-spin" />
            <div className="text-ink2 text-sm font-medium">กำลังโหลดรายการใบตรวจ…</div>
          </div>
        )}

        {/* ── ไม่มีข้อมูลเลย ── */}
        {rows !== null && rows.length === 0 && !failed && (
          <div className="card text-center py-16 px-6 border-dashed border-2">
            <div className="w-16 h-16 rounded-2xl bg-brand/10 text-brand grid place-items-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h2 className="font-display font-bold text-xl text-ink">ยังไม่มีใบตรวจในระบบ</h2>
            <p className="text-ink2 text-sm max-w-sm mx-auto mt-2 leading-relaxed">
              เริ่มต้นสร้างใบตรวจใหม่เพื่อบันทึกงานโครงสร้างตามมาตรฐาน ITP ครบทั้ง {TOTAL} รายการ
            </p>
            <button
              onClick={newRecord}
              disabled={creating}
              className="mt-5 btn-primary inline-flex items-center gap-2 px-6 py-3 text-[15px]"
            >
              <Plus className="w-5 h-5" />
              <span>สร้างใบตรวจแรก</span>
            </button>
          </div>
        )}

        {/* ── ไม่พบผลการค้นหา ── */}
        {shown !== null && rows !== null && rows.length > 0 && shown.length === 0 && (
          <div className="card text-center py-14 px-4">
            <div className="w-12 h-12 rounded-full bg-sunken grid place-items-center mx-auto mb-2 text-ink3">
              <Search className="w-6 h-6" />
            </div>
            <div className="font-bold text-ink text-base">ไม่พบผลการค้นหา</div>
            <div className="text-ink2 text-sm mt-1">
              ไม่พบใบตรวจที่ตรงกับคำค้นหาหรือตัวกรองที่เลือก
            </div>
            <button
              onClick={() => { setQ(""); setStatusFilter("all"); }}
              className="mt-3 text-brand text-sm font-bold underline"
            >
              ล้างคำค้นหา
            </button>
          </div>
        )}

        {/* ── รายการใบตรวจ ── */}
        <div className="grid grid-cols-1 gap-3.5">
          {shown?.map((r) => {
            const p = r.project || {};
            const name = p.store || "(ยังไม่ระบุชื่อสาขา)";
            const pct = Math.round((r.filled / TOTAL) * 100);

            // คำนวณ badge สถานะ
            let statusBadge = {
              color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
              label: "กำลังตรวจ",
              barColor: "bg-blue-500",
            };

            if (r.fail > 0) {
              statusBadge = {
                color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                label: `ไม่ผ่าน ${r.fail} รายการ`,
                barColor: "bg-rose-500",
              };
            } else if (r.filled === TOTAL) {
              statusBadge = {
                color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                label: "ตรวจครบแล้ว",
                barColor: "bg-emerald-500",
              };
            } else if (r.filled === 0) {
              statusBadge = {
                color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
                label: "ยังไม่เริ่ม",
                barColor: "bg-slate-400",
              };
            }

            return (
              <div
                key={r.id}
                onClick={() => router.push(`/record/${r.id}`)}
                className="group relative card card-hover p-4 sm:p-5 cursor-pointer overflow-hidden"
              >
                {/* แถบสีซ้ายมือบ่งชี้สถานะ */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusBadge.barColor}`} />

                <div className="pl-2 sm:pl-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-lg text-ink group-hover:text-brand transition-colors truncate">
                          {name}
                        </span>
                        {p.storeCode && (
                          <span className="tnum text-xs font-semibold px-2 py-0.5 rounded-md bg-sunken border border-line text-ink2">
                            {p.storeCode}
                          </span>
                        )}
                        <span className={`chip border text-[11px] font-bold ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                        {r.approvalStatus && r.approvalStatus !== "รอตรวจ" && (
                          <span className="chip bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[11px] font-bold">
                            {r.approvalStatus}
                          </span>
                        )}
                        {r.checkInVerified && (
                          <span className="chip bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>เช็คอินหน้างานแล้ว</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[13px] text-ink2 mt-1.5 flex-wrap">
                        {p.inspDate && (
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-ink3" />
                            <span>ตรวจเมื่อ {p.inspDate}</span>
                          </span>
                        )}
                        {p.contractor && (
                          <span className="inline-flex items-center gap-1.5 truncate max-w-[240px]">
                            <Building2 className="w-3.5 h-3.5 text-ink3 shrink-0" />
                            <span>ผู้รับเหมา: {p.contractor}</span>
                          </span>
                        )}
                        {p.pm && (
                          <span className="inline-flex items-center gap-1.5 truncate max-w-[200px]">
                            <User className="w-3.5 h-3.5 text-ink3 shrink-0" />
                            <span>PM: {p.pm}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ปุ่มจัดการลบ */}
                    <button
                      type="button"
                      onClick={(e) => remove(r.id, name, e)}
                      title="ลบใบตรวจนี้"
                      className="shrink-0 w-9 h-9 rounded-xl grid place-items-center text-ink3 hover:text-fail hover:bg-fail/10 transition-all opacity-40 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress Bar แสดงความคืบหน้า 3 สี */}
                  <div className="mt-4 pt-3 border-t border-line/60">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <div className="flex items-center gap-3">
                        <span className="tnum text-pass font-bold">✓ ผ่าน {r.pass}</span>
                        <span className="tnum text-fail font-bold">✕ ไม่ผ่าน {r.fail}</span>
                        <span className="tnum text-ink3">บันทึก {r.filled}/{TOTAL}</span>
                      </div>
                      <span className="tnum font-display font-bold text-ink2 text-sm">{pct}%</span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-line overflow-hidden flex">
                      <div
                        className="bg-pass transition-all duration-300"
                        style={{ width: `${(r.pass / TOTAL) * 100}%` }}
                      />
                      <div
                        className="bg-fail transition-all duration-300"
                        style={{ width: `${(r.fail / TOTAL) * 100}%` }}
                      />
                      <div
                        className="bg-na transition-all duration-300"
                        style={{
                          width: `${(Math.max(0, r.filled - r.pass - r.fail) / TOTAL) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-2.5 text-[11.5px] text-ink3">
                      <span>{r.savedAt ? `บันทึกล่าสุด: ${fmtShort(r.savedAt)}` : "ยังไม่เคยบันทึก"}</span>
                      <span className="text-brand font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        <span>เปิดตรวจต่อ</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
