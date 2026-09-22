"use client";

import type { Status } from "@/lib/types";
import { Check, X, Minus } from "lucide-react";

const OPTS: {
  val: Exclude<Status, "">;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: string;
  inactive: string;
}[] = [
  {
    val: "pass",
    label: "ผ่านเกณฑ์",
    icon: Check,
    active: "bg-pass text-white border-pass shadow-md shadow-pass/20 ring-2 ring-pass/30 font-bold",
    inactive: "bg-card text-ink2 border-line hover:border-pass/50 hover:text-pass hover:bg-pass/5",
  },
  {
    val: "fail",
    label: "ไม่ผ่าน",
    icon: X,
    active: "bg-fail text-white border-fail shadow-md shadow-fail/20 ring-2 ring-fail/30 font-bold",
    inactive: "bg-card text-ink2 border-line hover:border-fail/50 hover:text-fail hover:bg-fail/5",
  },
  {
    val: "na",
    label: "N/A (ไม่ใช้)",
    icon: Minus,
    active: "bg-na text-white border-na shadow-md shadow-na/20 ring-2 ring-na/30 font-bold",
    inactive: "bg-card text-ink2 border-line hover:border-na/50 hover:text-na hover:bg-na/5",
  },
];

export default function StatusToggle({
  value,
  onChange,
}: {
  value: Status;
  onChange: (s: Status) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="ผลการตรวจ"
      className="grid grid-cols-3 gap-2.5 mt-3"
    >
      {OPTS.map((o) => {
        const on = value === o.val;
        const Icon = o.icon;
        return (
          <button
            key={o.val}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? "" : o.val)}
            className={`flex items-center justify-center gap-1.5 min-h-[46px] rounded-xl border text-[13.5px] transition-all duration-150 active:scale-[0.96] ${
              on ? o.active : o.inactive
            }`}
          >
            <Icon
              className={`w-4 h-4 stroke-[2.5] ${
                on ? "scale-110" : "text-ink3"
              }`}
            />
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
