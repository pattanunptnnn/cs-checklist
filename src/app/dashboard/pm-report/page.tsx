import PMAuditReport from "@/components/PMAuditReport";

export const metadata = {
  title: "รายงานสรุปการตรวจหน้างานและแนบรูปภาพรายบุคคล PM (PDF Export) | Big-C",
  description:
    "รายงานสรุปการปฏิบัติงาน เช็คอิน GPS, ภาพ Selfie, จำนวนสาขาที่ตรวจจริงและแนบรูป, Defect และรูป Defect แยกรายบุคคล PM พร้อมรายชื่อสาขา",
};

export default function PMAuditReportPage() {
  return <PMAuditReport />;
}
