import PMDashboard from "@/components/PMDashboard";

export const metadata = {
  title: "แดชบอร์ดติดตามหน้างาน & ผลงาน PM | ระบบตรวจรับงานโครงสร้าง Big-C",
  description: "รายงานประวัติการเข้าไซต์งาน ความตรงต่อเวลา และประสิทธิภาพการตรวจงานของวิศวกรผู้ตรวจ (PM)",
};

export default function DashboardPage() {
  return <PMDashboard />;
}
