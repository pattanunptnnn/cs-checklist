"use client";

import { memo, useState } from "react";
import type { ChecklistItem, ItemResult, Status } from "@/lib/types";
import StatusToggle from "./StatusToggle";
import PhotoUploader, { type WatermarkMeta } from "./PhotoUploader";
import { Camera, PauseCircle, ChevronDown, AlertTriangle } from "lucide-react";

const EMPTY: ItemResult = { status: "", note: "", photos: [] };

// แถบสีด้านซ้ายบอกสถานะได้ตั้งแต่เหลือบตามอง ไม่ต้องอ่าน
const STRIPE: Record<string, string> = {
  pass: "bg-pass",
  fail: "bg-fail",
  na: "bg-na",
  "": "bg-transparent",
};

function ItemRow({
  item,
  itemKey,
  result,
  onChange,
  watermarkMeta,
}: {
  item: ChecklistItem;
  itemKey: string;
  result?: ItemResult;
  onChange: (key: string, patch: Partial<ItemResult>) => void;
  watermarkMeta?: WatermarkMeta;
}) {
  const r = result || EMPTY;
  const [showDetail, setShowDetail] = useState(false);

  const photos = r.photos || [];
  const hasDetail = Boolean(item.crit || item.tool);

  // เตือนตามกฎ ITP — เตือนเฉพาะเมื่อผู้ใช้ลงผลแล้วเท่านั้น จะได้ไม่รบกวนตอนยังไม่เริ่ม
  const needPhoto = item.photoReq && r.status !== "" && r.status !== "na" && photos.length === 0;
  const needReason = r.status === "fail" && !(r.note || "").trim();

  return (
    <div className={`relative border-b border-line/70 last:border-b-0 transition-colors ${r.status === "fail" ? "bg-fail/[0.02]" : ""}`}>
      <span
        aria-hidden
        className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-200 ${
          r.status === "pass"
            ? "bg-pass shadow-[0_0_8px_rgba(16,149,93,0.5)]"
            : r.status === "fail"
            ? "bg-fail shadow-[0_0_8px_rgba(225,29,72,0.5)]"
            : r.status === "na"
            ? "bg-na"
            : "bg-transparent"
        }`}
      />

      <div className="pl-4 pr-3.5 py-4 sm:px-5">
        {/* ── ชื่อรายการ ── */}
        <div className="flex gap-3 items-start">
          {item.no !== "" && item.no != null && (
            <span className="tnum shrink-0 mt-0.5 text-[11px] font-bold text-ink2 bg-sunken border border-line rounded-md px-2 py-0.5 shadow-sm">
              #{String(item.no)}
            </span>
          )}
          <span className="text-[15px] leading-relaxed font-semibold text-ink flex-1">{item.name}</span>
        </div>

        {/* ── ป้ายกำกับตาม ITP ── */}
        <div className="flex gap-1.5 flex-wrap items-center mt-2.5">
          {item.cls === "วิกฤต" && (
            <span className="chip bg-fail/10 text-fail ring-1 ring-inset ring-fail/25 font-bold">
              ● วิกฤต (Critical)
            </span>
          )}
          {item.cls === "สำคัญ" && (
            <span className="chip bg-accent/10 text-accent ring-1 ring-inset ring-accent/25 font-medium">
              ● สำคัญ (Major)
            </span>
          )}
          {item.hold && (
            <span className="chip bg-brand/10 text-brand ring-1 ring-inset ring-brand/25 font-bold">
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Hold Point</span>
            </span>
          )}
          {item.photoReq && (
            <span className="chip bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/25">
              <Camera className="w-3.5 h-3.5" />
              <span>บังคับแนบรูป</span>
            </span>
          )}
          {item.cov && (
            <span className="chip bg-sunken text-ink2 ring-1 ring-inset ring-line/80 font-normal">
              สุ่มตรวจ: {item.cov}
            </span>
          )}

          {hasDetail && (
            <button
              type="button"
              onClick={() => setShowDetail((v) => !v)}
              aria-expanded={showDetail}
              className="chip text-brand bg-brand/5 hover:bg-brand/10 transition-colors ml-auto font-medium"
            >
              <span>{showDetail ? "ซ่อนเกณฑ์" : "ดูเกณฑ์ตรวจ"}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showDetail ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>

        {/* ── เกณฑ์ยอมรับ + วิธีตรวจ (ยุบไว้) ── */}
        {showDetail && hasDetail && (
          <div className="mt-3 bg-sunken/80 border border-line rounded-xl p-3 text-[13px] leading-relaxed space-y-2">
            {item.crit && (
              <div className="flex gap-2 items-start">
                <span className="shrink-0 font-bold text-ink2 bg-card border border-line text-[11px] px-1.5 py-0.5 rounded">
                  เกณฑ์ยอมรับ
                </span>
                <span className="text-ink">{item.crit}</span>
              </div>
            )}
            {item.tool && (
              <div className="flex gap-2 items-start">
                <span className="shrink-0 font-bold text-ink2 bg-card border border-line text-[11px] px-1.5 py-0.5 rounded">
                  เครื่องมือ / วิธี
                </span>
                <span className="text-ink">{item.tool}</span>
              </div>
            )}
          </div>
        )}

        {/* ── ค่าที่วัดได้ ── */}
        {item.measure && (
          <div className="mt-3 bg-card/50 p-2.5 rounded-xl border border-line/60">
            <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
              ค่าที่วัดได้จริง
              {item.design && <span className="font-normal text-ink3 ml-1">· ค่าออกแบบตามสเปก: <strong className="text-ink2">{item.design}</strong></span>}
            </label>
            <div className="relative">
              <input
                id={`actual-${itemKey}`}
                value={r.actual || ""}
                onChange={(e) => onChange(itemKey, { actual: e.target.value })}
                placeholder="กรอกค่าตัวเลข เช่น 182 / 185 / 179"
                inputMode="decimal"
                className={"field tnum font-medium" + (item.unit ? " pr-14" : "")}
              />
              {item.unit && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12.5px] font-bold text-ink3 pointer-events-none bg-sunken px-1.5 py-0.5 rounded">
                  {item.unit}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── ผลการตรวจ ── */}
        <StatusToggle value={r.status} onChange={(s: Status) => onChange(itemKey, { status: s })} />

        {/* ── หมายเหตุ ── */}
        <div className="mt-2.5">
          <textarea
            id={`note-${itemKey}`}
            value={r.note || ""}
            onChange={(e) => onChange(itemKey, { note: e.target.value })}
            placeholder={needReason ? "ต้องระบุสาเหตุที่ไม่ผ่านในช่องนี้…" : "บันทึกหมายเหตุเพิ่มเติม / จุดที่ตรวจ (ถ้ามี)…"}
            rows={r.status === "fail" || r.note ? 2 : 1}
            className={`field resize-y text-[13.5px] leading-snug transition-all ${
              needReason
                ? "border-fail ring-2 ring-fail/20 bg-fail/5 placeholder:text-fail/70 font-medium"
                : ""
            }`}
          />
        </div>

        {/* ── รูปภาพประกอบพร้อมลายน้ำ ── */}
        <PhotoUploader
          photos={photos}
          onChange={(p) => onChange(itemKey, { photos: p })}
          watermarkMeta={{
            ...watermarkMeta,
            itemName: item.name,
          }}
        />

        {/* ── เตือนเมื่อข้อมูลยังไม่ครบตามที่ ITP บังคับ ── */}
        {(needPhoto || needReason) && (
          <div className="flex items-center gap-2 mt-2.5 text-[12px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {needReason && "ต้องระบุสาเหตุที่ไม่ผ่านในหมายเหตุ"}
              {needReason && needPhoto && " และ "}
              {needPhoto && "รายการนี้กำหนดให้ต้องแนบรูปถ่ายยืนยัน"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ItemRow);
