"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!userId) { setProfile(null); return; }
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("useProfile error:", error);
          return;
        }
        console.log("useProfile data:", data);
        setProfile(data);
      });
  }, [userId]);

  return profile;
}
