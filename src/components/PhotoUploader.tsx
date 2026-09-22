"use client";

import { useRef, useState } from "react";
import { Camera, X, AlertTriangle, Download, ShieldCheck, Sparkles } from "lucide-react";

export interface WatermarkMeta {
  storeName?: string;
  storeCode?: string;
  pmName?: string;
  itemName?: string;
  coords?: { lat: number; lng: number; accuracy?: number } | null;
}

// ย่อขนาดรูปและฝังลายน้ำหลักฐานหน้างานลงบนเนื้อภาพอัตโนมัติ
async function shrinkAndWatermark(file: File, meta?: WatermarkMeta): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    return file;
  }
  const MAX = 1600;
  let w = bmp.width, h = bmp.height;
  if (Math.max(w, h) > MAX) {
    const s = MAX / Math.max(w, h);
    w = Math.round(w * s);
    h = Math.round(h * s);
  }
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  if (!ctx) {
    bmp.close?.();
    return file;
  }

  // 1. วาดภาพถ่ายต้นฉบับ
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();

  // 2. ออกแบบลายน้ำสไตล์ Minimal (Corner Floating Glass Pill)
  const scale = Math.max(0.75, Math.min(1.5, w / 1200));
  const padX = Math.round(14 * scale);
  const padY = Math.round(10 * scale);
  const fontSizeHeader = Math.round(13 * scale);
  const fontSizeSub = Math.round(11 * scale);
  const lineGap = Math.round(16 * scale);

  const now = new Date();
  const dateStr = now.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  const timeStr = now.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const storeText = meta?.storeName
    ? `${meta.storeName}${meta.storeCode ? ` (${meta.storeCode})` : ""}`
    : "Big-C Mini";
  const pmText = meta?.pmName ? `PM: ${meta.pmName}` : "Big-C PM";
  const gpsText =
    meta?.coords?.lat && meta?.coords?.lng
      ? `📍 ${meta.coords.lat.toFixed(4)}, ${meta.coords.lng.toFixed(4)}`
      : "";

  const line1 = `BIG-C · ${storeText}`;
  const line2 = `${pmText} · ${dateStr} ${timeStr}`;
  const line3 = gpsText;

  // วัดขนาดความกว้างของข้อความเพื่อทำกล่องพอดีคำ
  ctx.font = `600 ${fontSizeHeader}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const w1 = ctx.measureText(line1).width;
  ctx.font = `400 ${fontSizeSub}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const w2 = ctx.measureText(line2).width;
  const w3 = line3 ? ctx.measureText(line3).width : 0;
  const maxTextWidth = Math.max(w1, w2, w3);

  const boxWidth = maxTextWidth + padX * 2 + Math.round(12 * scale);
  const linesCount = line3 ? 3 : 2;
  const boxHeight = padY * 2 + (linesCount - 1) * lineGap + fontSizeHeader;
  const radius = Math.round(8 * scale);

  const margin = Math.round(16 * scale);
  const boxX = margin;
  const boxY = h - boxHeight - margin;

  // วาดแผ่นป้ายสไตล์ Minimal Frosted Glass Pill
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = Math.max(1, Math.round(1 * scale));

  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
  } else {
    ctx.rect(boxX, boxY, boxWidth, boxHeight);
  }
  ctx.fill();
  ctx.stroke();

  // จุดเขียวแสดงสถานะยืนยัน (Verified Green Dot)
  const dotX = boxX + padX;
  const dotY = boxY + padY + Math.round(fontSizeHeader / 2);
  const dotR = Math.round(3.5 * scale);
  ctx.fillStyle = "#10b981";
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
  ctx.fill();

  // บรรทัด 1: BIG-C · ชื่อสาขา
  ctx.font = `600 ${fontSizeHeader}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(
    line1,
    dotX + dotR * 2 + Math.round(6 * scale),
    boxY + padY + fontSizeHeader - Math.round(2 * scale)
  );

  // บรรทัด 2: ชื่อ PM · วันเวลา
  ctx.font = `400 ${fontSizeSub}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  let currentTextY = boxY + padY + fontSizeHeader + lineGap - Math.round(2 * scale);
  ctx.fillText(line2, dotX, currentTextY);

  // บรรทัด 3: พิกัด GPS (ถ้ามี)
  if (line3) {
    currentTextY += lineGap;
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.fillText(line3, dotX, currentTextY);
  }

  ctx.restore();

  // บันทึกเป็น JPEG Blob
  const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, "image/jpeg", 0.85));
  return blob || file;
}

export default function PhotoUploader({
  photos,
  onChange,
  watermarkMeta,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  watermarkMeta?: WatermarkMeta;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    setError("");
    const added: string[] = [];
    let failed = 0;

    for (const file of Array.from(files)) {
      try {
        // ประทับลายน้ำวัน-เวลา-พิกัด-สาขาลงในเนื้อภาพทันที
        const blob = await shrinkAndWatermark(file, watermarkMeta);
        const fd = new FormData();
        fd.append("photo", blob, (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error();
        const data = await res.json();
        added.push(data.url);
      } catch {
        failed++;
      }
    }
    setBusy(false);
    if (failed) setError(`อัปโหลดไม่สำเร็จ ${failed} รูป — กรุณาลองใหม่อีกครั้ง`);
    if (added.length) onChange([...photos, ...added]);
  }

  function removeAt(idx: number) {
    onChange(photos.filter((_, i) => i !== idx));
  }

  return (
    <div className="mt-3">
      <div className="flex gap-2 flex-wrap items-center">
        {photos.map((url, idx) => (
          <div
            key={url + idx}
            className="group relative w-[76px] h-[76px] rounded-xl overflow-hidden border border-line bg-sunken shadow-sm cursor-pointer"
            onClick={() => setPreview(url)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`รูปประกอบการตรวจ รูปที่ ${idx + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            {/* Badge ลายน้ำจิ๋ว */}
            <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-xs text-[9px] text-emerald-300 px-1 py-0.2 rounded font-medium">
              ✓ Watermarked
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeAt(idx);
              }}
              aria-label={`ลบรูปที่ ${idx + 1}`}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-ink/75 text-white
                         grid place-items-center backdrop-blur-sm hover:bg-fail transition-colors"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-[76px] h-[76px] rounded-xl border-2 border-dashed border-line2/80 bg-sunken/80
                     text-ink2 flex flex-col items-center justify-center gap-1 leading-none
                     hover:border-brand hover:text-brand hover:bg-brand/5 transition-all active:scale-95 disabled:opacity-60 shadow-sm"
          title="แนบรูปถ่ายหน้างาน (ระบบจะประทับลายน้ำวันเวลาและสาขาอัตโนมัติ)"
        >
          {busy ? (
            <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Camera className="w-5 h-5 text-ink2 stroke-[2]" />
              <span className="text-[11px] font-semibold text-ink3">แนบรูป</span>
            </>
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-ink3 mt-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>ระบบประทับลายน้ำยืนยันวัน-เวลา สาขา และพิกัดลงในภาพอัตโนมัติ</span>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-fail mt-2 bg-fail/10 px-2.5 py-1.5 rounded-lg border border-fail/20">
          <AlertTriangle className="w-4 h-4 text-fail shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ดูรูปเต็มจอพร้อมปุ่มดาวน์โหลดรูปพร้อมลายน้ำ */}
      {preview && (
        <div
          role="dialog"
          aria-label="ดูรูปขนาดเต็ม"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in duration-150"
        >
          <div className="relative max-w-3xl w-full flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="รูปประกอบการตรวจ ขนาดเต็ม"
              className="max-w-full max-h-[82vh] rounded-xl shadow-2xl object-contain border border-white/10"
            />

            <div className="mt-3 flex items-center justify-between gap-3 w-full px-2 text-white">
              <span className="text-xs text-white/80 inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ภาพถ่ายมีลายน้ำรับรองความถูกต้อง Big-C ITP</span>
              </span>

              <div className="flex items-center gap-2">
                <a
                  href={preview}
                  download="inspection-photo-watermarked.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลดรูปพร้อมลายน้ำ</span>
                </a>

                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="px-3 py-1.5 rounded-xl bg-white text-ink text-xs font-bold hover:bg-white/90 transition-colors"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPreview(null)}
            aria-label="ปิด"
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white grid place-items-center backdrop-blur transition-all"
            style={{ top: "max(1.25rem, env(safe-area-inset-top))" }}
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      )}
    </div>
  );
}
