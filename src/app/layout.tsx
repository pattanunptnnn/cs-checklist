import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "CS Check List — ตรวจรับงานโครงสร้าง",
  description: "ระบบตรวจรับงานโครงสร้าง BigC Mini",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ให้เนื้อหาไหลถึงขอบจอ แล้วค่อยเว้น safe-area เอง (มือถือมีติ่ง/แถบล่าง)
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#144a7a" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1116" },
  ],
};

import { AuthProvider } from "@/components/AuthProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=IBM+Plex+Sans+Thai+Condensed:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
