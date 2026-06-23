"use client";
import { useState } from "react";

const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD ?? "paidmedia2025";

export function useAuth() {
  const [authenticated] = useState(true);
  const ready = true;

  const login = (pw: string) => pw === APP_PASSWORD;
  const logout = () => {};

  return { authenticated, ready, login, logout };
}
