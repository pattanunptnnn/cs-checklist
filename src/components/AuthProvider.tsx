"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthUser, UserRole } from "@/lib/types";
import { DEMO_USERS } from "@/lib/auth";

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrRole: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ใช้ key ใหม่ เพื่อให้ผู้ใช้ที่เคยมี session เก่าถูกนำไปหน้า /login เพื่อเลือกบทบาทก่อน
const STORAGE_KEY = "bigc_cs_user_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // โหลด session จาก localStorage เมื่อเริ่มต้น
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AuthUser;
        if (parsed && DEMO_USERS[parsed.role]) {
          setUser(parsed);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ระบบ Auth Guard: หากยังไม่ได้ Login และไม่ได้อยู่ที่หน้า /login ให้ Redirect ไปหน้า /login ทันที
  useEffect(() => {
    if (!isLoading) {
      if (!user && pathname !== "/login") {
        router.push("/login");
      }
    }
  }, [isLoading, user, pathname, router]);

  const login = useCallback(async (emailOrRole: string, password?: string) => {
    const term = emailOrRole.trim().toLowerCase();

    // 1. เข้าสู่ระบบแบบระบุ Role โดยตรง (Quick Login)
    if (term === "admin" || term === "pm" || term === "supervisor") {
      const targetUser = DEMO_USERS[term as UserRole];
      setUser(targetUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(targetUser));
      return { success: true };
    }

    // 2. ตรวจสอบด้วย Email และ Password
    const found = Object.values(DEMO_USERS).find((u) => u.email.toLowerCase() === term);
    if (!found) {
      return { success: false, error: "ไม่พบอีเมลผู้ใช้งานนี้ในระบบ" };
    }

    if (password && found.password !== password) {
      return { success: false, error: "รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" };
    }

    const authUser: AuthUser = {
      id: found.id,
      email: found.email,
      name: found.name,
      role: found.role,
      title: found.title,
      phone: found.phone,
    };

    setUser(authUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("cs_auth_user");
    } catch {
      // ignore
    }
    router.push("/login");
  }, [router]);

  // สลับ Role แบบรวดเร็วเพื่อทดสอบสิทธิ์
  const switchRole = useCallback((newRole: UserRole) => {
    const targetUser = DEMO_USERS[newRole];
    setUser(targetUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(targetUser));
  }, []);

  const role = user?.role || "pm";
  const isAuthenticated = Boolean(user);

  // กำลังโหลดสถานะ
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07172b] flex flex-col items-center justify-center text-white p-4">
        <div className="w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-sm font-semibold text-white/80 tracking-wide">กำลังเชื่อมต่อระบบตรวจงาน...</div>
      </div>
    );
  }

  // หากยังไม่ได้เข้าสู่ระบบ และไม่ได้อยู่ที่ /login ให้แสดงหน้าจอนำทางเพื่อป้องกันการกะพริบ
  if (!user && pathname !== "/login") {
    return (
      <div className="min-h-screen bg-[#07172b] flex flex-col items-center justify-center text-white p-4">
        <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-sm font-semibold text-white/80 tracking-wide">กรุณาเข้าสู่ระบบ... กำลังพาไปหน้า Login</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoading,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
