import type { Config } from "tailwindcss";

// สีทั้งหมดเก็บเป็น "ช่อง RGB" ใน CSS variable (ดู globals.css)
// เขียนแบบนี้เพื่อให้ยังใช้ opacity modifier ของ Tailwind ได้ เช่น bg-pass/10
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: token("paper"),      // พื้นหลังหน้า
        card: token("card"),        // พื้นการ์ด
        sunken: token("sunken"),    // พื้นที่จมลงไป (หัวบล็อก, ช่องกรอก)
        ink: token("ink"),          // ตัวอักษรหลัก
        ink2: token("ink2"),        // ตัวอักษรรอง
        ink3: token("ink3"),        // ตัวอักษรจาง
        line: token("line"),        // เส้นขอบ
        line2: token("line2"),      // เส้นขอบเข้ม
        brand: token("brand"),      // น้ำเงินแบบแปลนก่อสร้าง
        accent: token("accent"),    // ส้มนิรภัย
        pass: token("pass"),
        fail: token("fail"),
        na: token("na"),
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', "system-ui", "sans-serif"],
        display: ['"IBM Plex Sans Thai Condensed"', '"IBM Plex Sans Thai"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        card: "0 1px 2px rgb(var(--shadow) / 0.06), 0 1px 3px rgb(var(--shadow) / 0.04)",
        lift: "0 2px 4px rgb(var(--shadow) / 0.06), 0 8px 20px rgb(var(--shadow) / 0.08)",
        bar: "0 -1px 0 rgb(var(--line) / 1), 0 -8px 24px rgb(var(--shadow) / 0.06)",
      },
      transitionTimingFunction: {
        snap: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
