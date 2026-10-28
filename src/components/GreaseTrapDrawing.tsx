"use client";

import { useState } from "react";
import {
  FileText,
  Maximize2,
  Minimize2,
  Info,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  Sparkles,
} from "lucide-react";

export default function GreaseTrapDrawing() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/5 via-card to-card p-4 sm:p-5 shadow-sm">
      {/* Header ของแบบฟอร์ม */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-sm sm:text-base font-bold text-ink">
                แบบตรวจสอบอ้างอิง: ถังบำบัด & ดักไขมันใต้ดิน
              </span>
              <span className="chip bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 font-bold text-[10.5px]">
                DETAIL "A"
              </span>
            </div>
            <p className="text-[12px] text-ink3">
              Grease Trap Tank Inspection Sheet (Underground Tank) · อ้างอิงสเปก Big-C Mini
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="inline-flex items-center justify-center gap-1.5 self-start sm:self-auto rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300 transition-colors"
        >
          {isExpanded ? (
            <>
              <Minimize2 className="h-3.5 w-3.5" />
              <span>ย่อแบบขยาย</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" />
              <span>ขยายดูแบบอ้างอิง</span>
            </>
          )}
        </button>
      </div>

      {/* จุดตรวจสอบ 7 ข้อสรุปด่วน */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 text-[11px]">
        <div className="rounded-lg border border-line bg-sunken/60 p-2">
          <span className="font-bold text-cyan-600 dark:text-cyan-400">#1 ท่อน้ำเสียเข้า</span>
          <p className="font-semibold text-ink mt-0.5">Dia 4" (สโลป 1:100)</p>
        </div>
        <div className="rounded-lg border border-line bg-sunken/60 p-2">
          <span className="font-bold text-cyan-600 dark:text-cyan-400">#2 ท่อน้ำเสียออก</span>
          <p className="font-semibold text-ink mt-0.5">Dia 4" (ไปบ่อระบาย)</p>
        </div>
        <div className="rounded-lg border border-line bg-sunken/60 p-2">
          <span className="font-bold text-cyan-600 dark:text-cyan-400">#3 ท่ออากาศ</span>
          <p className="font-semibold text-ink mt-0.5">Dia 2" (Vent)</p>
        </div>
        <div className="rounded-lg border border-line bg-sunken/60 p-2">
          <span className="font-bold text-cyan-600 dark:text-cyan-400">#4 Floor Clean-Out</span>
          <p className="font-semibold text-ink mt-0.5">Dia 4" (ปลายท่อเข้า)</p>
        </div>
        <div className="rounded-lg border border-line bg-sunken/60 p-2">
          <span className="font-bold text-cyan-600 dark:text-cyan-400">#5 เข็มรับน้ำหนัก</span>
          <p className="font-semibold text-ink mt-0.5">6x Dia 0.15 @3M</p>
        </div>
        <div className="rounded-lg border border-line bg-sunken/60 p-2">
          <span className="font-bold text-cyan-600 dark:text-cyan-400">#6 Flexible น้ำเสีย</span>
          <p className="font-semibold text-ink mt-0.5">Dia 4" (ก่อนเข้า/ออก)</p>
        </div>
        <div className="rounded-lg border border-line bg-sunken/60 p-2">
          <span className="font-bold text-cyan-600 dark:text-cyan-400">#7 Flexible อากาศ</span>
          <p className="font-semibold text-ink mt-0.5">Dia 2" (ท่ออากาศ)</p>
        </div>
      </div>

      {/* ไดอะแกรมแบบตรวจสอบอ้างอิง (SVG Technical Diagram) */}
      <div className={`mt-3.5 overflow-hidden rounded-xl border border-line bg-slate-900 text-white transition-all ${isExpanded ? "h-[540px] sm:h-[620px]" : "h-[320px] sm:h-[380px]"}`}>
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-3.5 py-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono font-medium">ENGINEERING DRAWING: UNDERGROUND TANK & PIPING LAYOUT</span>
          </div>
          <span className="text-[11px] text-slate-400">ระดับอ้างอิง: BOP -450 / SL -400</span>
        </div>

        <div className="relative h-[calc(100%-37px)] w-full overflow-auto p-2 sm:p-4">
          <svg
            viewBox="0 0 920 480"
            className="w-full h-full min-w-[720px] select-none"
            style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))" }}
          >
            {/* Grid background */}
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="920" height="480" fill="url(#grid)" />

            {/* Dimension Lines (Top) */}
            <g stroke="#94a3b8" strokeWidth="1.2">
              {/* Dim 1400 */}
              <line x1="80" y1="35" x2="260" y2="35" />
              <line x1="80" y1="28" x2="80" y2="42" />
              <line x1="260" y1="28" x2="260" y2="42" />
              <text x="170" y="30" fill="#cbd5e1" fontSize="12" textAnchor="middle" fontFamily="monospace">1400</text>

              {/* Dim 2500 */}
              <line x1="260" y1="35" x2="570" y2="35" />
              <line x1="260" y1="28" x2="260" y2="42" />
              <line x1="570" y1="28" x2="570" y2="42" />
              <text x="415" y="30" fill="#cbd5e1" fontSize="12" textAnchor="middle" fontFamily="monospace">2500</text>

              {/* Dim 1800 */}
              <line x1="570" y1="35" x2="790" y2="35" />
              <line x1="570" y1="28" x2="570" y2="42" />
              <line x1="790" y1="28" x2="790" y2="42" />
              <text x="680" y="30" fill="#cbd5e1" fontSize="12" textAnchor="middle" fontFamily="monospace">1800</text>
            </g>

            {/* Foundation Box: CONCRETE FOUNDATION PUMP AND WATER TANK */}
            <rect
              x="210"
              y="110"
              width="240"
              height="200"
              fill="#1e293b"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              rx="4"
            />
            <text x="330" y="100" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
              CONCRETE FOUNDATION PUMP AND WATER TANK
            </text>

            {/* 6 Foundation Piles (6x Dia 0.15 @3M.) */}
            {[
              { x: 235, y: 135 },
              { x: 330, y: 135 },
              { x: 425, y: 135 },
              { x: 235, y: 285 },
              { x: 330, y: 285 },
              { x: 425, y: 285 },
            ].map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="12" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
                <line x1={p.x - 7} y1={p.y} x2={p.x + 7} y2={p.y} stroke="#f59e0b" strokeWidth="1.5" />
                <line x1={p.x} y1={p.y - 7} x2={p.x} y2={p.y + 7} stroke="#f59e0b" strokeWidth="1.5" />
              </g>
            ))}
            <text x="330" y="325" fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle">
              ★ ข้อ 5: เสาเข็มรับน้ำหนัก 6x Dia 0.15 @3M.
            </text>

            {/* Tank Chamber: DETAIL "A" */}
            <circle cx="330" cy="210" r="62" fill="#0369a1" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="3" />
            <circle cx="330" cy="210" r="32" fill="#0284c7" fillOpacity="0.4" stroke="#7dd3fc" strokeWidth="2" />
            <text x="330" y="206" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">
              DETAIL "A"
            </text>
            <text x="330" y="224" fill="#bae6fd" fontSize="10.5" textAnchor="middle">
              ถังดักไขมันใต้ดิน
            </text>

            {/* Main Waste Pipes */}
            {/* Outflow (Left): To Site Drainage */}
            <path
              d="M 50 210 L 220 210"
              stroke="#ef4444"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Flexible Joint Outlet (ข้อ 6) */}
            <rect x="220" y="198" width="48" height="24" fill="#fbbf24" stroke="#d97706" strokeWidth="2" rx="4" />
            <text x="244" y="214" fill="#000" fontSize="9" fontWeight="bold" textAnchor="middle">FLEXIBLE</text>

            <text x="120" y="185" fill="#fca5a5" fontSize="11" fontWeight="bold">
              ★ ข้อ 2: ท่อน้ำเสียออก Dia 4"
            </text>
            <text x="120" y="235" fill="#cbd5e1" fontSize="10">
              Dia 100 S. U/G TO SITE DRAINAGE
            </text>

            {/* Inflow Pipe (Right) */}
            {/* Flexible Joint Inlet (ข้อ 6) */}
            <rect x="392" y="198" width="48" height="24" fill="#fbbf24" stroke="#d97706" strokeWidth="2" rx="4" />
            <text x="416" y="214" fill="#000" fontSize="9" fontWeight="bold" textAnchor="middle">FLEXIBLE</text>

            <path
              d="M 440 210 L 780 210"
              stroke="#10b981"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
            <text x="510" y="185" fill="#6ee7b7" fontSize="11" fontWeight="bold">
              ★ ข้อ 1: ท่อน้ำเสียเข้า Dia 4"
            </text>
            <text x="510" y="202" fill="#a7f3d0" fontSize="10.5" fontWeight="bold">
              SLOPE 1:100 (BOP -450)
            </text>
            <text x="510" y="230" fill="#94a3b8" fontSize="10">
              Dia 100 S. U/G AT SL-400 BOP
            </text>

            {/* Floor Clean-Out (ข้อ 4) */}
            <g transform="translate(740, 210)">
              <circle cx="0" cy="0" r="16" fill="#8b5cf6" stroke="#c4b5fd" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="7" fill="#ffffff" />
              <text x="0" y="-24" fill="#c4b5fd" fontSize="11" fontWeight="bold" textAnchor="middle">
                ★ ข้อ 4: Floor Clean-Out
              </text>
              <text x="0" y="32" fill="#ddd6fe" fontSize="10" textAnchor="middle">
                Dia 100 C.O. (Dia 4")
              </text>
            </g>

            {/* Vent Pipe & Flexible (ข้อ 3 & 7) */}
            <path
              d="M 330 148 L 330 65"
              stroke="#38bdf8"
              strokeWidth="3.5"
              strokeDasharray="4 2"
              fill="none"
            />
            <rect x="315" y="115" width="30" height="18" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" rx="3" />
            <text x="375" y="80" fill="#7dd3fc" fontSize="10.5" fontWeight="bold">
              ★ ข้อ 3 & 7: ท่ออากาศ Dia 2" + Flexible
            </text>
            <text x="375" y="96" fill="#94a3b8" fontSize="9.5">
              FLEXIBLE Dia 50 V.
            </text>

            {/* Building Interior Layout Context (Bottom) */}
            <g transform="translate(60, 360)">
              <rect x="0" y="0" width="180" height="90" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
              <text x="90" y="40" fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle">STOCK AREA</text>

              <rect x="180" y="0" width="140" height="90" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
              <text x="250" y="35" fill="#64748b" fontSize="11" fontWeight="bold" textAnchor="middle">FREEZER</text>
              <text x="250" y="52" fill="#475569" fontSize="9.5" textAnchor="middle">-18 to -25°C</text>

              <rect x="320" y="0" width="130" height="90" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
              <text x="385" y="35" fill="#64748b" fontSize="11" fontWeight="bold" textAnchor="middle">CHILLER</text>
              <text x="385" y="52" fill="#475569" fontSize="9.5" textAnchor="middle">2 to 6°C</text>

              <rect x="450" y="0" width="370" height="90" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
              <text x="635" y="45" fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle">พื้นที่ขาย / ทางเดินบริการ (SERVICE CORRIDOR)</text>
            </g>
          </svg>
        </div>
      </div>

      {/* คำแนะนำในการตรวจหน้างาน */}
      <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-[12.5px] text-amber-800 dark:text-amber-300">
        <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold">คำแนะนำวิศวกรผู้ควบคุมงาน (Hold Point ก่อนเทคอนกรีต/กลบดิน):</strong>
          <span className="ml-1 text-ink2">
            ต้องตรวจสอบขนาดท่อ, สโลปการไหล 1:100, ข้อต่อ Flexible กันทรุด, และการลงเสาเข็ม 6 ต้นให้ครบถ้วน พร้อมทั้งถ่ายภาพลายน้ำระบุพิกัดก่อนดำเนินการขั้นตอนต่อไป
          </span>
        </div>
      </div>
    </div>
  );
}
