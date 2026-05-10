"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SavedReport } from "@/types/report";
import type { GitHubConfig } from "@/lib/githubStorage";
import { githubRead, githubWrite, loadCachedSha, saveCachedSha } from "@/lib/githubStorage";
import { getReportsKey } from "@/lib/useWorkspace";

export function useReports(githubCfg?: GitHubConfig | null, workspaceId = "default") {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [syncing, setSyncing] = useState(false);
  const cfgRef = useRef(githubCfg);
  cfgRef.current = githubCfg;
  const storageKey = getReportsKey(workspaceId);

  // Reload from localStorage when workspace changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setReports(raw ? JSON.parse(raw) : []);
    } catch {
      setReports([]);
    }
  }, [storageKey]);

  // Sync from GitHub when config becomes available
  useEffect(() => {
    if (!githubCfg) return;
    setSyncing(true);
    const ghPath = workspaceId === "default"
      ? githubCfg.path
      : githubCfg.path.replace(".json", `_${workspaceId}.json`);
    const cfg = { ...githubCfg, path: ghPath };
    githubRead(cfg)
      .then(({ reports: ghReports, sha }) => {
        if (sha) saveCachedSha(sha);
        if (ghReports.length > 0) {
          setReports(ghReports);
          localStorage.setItem(storageKey, JSON.stringify(ghReports));
        }
      })
      .catch(console.error)
      .finally(() => setSyncing(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [githubCfg?.token, githubCfg?.owner, githubCfg?.repo, githubCfg?.path, workspaceId]);

  const syncToGitHub = useCallback(async (updated: SavedReport[]) => {
    const cfg = cfgRef.current;
    if (!cfg) return;
    const ghPath = workspaceId === "default"
      ? cfg.path
      : cfg.path.replace(".json", `_${workspaceId}.json`);
    try {
      const sha = loadCachedSha();
      const newSha = await githubWrite({ ...cfg, path: ghPath }, updated, sha);
      if (newSha) saveCachedSha(newSha);
    } catch (e) {
      console.error("GitHub sync failed:", e);
    }
  }, [workspaceId]);

  const save = useCallback((report: SavedReport) => {
    setReports((prev) => {
      const updated = [report, ...prev];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      syncToGitHub(updated);
      return updated;
    });
  }, [storageKey, syncToGitHub]);

  const remove = useCallback((id: string) => {
    setReports((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      syncToGitHub(updated);
      return updated;
    });
  }, [storageKey, syncToGitHub]);

  const clear = useCallback(() => {
    localStorage.removeItem(storageKey);
    setReports([]);
    syncToGitHub([]);
  }, [storageKey, syncToGitHub]);

  return { reports, save, remove, clear, syncing };
}
