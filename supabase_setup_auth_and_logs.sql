-- ==============================================================================
-- SQL สำหรับสร้างตาราง users และ login_logs ใน Supabase
-- คัดลอกโค้ดทั้งหมดนี้ไปวางในหน้า Supabase SQL Editor แล้วกด "Run" ได้ทันทีครับ
-- ==============================================================================

-- 1. ตาราง users (จัดเก็บข้อมูลบัญชีผู้ใช้งาน)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'pm',
  title TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ตาราง login_logs (จัดเก็บประวัติการเข้าสู่ระบบ)
CREATE TABLE IF NOT EXISTS public.login_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT NOT NULL,
  name TEXT DEFAULT '-',
  role TEXT DEFAULT '-',
  status TEXT NOT NULL DEFAULT 'success',
  ip_address TEXT DEFAULT '-',
  user_agent TEXT DEFAULT '-',
  logged_in_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- สร้าง Index เพื่อให้การค้นหาเร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_login_logs_email ON public.login_logs(email);
CREATE INDEX IF NOT EXISTS idx_login_logs_logged_in_at ON public.login_logs(logged_in_at DESC);

-- เปิดใช้งาน Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- กำหนด Policies ให้ Anonymous / Service สามารถอ่าน-เขียนได้
DROP POLICY IF EXISTS "Allow anon read users" ON public.users;
CREATE POLICY "Allow anon read users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert users" ON public.users;
CREATE POLICY "Allow anon insert users" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update users" ON public.users;
CREATE POLICY "Allow anon update users" ON public.users FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow anon read login_logs" ON public.login_logs;
CREATE POLICY "Allow anon read login_logs" ON public.login_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert login_logs" ON public.login_logs;
CREATE POLICY "Allow anon insert login_logs" ON public.login_logs FOR INSERT WITH CHECK (true);
