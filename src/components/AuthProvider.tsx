"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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

const STORAGE_KEY = "cs_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ค่าเริ่มต้นให้เป็น PM เพื่อความสะดวกในการเข้าใช้งานตรวจงานได้ทันที
  const [user, setUser] = useState<AuthUser | null>(DEMO_USERS.pm);
  const [isLoading, setIsLoading] = useState(true);

  // โหลด session จาก localStorage เมื่อเริ่มต้น
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AuthUser;
        if (parsed && DEMO_USERS[parsed.role]) {
          setUser(parsed);
        }
      } else {
        // บันทึก default user (PM)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USERS.pm));
      }
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // สลับ Role แบบรวดเร็วเพื่อทดสอบสิทธิ์
  const switchRole = useCallback((newRole: UserRole) => {
    const targetUser = DEMO_USERS[newRole];
    setUser(targetUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(targetUser));
  }, []);

  const role = user?.role || "pm";
  const isAuthenticated = Boolean(user);

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
