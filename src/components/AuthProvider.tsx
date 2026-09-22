"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthUser, UserRole } from "@/lib/types";
import { DEMO_USERS, authenticateUser, registerUser, getRegisteredUsers } from "@/lib/auth";

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    title?: string;
    phone?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session storage key
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
        if (parsed && parsed.id && parsed.role) {
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

  const login = useCallback(async (email: string, password?: string) => {
    const term = email.trim().toLowerCase();
    const pwd = password || "";

    const res = authenticateUser(term, pwd);
    if (!res.success || !res.user) {
      return { success: false, error: res.error || "เข้าสู่ระบบไม่สำเร็จ" };
    }

    setUser(res.user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
    return { success: true };
  }, []);

  const register = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      role: UserRole;
      title?: string;
      phone?: string;
    }) => {
      const res = registerUser(data);
      if (!res.success || !res.user) {
        return { success: false, error: res.error || "สร้างบัญชีไม่สำเร็จ" };
      }

      setUser(res.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
      return { success: true };
    },
    []
  );

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
        register,
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
