import type { SavedReport } from "@/types/report";

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  path: string; // e.g. "data/reports.json"
}

const API = "https://api.github.com";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
}

// Base64 encode UTF-8 content
function encodeContent(data: unknown): string {
  const json = JSON.stringify(data, null, 2);
  return btoa(unescape(encodeURIComponent(json)));
}

// Decode base64 content from GitHub
function decodeContent(b64: string): unknown {
  return JSON.parse(decodeURIComponent(escape(atob(b64.replace(/\s/g, "")))));
}

export async function githubRead(cfg: GitHubConfig): Promise<{ reports: SavedReport[]; sha: string | undefined }> {
  const res = await fetch(`${API}/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`, {
    headers: headers(cfg.token),
  });

  if (res.status === 404) return { reports: [], sha: undefined };
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const reports = decodeContent(data.content) as SavedReport[];
  return { reports: Array.isArray(reports) ? reports : [], sha: data.sha };
}

export async function githubWrite(cfg: GitHubConfig, reports: SavedReport[], sha?: string): Promise<string | undefined> {
  const body: Record<string, unknown> = {
    message: `chore: update reports ${new Date().toISOString().slice(0, 10)}`,
    content: encodeContent(reports),
  };
  if (sha) body.sha = sha;

  const res = await fetch(`${API}/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`, {
    method: "PUT",
    headers: headers(cfg.token),
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`GitHub write error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content?.sha ?? data.sha) as string | undefined;
}

const CFG_KEY = "paidmedia_github_cfg";
const SHA_KEY = "paidmedia_github_sha";

export function loadGitHubConfig(): GitHubConfig | null {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGitHubConfig(cfg: GitHubConfig): void {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

export function clearGitHubConfig(): void {
  localStorage.removeItem(CFG_KEY);
  localStorage.removeItem(SHA_KEY);
}

export function loadCachedSha(): string | undefined {
  return localStorage.getItem(SHA_KEY) ?? undefined;
}

export function saveCachedSha(sha: string): void {
  localStorage.setItem(SHA_KEY, sha);
}
