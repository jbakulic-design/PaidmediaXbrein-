"use client";
import { useEffect, useState } from "react";

const AUTH_KEY = "paidmedia_auth_v1";
const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD ?? "paidmedia2025";

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAuthenticated(localStorage.getItem(AUTH_KEY) === "1");
    setReady(true);
  }, []);

  const login = (pw: string) => {
    if (pw === APP_PASSWORD) {
      localStorage.setItem(AUTH_KEY, "1");
      setAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuthenticated(false);
  };

  return { authenticated, ready, login, logout };
}
