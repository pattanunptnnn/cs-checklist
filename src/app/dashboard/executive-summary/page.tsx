import ExecutiveSummaryReport from "@/components/ExecutiveSummaryReport";

export const metadata = {
  title: "รายงานสรุปผู้บริหาร A4 (Executive Summary) | Big-C",
  description: "รายงานสรุปผลการตรวจรับงานวิศวกรรมโครงสร้างและข้อบกพร่อง Defect สำหรับผู้บริหารในหน้าเดียวจบ (A4 Print / PDF)",
};

export default function ExecutiveSummaryPage() {
  return <ExecutiveSummaryReport />;
}
