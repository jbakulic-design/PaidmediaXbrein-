"use client";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

export function useProfile(_userId: string | undefined): Profile | null {
  return null;
}
