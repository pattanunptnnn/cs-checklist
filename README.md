# CS Check List — เวอร์ชัน Next.js + TypeScript + Tailwind CSS

ระบบตรวจรับงานโครงสร้าง (BigC Mini) เขียนใหม่ด้วยสแตกสมัยใหม่
โดยนำ **ข้อมูล ITP ของจริงมาครบ** (10 ส่วนงาน · 165 รายการตรวจ + รายการทดสอบ)

**สแตก:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 3
ผ่าน `npm run build` และทดสอบรัน production แล้ว · `npm audit` = 0 vulnerabilities

---

## วิธีรัน

ต้องมี **Node.js 18+** ก่อน (แนะนำ 20+) จาก https://nodejs.org

```
cd cs-checklist-next
npm install
npm run dev
```

เปิดเบราว์เซอร์ที่ **http://localhost:3000**  (โหมดพัฒนา แก้โค้ดแล้วรีเฟรชเห็นผลทันที)

**รันแบบ production:**
```
npm run build
npm start
```

---

## ใช้งานยังไง

- หน้าแรก = รายการใบตรวจทั้งหมด → กด "+ สร้างใบตรวจใหม่" หรือแตะการ์ดเพื่อเปิดใบเดิม
- ในใบตรวจ: กรอกข้อมูลโครงการ แล้วไล่กดสถานะ (ผ่าน/ไม่ผ่าน/N/A) ใส่หมายเหตุ และแนบรูปได้ทุกรายการ
- แต่ละรายการมีป้ายกำกับตาม ITP: ระดับ (วิกฤต/สำคัญ), ความครอบคลุม (100%/สุ่ม), Hold Point, ต้องมีรูป พร้อมเกณฑ์และวิธีตรวจ
- กด "บันทึก" เพื่อเซฟขึ้นเซิร์ฟเวอร์ · เก็บได้หลายใบ ไม่ทับกัน

---

## โครงสร้างโปรเจกต์

```
cs-checklist-next/
├── src/
│   ├── app/
│   │   ├── layout.tsx              เลย์เอาต์หลัก
│   │   ├── page.tsx                หน้ารายการใบ (เรียก RecordList)
│   │   ├── globals.css             Tailwind + design token (สว่าง/มืด) + ฟอนต์ IBM Plex Sans Thai
│   │   ├── record/[id]/page.tsx    หน้าแก้ไขใบ (เรียก RecordEditor)
│   │   └── api/
│   │       ├── records/route.ts        GET list / POST create
│   │       ├── records/[id]/route.ts   GET / PUT / DELETE ทีละใบ
│   │       ├── upload/route.ts          POST อัปโหลดรูป
│   │       └── uploads/[name]/route.ts  GET เสิร์ฟรูป
│   ├── components/
│   │   ├── RecordList.tsx      รายการใบ (สร้าง/เปิด/ลบ)
│   │   ├── RecordEditor.tsx    ฟอร์มตรวจหลัก (โหลด/แก้/บันทึก)
│   │   ├── ItemRow.tsx         รายการตรวจ 1 ข้อ (memo ไว้ให้พิมพ์ลื่น)
│   │   ├── StatusToggle.tsx    ปุ่มผ่าน/ไม่ผ่าน/N/A
│   │   └── PhotoUploader.tsx   อัปโหลดรูป (ย่อขนาดก่อนส่ง)
│   ├── lib/
│   │   ├── types.ts           TypeScript types ของทั้งระบบ
│   │   ├── checklist.ts        โหลดข้อมูล ITP + ฟังก์ชันช่วย
│   │   └── store.ts            อ่าน/เขียนไฟล์ใบตรวจ (ฝั่งเซิร์ฟเวอร์)
│   └── data/
│       └── checklist.json     ข้อมูล ITP ทั้งหมด (173 รายการ)
├── data/records/              ใบตรวจที่บันทึก (สร้างตอนรัน)
├── uploads/                   รูปที่อัปโหลด (สร้างตอนรัน)
└── package.json / tsconfig.json / tailwind.config.ts / ...
```

---

## ต่างจากเวอร์ชันก่อนหน้า (ที่ดีขึ้น)

- **TypeScript ทั้งระบบ** — มี type ชัดเจน (`InspectionRecord`, `ItemResult`, `ChecklistItem` ฯลฯ) ลดบั๊ก
- **แยกเป็นคอมโพเนนต์** — แก้/ต่อยอดง่ายกว่าไฟล์ HTML ก้อนเดียว
- **รูปเก็บเป็นไฟล์จริง** (ผ่าน `multer`-style upload route) ไม่ใช่ base64 ฝังในข้อมูลแล้ว → ไฟล์ใบเล็ก เซฟไว
- **Tailwind CSS** — จัดสไตล์ด้วย utility class เป็นระบบ

## ยังไม่ได้พอร์ต (วางข้อมูลไว้ให้ต่อ)

ข้อมูลพวกนี้อยู่ครบใน `checklist.json` แล้ว เหลือแค่ทำ UI:
- NCR (Non-Conformance Report) เด้งอัตโนมัติเมื่อกด "ไม่ผ่าน"
- ตารางลงนาม 3 ฝ่าย (จัดทำ/ตรวจสอบ/อนุมัติ — ดู `signRoles`, `approveOpts`)
- รายการบันทึกผลทดสอบเชิงตัวเลข (ดู `tests`)
- ปุ่มออกรายงาน PDF · ระบบล็อกอินแยกผู้ใช้

---

## ⚠️ ข้อควรระวังทางวิศวกรรม

ค่าเกณฑ์และการจัดระดับทั้งหมดเป็น **ค่าเริ่มต้นแนะนำ** ต้องให้ **วิศวกรผู้ออกแบบยืนยัน** ก่อนใช้ตรวจรับจริง
# cs-checklist
