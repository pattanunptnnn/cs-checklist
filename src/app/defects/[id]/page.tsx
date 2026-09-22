import WeeklyDefectEditor from "@/components/WeeklyDefectEditor";

export const metadata = {
  title: "จัดการและตรวจรับ Defect รายสัปดาห์ | Big-C Quality Control",
  description: "บันทึกผลการแก้ไข Defect เปรียบเทียบภาพถ่าย Before/After และตรวจปิดงาน",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WeeklyDefectPage({ params }: PageProps) {
  const { id } = await params;
  return <WeeklyDefectEditor id={id} />;
}
