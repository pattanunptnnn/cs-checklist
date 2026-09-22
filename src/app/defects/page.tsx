import WeeklyDefectList from "@/components/WeeklyDefectList";

export const metadata = {
  title: "ระบบตรวจและติดตาม Defect รายสัปดาห์ | Big-C Quality Control",
  description: "บันทึกและติดตามข้อบกพร่องงานก่อสร้างรายสัปดาห์ พร้อมภาพถ่าย Before/After และสถานะการแก้ไข",
};

export default function DefectsPage() {
  return <WeeklyDefectList />;
}
