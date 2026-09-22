"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { checklist, itemKey, totalItems } from "@/lib/checklist";
import type {
  InspectionRecord,
  ItemResult,
  ChecklistItem,
  TestResult,
  SignatureData,
  CheckInData,
} from "@/lib/types";
import ItemRow from "./ItemRow";
import PhotoUploader from "./PhotoUploader";
import QRCheckIn from "./QRCheckIn";
import {
  ArrowLeft,
  Printer,
  ClipboardList,
  FlaskConical,
  FileSignature,
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  Camera,
  Check,
  X,
  Save,
  CheckCircle2,
  Scale,
  Sparkles,
  Search,
  PauseCircle,
} from "lucide-react";

const TOTAL = totalItems();

type Filter = "all" | "todo" | "fail";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "todo", label: "ยังไม่กรอก" },
  { id: "fail", label: "ไม่ผ่าน" },
];

function fmtShort(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("th-TH", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function ProgressBar({ pass, fail, filled, total, thin }: {
  pass: number; fail: number; filled: number; total: number; thin?: boolean;
}) {
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  const other = Math.max(0, filled - pass - fail);
  return (
    <div className={`flex w-full overflow-hidden rounded-full bg-line ${thin ? "h-1.5" : "h-2"}`}>
      <div className="bg-pass transition-[width] duration-300 ease-snap" style={{ width: `${pct(pass)}%` }} />
      <div className="bg-fail transition-[width] duration-300 ease-snap" style={{ width: `${pct(fail)}%` }} />
      <div className="bg-na transition-[width] duration-300 ease-snap" style={{ width: `${pct(other)}%` }} />
    </div>
  );
}

export default function RecordEditor({ id }: { id: string }) {
  const [record, setRecord] = useState<InspectionRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeTab, setActiveTab] = useState<"checklist" | "tests" | "signatures">("checklist");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [openProject, setOpenProject] = useState(true);
  const [showNcrModal, setShowNcrModal] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/records/${id}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as InspectionRecord;
        if (alive) {
          setRecord({
            ...data,
            id,
            project: data.project ?? {},
            items: data.items ?? {},
            testResults: data.testResults ?? {},
            signatures: data.signatures ?? {},
            approvalStatus: data.approvalStatus || "รอตรวจ",
            approvalComment: data.approvalComment || "",
            savedAt: data.savedAt ?? null,
          });
          setStatusMsg(data.savedAt ? `บันทึกล่าสุด ${fmtShort(data.savedAt)}` : "ยังไม่เคยบันทึก");
          setOpenProject(!data.savedAt);
        }
      } catch {
        if (alive) setNotFound(true);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = useCallback((key: string, patch: Partial<ItemResult>) => {
    setDirty(true);
    setRecord((prev) => {
      if (!prev) return prev;
      const cur: ItemResult = prev.items[key] ?? { status: "" };
      return { ...prev, items: { ...prev.items, [key]: { ...cur, ...patch } } };
    });
  }, []);

  const updateTest = useCallback((key: string, patch: Partial<TestResult>) => {
    setDirty(true);
    setRecord((prev) => {
      if (!prev) return prev;
      const cur: TestResult = prev.testResults?.[key] ?? {};
      return {
        ...prev,
        testResults: {
          ...(prev.testResults || {}),
          [key]: { ...cur, ...patch },
        },
      };
    });
  }, []);

  const updateSignature = useCallback((role: string, patch: Partial<SignatureData>) => {
    setDirty(true);
    setRecord((prev) => {
      if (!prev) return prev;
      const cur: SignatureData = prev.signatures?.[role] ?? { name: "", date: "" };
      return {
        ...prev,
        signatures: {
          ...(prev.signatures || {}),
          [role]: { ...cur, ...patch },
        },
      };
    });
  }, []);

  const updateProject = useCallback((k: string, v: string) => {
    setDirty(true);
    setRecord((prev) => (prev ? { ...prev, project: { ...prev.project, [k]: v } } : prev));
  }, []);

  const updateApproval = useCallback((status: string, comment?: string) => {
    setDirty(true);
    setRecord((prev) => (prev ? {
      ...prev,
      approvalStatus: status,
      ...(comment !== undefined ? { approvalComment: comment } : {}),
    } : prev));
  }, []);

  const handleCheckIn = useCallback((data: CheckInData) => {
    setDirty(true);
    setRecord((prev) => (prev ? { ...prev, checkIn: data } : prev));
  }, []);

  const handleClearCheckIn = useCallback(() => {
    setDirty(true);
    setRecord((prev) => (prev ? { ...prev, checkIn: null } : prev));
  }, []);

  const tally = useMemo(() => {
    let pass = 0, fail = 0, filled = 0;
    if (record) {
      for (const k of Object.keys(record.items)) {
        const st = record.items[k]?.status;
        if (st) { filled++; if (st === "pass") pass++; else if (st === "fail") fail++; }
      }
    }
    return { pass, fail, filled };
  }, [record]);

  // รายการที่ไม่ผ่าน (NCR items)
  const failItems = useMemo(() => {
    if (!record) return [];
    const list: { key: string; item: ChecklistItem; secName: string; blockTitle: string; result: ItemResult }[] = [];
    checklist.sections.forEach((sec) => {
      sec.blocks.forEach((b, bi) => {
        b.items.forEach((item, ii) => {
          const k = itemKey(sec.id, bi, ii);
          const r = record.items[k];
          if (r?.status === "fail") {
            list.push({ key: k, item, secName: sec.name, blockTitle: b.title, result: r });
          }
        });
      });
    });
    return list;
  }, [record]);

  const perSection = useMemo(() => {
    const out: Record<string, { total: number; pass: number; fail: number; filled: number }> = {};
    if (!record) return out;
    for (const sec of checklist.sections) {
      const s = { total: 0, pass: 0, fail: 0, filled: 0 };
      sec.blocks.forEach((b, bi) => {
        b.items.forEach((_, ii) => {
          s.total++;
          const st = record.items[itemKey(sec.id, bi, ii)]?.status;
          if (st) { s.filled++; if (st === "pass") s.pass++; else if (st === "fail") s.fail++; }
        });
      });
      out[sec.id] = s;
    }
    return out;
  }, [record]);

  const projectFilled = useMemo(
    () => (record ? checklist.projectFields.filter(([k]) => (record.project[k] || "").trim()).length : 0),
    [record]
  );

  const watermarkMeta = useMemo(() => {
    return {
      storeName: record?.project.store,
      storeCode: record?.project.storeCode,
      pmName: record?.project.pm || record?.checkIn?.inspectorName,
      coords:
        record?.checkIn?.lat && record?.checkIn?.lng
          ? {
              lat: record.checkIn.lat,
              lng: record.checkIn.lng,
              accuracy: record.checkIn.accuracy,
            }
          : null,
    };
  }, [record]);

  const matches = useCallback(
    (key: string) => {
      if (filter === "all") return true;
      const st = record?.items[key]?.status;
      return filter === "todo" ? !st : st === "fail";
    },
    [filter, record]
  );

  async function save() {
    if (!record) return;
    setSaving(true);
    setStatusMsg("กำลังบันทึก…");
    const savedAt = new Date().toISOString();
    const body: InspectionRecord = { ...record, savedAt };
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setRecord(body);
      setDirty(false);
      setStatusMsg(`บันทึกแล้ว ${fmtShort(savedAt)}`);
    } catch {
      setStatusMsg("บันทึกไม่สำเร็จ — ตรวจว่าเซิร์ฟเวอร์ยังทำงานอยู่");
    }
    setSaving(false);
  }

  // ทำเครื่องหมาย "ผ่านทั้งหมด" ให้หมวดนี้เพื่อความรวดเร็ว
  function passAllInSection(sec: typeof checklist.sections[0]) {
    if (!confirm(`ทำเครื่องหมาย "ผ่านเกณฑ์" ให้ทุกรายการที่ยังไม่ตรวจใน "${sec.name}"?`)) return;
    setDirty(true);
    setRecord((prev) => {
      if (!prev) return prev;
      const nextItems = { ...prev.items };
      sec.blocks.forEach((b, bi) => {
        b.items.forEach((_, ii) => {
          const k = itemKey(sec.id, bi, ii);
          if (!nextItems[k]?.status) {
            nextItems[k] = { ...(nextItems[k] || { note: "", photos: [] }), status: "pass" };
          }
        });
      });
      return { ...prev, items: nextItems };
    });
  }

  if (notFound) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div className="card max-w-md p-8 text-center shadow-lift">
          <div className="w-14 h-14 rounded-2xl bg-sunken grid place-items-center mx-auto mb-3 text-ink3">
            <Search className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold mb-1">ไม่พบใบตรวจนี้</h2>
          <p className="text-ink2 text-sm mb-6">อาจถูกลบไปแล้ว หรือรหัสลิงก์ไม่ถูกต้อง</p>
          <Link
            href="/"
            className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้ารายการ</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full border-3 border-line border-t-brand animate-spin" />
          <div className="text-ink2 text-sm font-semibold">กำลังโหลดใบตรวจ…</div>
        </div>
      </div>
    );
  }

  const pctDone = Math.round((tally.filled / TOTAL) * 100);
  const allOpen = checklist.sections.every((s) => open[s.id]);

  return (
    <div className="min-h-screen pb-36">
      {/* ─────────── Sticky Header พรีเมียม ─────────── */}
      <header
        className="sticky z-30 bg-gradient-to-r from-brand via-[#184a77] to-[#12385c] text-white shadow-lift no-print"
        style={{ top: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-3 pb-2.5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="กลับหน้ารายการ"
              className="w-10 h-10 shrink-0 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg sm:text-xl leading-tight truncate">
                  {record.project.store || "ใบตรวจรับงานโครงสร้าง"}
                </h1>
                {record.approvalStatus && (
                  <span className="chip bg-white/20 text-white text-[11px] font-bold border border-white/20">
                    {record.approvalStatus}
                  </span>
                )}
              </div>
              <div className="text-[12px] text-white/75 truncate mt-0.5">
                {checklist.form.formNo} · Rev.{checklist.form.rev}
                {record.project.storeCode && ` · รหัส ${record.project.storeCode}`}
                {record.project.contractor && ` · ${record.project.contractor}`}
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
                <span>พิมพ์ / PDF</span>
              </button>

              <div className="text-right pl-2 border-l border-white/15">
                <div className="tnum font-display font-bold text-xl sm:text-2xl leading-none text-emerald-300">
                  {pctDone}%
                </div>
                <div className="tnum text-[11px] text-white/70">
                  {tally.filled}/{TOTAL}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2.5">
            <ProgressBar {...tally} total={TOTAL} thin />
          </div>

          {/* Tab Navigation สไตล์โมเดิร์น */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/15 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("checklist")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "checklist"
                  ? "bg-white text-brand shadow-sm"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>รายการตรวจ ITP</span>
              <span className="tnum px-1.5 py-0.2 rounded-full bg-brand/10 text-[10.5px]">
                {tally.filled}/{TOTAL}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("tests")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "tests"
                  ? "bg-white text-brand shadow-sm"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>ผลทดสอบทางวิศวกรรม</span>
              <span className="chip bg-white/20 text-white text-[10px] py-0.5 px-1.5">
                {checklist.tests.items.length} รายการ
              </span>
            </button>

            <button
              onClick={() => setActiveTab("signatures")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "signatures"
                  ? "bg-white text-brand shadow-sm"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>ลงนาม & การอนุมัติ</span>
              {record.approvalStatus && record.approvalStatus !== "รอตรวจ" && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>

            {failItems.length > 0 && (
              <button
                onClick={() => setShowNcrModal(true)}
                className="ml-auto shrink-0 px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>รายงาน NCR</span>
                <span className="tnum bg-white text-rose-600 rounded-full px-1.5 text-[11px]">
                  {failItems.length}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5">
        {/* ─────────── ระบบสแกน QR Code & เช็คอินพิกัดหน้างานจริง ─────────── */}
        <div className="mb-4">
          <QRCheckIn
            storeName={record.project.store}
            storeCode={record.project.storeCode}
            pmName={record.project.pm}
            checkIn={record.checkIn}
            onCheckIn={handleCheckIn}
            onClearCheckIn={handleClearCheckIn}
          />
        </div>

        {/* ─────────── ส่วนข้อมูลโครงการ (Collapsible Card) ─────────── */}
        <section className="card overflow-hidden mb-4">
          <button
            type="button"
            onClick={() => setOpenProject((v) => !v)}
            aria-expanded={openProject}
            className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-sunken transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand grid place-items-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base text-ink">ข้อมูลโครงการ & หน้างาน</span>
                <span className="chip bg-brand/10 text-brand text-[11px] font-bold">
                  {projectFilled}/{checklist.projectFields.length} ช่อง
                </span>
              </div>
              <span className="tnum block text-xs text-ink2 mt-0.5">
                {record.project.store || "ระบุชื่อสาขา"}, {record.project.storeCode || "รหัสสาขา"}, {record.project.contractor || "ผู้รับเหมา"}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-ink3 transition-transform duration-200 ${openProject ? "rotate-180" : ""}`}
            />
          </button>

          {openProject && (
            <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-line/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-card">
              {checklist.projectFields.map(([key, label]) => (
                <label key={key} className="block">
                  <span className="block text-xs font-bold text-ink2 mb-1.5">{label}</span>
                  <input
                    id={`project-${key}`}
                    value={record.project[key] || ""}
                    onChange={(e) => updateProject(key, e.target.value)}
                    placeholder={`กรอก ${label.split(" (")[0]}`}
                    className="field"
                  />
                </label>
              ))}
            </div>
          )}
        </section>

        {/* ─────────── TAB 1: รายการตรวจ ITP ─────────── */}
        {activeTab === "checklist" && (
          <div>
            {/* ตัวกรอง & เครื่องมือ */}
            <div className="flex items-center gap-2 mb-4 flex-wrap no-print">
              <div className="flex gap-1 p-1 bg-card border border-line rounded-xl shadow-sm">
                {FILTERS.map((f) => {
                  const on = filter === f.id;
                  const count = f.id === "todo" ? TOTAL - tally.filled : f.id === "fail" ? tally.fail : TOTAL;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      aria-pressed={on}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        on
                          ? "bg-brand text-white shadow-sm"
                          : "text-ink2 hover:text-ink hover:bg-sunken"
                      }`}
                    >
                      {f.label}
                      <span className={`tnum ml-1.5 text-[11px] ${on ? "text-white/80" : "text-ink3"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  const next: Record<string, boolean> = {};
                  checklist.sections.forEach((s) => (next[s.id] = !allOpen));
                  setOpen(next);
                }}
                className="ml-auto text-xs font-bold text-brand bg-card border border-line hover:bg-sunken px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                {allOpen ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>ย่อทุกหมวด</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>ขยายทุกหมวด</span>
                  </>
                )}
              </button>
            </div>

            {/* วนลูปหมวดงานทั้ง 10 หมวด */}
            {checklist.sections.map((sec) => {
              const st = perSection[sec.id] || { total: 0, pass: 0, fail: 0, filled: 0 };
              const isOpen = open[sec.id] || filter !== "all";
              const done = st.filled === st.total && st.total > 0;

              const visibleCount = sec.blocks.reduce(
                (n, b, bi) => n + b.items.filter((_, ii) => matches(itemKey(sec.id, bi, ii))).length,
                0
              );
              if (filter !== "all" && visibleCount === 0) return null;

              return (
                <section key={sec.id} className="card overflow-hidden mb-3.5 border-line/80">
                  <div className="flex items-center justify-between p-3.5 sm:px-5 bg-card hover:bg-sunken/40 transition-colors">
                    <button
                      type="button"
                      onClick={() => setOpen((o) => ({ ...o, [sec.id]: !o[sec.id] }))}
                      aria-expanded={isOpen}
                      disabled={filter !== "all"}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                      <span
                        aria-hidden
                        className={`tnum shrink-0 w-10 h-10 grid place-items-center rounded-xl font-display font-bold text-base shadow-sm ${
                          st.fail > 0
                            ? "bg-rose-500 text-white"
                            : done
                            ? "bg-emerald-500 text-white"
                            : "bg-sunken border border-line text-ink2"
                        }`}
                      >
                        {done && st.fail === 0 ? <Check className="w-5 h-5 stroke-[2.5]" /> : sec.code}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display font-bold text-base text-ink leading-tight truncate">
                            {sec.name}
                          </span>
                          {sec.optional && (
                            <span className="chip bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                              เฉพาะกรณีมี
                            </span>
                          )}
                          {st.fail > 0 && (
                            <span className="chip bg-rose-500/10 text-rose-600 font-bold">
                              ไม่ผ่าน {st.fail}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 mt-1.5">
                          <div className="w-24 sm:w-36 h-2 rounded-full bg-line overflow-hidden flex">
                            <div className="bg-pass" style={{ width: `${(st.pass / st.total) * 100}%` }} />
                            <div className="bg-fail" style={{ width: `${(st.fail / st.total) * 100}%` }} />
                            <div
                              className="bg-na"
                              style={{
                                width: `${(Math.max(0, st.filled - st.pass - st.fail) / st.total) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="tnum text-xs font-semibold text-ink3">
                            {st.filled}/{st.total}
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 pl-2">
                      {/* ปุ่ม Pass All ช่วยให้บันทึกเร็ว */}
                      {!done && (
                        <button
                          type="button"
                          onClick={() => passAllInSection(sec)}
                          title="ผ่านรายการที่เหลือทั้งหมดในส่วนนี้"
                          className="hidden sm:inline-flex items-center gap-1 text-[11.5px] font-bold text-pass hover:bg-pass/10 px-2.5 py-1.5 rounded-lg border border-pass/30 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>ผ่านที่เหลือ</span>
                        </button>
                      )}

                      {filter === "all" && (
                        <button
                          type="button"
                          onClick={() => setOpen((o) => ({ ...o, [sec.id]: !o[sec.id] }))}
                          aria-label={isOpen ? "ยุบหมวด" : "ขยายหมวด"}
                          className="w-8 h-8 rounded-lg grid place-items-center text-ink3 hover:text-ink hover:bg-sunken text-xs transition-all"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-line/80">
                      {sec.desc && (
                        <div className="px-4 py-2 bg-sunken/40 text-xs text-ink3 border-b border-line/60 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{sec.desc}</span>
                        </div>
                      )}

                      {sec.blocks.map((block, bi) => {
                        const items = block.items
                          .map((item, ii) => ({ item, ii, key: itemKey(sec.id, bi, ii) }))
                          .filter(({ key }) => matches(key));
                        if (!items.length) return null;

                        return (
                          <div key={bi} className="border-b border-line/70 last:border-b-0">
                            <div className="px-4 sm:px-5 py-2.5 bg-sunken/90 border-b border-line/60 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                {block.hold && (
                                  <span className="chip bg-brand/10 text-brand ring-1 ring-inset ring-brand/30 font-bold">
                                    <PauseCircle className="w-3 h-3" />
                                    <span>Hold Point</span>
                                  </span>
                                )}
                                <span className="text-xs sm:text-sm font-bold text-ink">
                                  {block.title}
                                </span>
                              </div>
                              {block.photo && (
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-1">
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>{block.photo}</span>
                                </span>
                              )}
                            </div>

                            {items.map(({ item, key }) => (
                              <ItemRow
                                key={key}
                                item={item as ChecklistItem}
                                itemKey={key}
                                result={record.items[key]}
                                onChange={update}
                                watermarkMeta={watermarkMeta}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {/* ─────────── TAB 2: บันทึกผลทดสอบ (Test Records) ─────────── */}
        {activeTab === "tests" && (
          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand grid place-items-center shrink-0">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-ink">
                    {checklist.tests.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-ink2 mt-0.5">
                    {checklist.tests.desc || "บันทึกผลการทดสอบเชิงตัวเลขทางวิศวกรรม"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {checklist.tests.items.map((testItem, idx) => {
                const tKey = `test_${idx}`;
                const tRes = record.testResults?.[tKey] || {};
                const photos = tRes.photos || [];

                return (
                  <div key={tKey} className="card p-4 sm:p-5">
                    <div className="flex items-start gap-3 justify-between">
                      <div className="flex items-start gap-2.5 flex-1">
                        <span className="tnum shrink-0 mt-0.5 text-xs font-bold text-ink2 bg-sunken border border-line rounded px-2 py-0.5">
                          #{testItem.no}
                        </span>
                        <div>
                          <h3 className="font-bold text-base text-ink">{testItem.name}</h3>
                          <div className="flex gap-2 flex-wrap items-center mt-1.5 text-xs">
                            {testItem.crit && (
                              <span className="bg-sunken px-2 py-0.5 rounded border border-line text-ink2">
                                <strong>เกณฑ์:</strong> {testItem.crit}
                              </span>
                            )}
                            {testItem.design && (
                              <span className="bg-sunken px-2 py-0.5 rounded border border-line text-ink2">
                                <strong>ค่าออกแบบ:</strong> {testItem.design}
                              </span>
                            )}
                            {testItem.tool && (
                              <span className="text-ink3">วิธี: {testItem.tool}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Toggle ผลผ่าน/ไม่ผ่านของ Test */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateTest(tKey, { passed: tRes.passed === true ? null : true })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            tRes.passed === true
                              ? "bg-pass text-white shadow-sm"
                              : "bg-sunken text-ink2 border border-line hover:border-pass"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>ผ่าน</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateTest(tKey, { passed: tRes.passed === false ? null : false })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            tRes.passed === false
                              ? "bg-fail text-white shadow-sm"
                              : "bg-sunken text-ink2 border border-line hover:border-fail"
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>ไม่ผ่าน</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-line/60">
                      <div>
                        <label className="block text-xs font-semibold text-ink2 mb-1">
                          ค่าที่วัดได้จริง {testItem.unit ? `(${testItem.unit})` : ""}
                        </label>
                        <input
                          value={tRes.actual || ""}
                          onChange={(e) => updateTest(tKey, { actual: e.target.value })}
                          placeholder={`เช่น ${testItem.design || "ใส่ผลการทดสอบ"}`}
                          className="field"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink2 mb-1">
                          หมายเหตุ / เลขที่ใบรับรอง Lab
                        </label>
                        <input
                          value={tRes.note || ""}
                          onChange={(e) => updateTest(tKey, { note: e.target.value })}
                          placeholder="เช่น ใบผลทดสอบจาก CPAC ลว. 15/09/25"
                          className="field"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <PhotoUploader
                        photos={photos}
                        onChange={(p) => updateTest(tKey, { photos: p })}
                        watermarkMeta={{
                          ...watermarkMeta,
                          itemName: `ผลทดสอบ: ${testItem.name}`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─────────── TAB 3: ลงนามและผลการอนุมัติ ─────────── */}
        {activeTab === "signatures" && (
          <div className="space-y-4">
            {/* สถานะการอนุมัติภาพรวม */}
            <div className="card p-5">
              <h2 className="font-display font-bold text-lg text-ink mb-3 flex items-center gap-2">
                <Scale className="w-5 h-5 text-brand" />
                <span>ผลการพิจารณาอนุมัติ (Final Approval Status)</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {checklist.approveOpts.map((opt) => {
                  const sel = record.approvalStatus === opt;
                  let color = "border-line text-ink2 hover:border-brand";
                  if (sel) {
                    if (opt === "อนุมัติให้ดำเนินการต่อ") color = "bg-pass text-white border-pass shadow-md font-bold";
                    else if (opt === "ไม่อนุมัติ") color = "bg-fail text-white border-fail shadow-md font-bold";
                    else if (opt === "อนุมัติแบบมีเงื่อนไข (แก้ตาม NCR)") color = "bg-amber-500 text-white border-amber-500 shadow-md font-bold";
                    else color = "bg-brand text-white border-brand shadow-md font-bold";
                  }
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateApproval(opt)}
                      className={`p-3 rounded-xl border text-xs text-center transition-all ${color}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <label className="block text-xs font-bold text-ink2 mb-1.5">
                  ความเห็นหรือเงื่อนไขเพิ่มเติมของผู้อนุมัติ
                </label>
                <textarea
                  rows={3}
                  value={record.approvalComment || ""}
                  onChange={(e) => updateApproval(record.approvalStatus || "รอตรวจ", e.target.value)}
                  placeholder="เช่น ให้ส่งผลทดสอบคอนกรีต 28 วันเพิ่มเติมก่อนเทงวดถัดไป..."
                  className="field"
                />
              </div>
            </div>

            {/* การลงนาม 3 ฝ่าย */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {checklist.signRoles.map(([roleKey, roleLabel]) => {
                const sig = record.signatures?.[roleKey] || { name: "", date: "" };

                return (
                  <div key={roleKey} className="card p-4 flex flex-col justify-between">
                    <div>
                      <span className="chip bg-sunken text-ink2 text-[11px] font-bold mb-2">
                        {roleKey === "prep" ? "1. จัดทำ" : roleKey === "check" ? "2. ผู้ตรวจสอบ" : "3. ผู้อนุมัติ"}
                      </span>
                      <h3 className="font-bold text-sm text-ink mb-3">{roleLabel}</h3>

                      <label className="block mb-2.5">
                        <span className="block text-[11px] font-semibold text-ink3 mb-1">ชื่อ-นามสกุล ผู้ลงนาม</span>
                        <input
                          value={sig.name || ""}
                          onChange={(e) => updateSignature(roleKey, { name: e.target.value })}
                          placeholder="ชื่อ-นามสกุล"
                          className="field"
                        />
                      </label>

                      <label className="block mb-3">
                        <span className="block text-[11px] font-semibold text-ink3 mb-1">วันที่ลงนาม</span>
                        <input
                          type="date"
                          value={sig.date || ""}
                          onChange={(e) => updateSignature(roleKey, { date: e.target.value })}
                          className="field"
                        />
                      </label>
                    </div>

                    <div className="pt-3 border-t border-line/60">
                      <button
                        type="button"
                        onClick={() => updateSignature(roleKey, {
                          signed: !sig.signed,
                          date: sig.date || new Date().toISOString().slice(0, 10),
                        })}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          sig.signed
                            ? "bg-pass/10 text-pass border border-pass/30"
                            : "bg-sunken text-ink2 border border-line hover:border-brand"
                        }`}
                      >
                        {sig.signed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>เซ็นรับรองแล้ว</span>
                          </>
                        ) : (
                          <span>คลิกเพื่อลงนามรับรอง</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ─────────── NCR Dialog Modal ─────────── */}
      {showNcrModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in duration-150"
        >
          <div className="card max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden bg-card">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <div>
                  <h3 className="font-display font-bold text-lg">รายงานข้อบกพร่อง (NCR Report)</h3>
                  <p className="text-xs text-white/80">
                    รายการตรวจที่ไม่ผ่านเกณฑ์มาตรฐานทั้งหมด {failItems.length} รายการ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNcrModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white grid place-items-center text-sm font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
              {failItems.map((fi, idx) => (
                <div key={fi.key} className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                        {fi.secName} · {fi.blockTitle}
                      </span>
                      <h4 className="font-bold text-sm text-ink mt-0.5">
                        #{fi.item.no} {fi.item.name}
                      </h4>
                    </div>
                    <span className="chip bg-rose-600 text-white text-[10px] font-bold">
                      NCR #{idx + 1}
                    </span>
                  </div>

                  <div className="mt-2 text-xs bg-card p-2.5 rounded-lg border border-line space-y-1">
                    <div><strong>เกณฑ์มาตรฐาน:</strong> {fi.item.crit || "-"}</div>
                    <div className="text-rose-600 dark:text-rose-400 font-medium">
                      <strong>สาเหตุที่ไม่ผ่าน:</strong> {fi.result.note || "(ยังไม่ได้ระบุสาเหตุ)"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-sunken border-t border-line flex items-center justify-between">
              <span className="text-xs text-ink3">
                แนะนำให้ส่งรายงานนี้ให้ผู้รับเหมาแก้ไขก่อนตรวจรับซ้ำ
              </span>
              <button
                type="button"
                onClick={() => setShowNcrModal(false)}
                className="px-4 py-2 rounded-xl bg-ink text-paper font-bold text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── แถบลอยบันทึกด้านล่าง (Action Bottom Bar) ─────────── */}
      <div
        className="fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-line/80 shadow-bar no-print"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
              <span className="tnum text-pass flex items-center gap-1">
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{tally.pass} ผ่าน</span>
              </span>
              <span className="tnum text-fail flex items-center gap-1">
                <X className="w-4 h-4 stroke-[2.5]" />
                <span>{tally.fail} ไม่ผ่าน</span>
              </span>
              <span className="tnum text-ink3">เหลือ {TOTAL - tally.filled} ข้อ</span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-ink2 mt-0.5 truncate">
              {dirty && (
                <span aria-hidden className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-ping" />
              )}
              <span className="truncate font-medium">
                {dirty ? "มีการแก้ไขที่ยังไม่ได้บันทึก" : statusMsg}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className={`min-h-[46px] px-6 sm:px-8 rounded-xl font-display font-bold text-sm sm:text-base transition-all active:scale-95 shadow-md flex items-center gap-2 ${
                dirty
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25"
                  : "bg-line text-ink3 opacity-70 cursor-not-allowed"
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "กำลังบันทึก…" : dirty ? "บันทึกข้อมูล" : "บันทึกแล้ว"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
