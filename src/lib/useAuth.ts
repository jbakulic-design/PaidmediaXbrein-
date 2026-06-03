"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Sesión inicial
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthenticated(!!data.user);
      setReady(true);
    });

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  return { authenticated, ready, user, login, logout };
}
