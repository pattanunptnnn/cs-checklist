// ============================================================
//  checklist.ts — โหลดข้อมูล ITP (173 รายการของจริง) + ฟังก์ชันช่วย
//  ข้อมูลดิบอยู่ใน src/data/checklist.json
// ============================================================
import raw from "@/data/checklist.json";
import type { ChecklistData } from "./types";

export const checklist = raw as unknown as ChecklistData;

// สร้างคีย์ประจำรายการ (ใช้อ้างอิงผลตรวจใน record.items)
export function itemKey(sectionId: string, blockIndex: number, itemIndex: number): string {
  return `${sectionId}|${blockIndex}|${itemIndex}`;
}

// จำนวนรายการตรวจทั้งหมด (นับทุก section/block/item)
export function totalItems(): number {
  return checklist.sections.reduce(
    (sum, s) => sum + s.blocks.reduce((a, b) => a + b.items.length, 0),
    0
  );
}
