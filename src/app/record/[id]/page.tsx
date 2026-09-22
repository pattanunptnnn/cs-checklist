import RecordEditor from "@/components/RecordEditor";

// ตั้งแต่ Next.js 15 เป็นต้นไป params เป็น Promise ต้อง await ก่อนใช้
export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecordEditor id={id} />;
}
