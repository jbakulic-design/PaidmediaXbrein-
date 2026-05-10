"use client";

import { useState, useEffect, useCallback } from "react";
import { nanoid } from "./utils";

export interface Workspace {
  id: string;
  name: string;
  color: string;
}

const WORKSPACES_KEY = "paidmedia_workspaces";
const ACTIVE_KEY = "paidmedia_active_workspace";

const DEFAULT_COLORS = [
  "#3b82f6", "#10b981", "#f97316", "#a855f7", "#ef4444",
  "#14b8a6", "#eab308", "#ec4899",
];

const DEFAULT_WORKSPACE: Workspace = {
  id: "default",
  name: "Mi cuenta",
  color: "#3b82f6",
};

export function useWorkspace() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([DEFAULT_WORKSPACE]);
  const [activeId, setActiveId] = useState<string>("default");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WORKSPACES_KEY);
      if (raw) setWorkspaces(JSON.parse(raw));
      const active = localStorage.getItem(ACTIVE_KEY);
      if (active) setActiveId(active);
    } catch {
      // ignore
    }
  }, []);

  const activeWorkspace = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  const createWorkspace = useCallback((name: string) => {
    const workspace: Workspace = {
      id: nanoid(),
      name,
      color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
    };
    setWorkspaces((prev) => {
      const updated = [...prev, workspace];
      localStorage.setItem(WORKSPACES_KEY, JSON.stringify(updated));
      return updated;
    });
    return workspace;
  }, []);

  const switchWorkspace = useCallback((id: string) => {
    setActiveId(id);
    localStorage.setItem(ACTIVE_KEY, id);
  }, []);

  const renameWorkspace = useCallback((id: string, name: string) => {
    setWorkspaces((prev) => {
      const updated = prev.map((w) => (w.id === id ? { ...w, name } : w));
      localStorage.setItem(WORKSPACES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteWorkspace = useCallback(
    (id: string) => {
      if (id === "default") return;
      setWorkspaces((prev) => {
        const updated = prev.filter((w) => w.id !== id);
        localStorage.setItem(WORKSPACES_KEY, JSON.stringify(updated));
        return updated;
      });
      if (activeId === id) {
        setActiveId("default");
        localStorage.setItem(ACTIVE_KEY, "default");
      }
      // Remove reports for this workspace
      localStorage.removeItem(`paidmedia_reports_${id}`);
    },
    [activeId]
  );

  return {
    workspaces,
    activeWorkspace,
    createWorkspace,
    switchWorkspace,
    renameWorkspace,
    deleteWorkspace,
  };
}

export function getReportsKey(workspaceId: string): string {
  return workspaceId === "default"
    ? "paidmedia_reports"
    : `paidmedia_reports_${workspaceId}`;
}
