"use client";

import { useEffect, useState } from "react";

const FB_APP_ID = "1010904391689357";
const FB_VERSION = "v19.0";
const FB_SCOPE = "ads_read";
const TOKEN_KEY    = "paidmedia_fb_token_v1";
const ACCOUNT_KEY  = "paidmedia_fb_account_v1";
const REDIRECT_PENDING_KEY = "paidmedia_fb_login_pending";

declare global {
  interface Window {
    FB: {
      init: (opts: object) => void;
      login: (cb: (res: { authResponse?: { accessToken: string } }) => void, opts: object) => void;
      logout: (cb: () => void) => void;
      getLoginStatus: (cb: (res: { status: string; authResponse?: { accessToken: string } }) => void) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export type FBStatus = "idle" | "loading" | "connected" | "error";

// ── Helpers ───────────────────────────────────────────────────────────────────

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function loadSdk(onReady: () => void) {
  if (window.FB) { onReady(); return; }
  if (document.getElementById("facebook-jssdk")) {
    const existing = window.fbAsyncInit;
    window.fbAsyncInit = () => { existing?.(); onReady(); };
    return;
  }
  window.fbAsyncInit = () => {
    window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: FB_VERSION });
    onReady();
  };
  const js = document.createElement("script");
  js.id = "facebook-jssdk";
  js.src = "https://connect.facebook.net/es_LA/sdk.js";
  js.async = true;
  js.defer = true;
  document.body.appendChild(js);
}

/** Lee el access_token del fragment de la URL (#access_token=...) y limpia la URL */
function consumeRedirectHash(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash || !hash.includes("access_token=")) return null;
  const params = new URLSearchParams(hash.slice(1));
  const tok = params.get("access_token");
  if (tok) {
    // Limpiar el hash de la URL
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  return tok;
}

/** Genera la URL de OAuth para flujo de redirect (mobile + fallback) */
function buildOAuthRedirectUrl(): string {
  const redirectUri = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({
    client_id: FB_APP_ID,
    redirect_uri: redirectUri,
    scope: FB_SCOPE,
    response_type: "token",
    auth_type: "rerequest",
  });
  return `https://www.facebook.com/${FB_VERSION}/dialog/oauth?${params.toString()}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFacebookSDK() {
  const [status, setStatus] = useState<FBStatus>("loading");
  const [token, setToken] = useState<string | null>(null);

  // Intercambia token corto por uno de larga duración (60 días)
  const exchangeForLongLived = async (shortToken: string): Promise<string> => {
    try {
      const res  = await fetch("/api/refresh-token", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token: shortToken }),
      });
      const data = await res.json();
      return data.access_token ?? shortToken;
    } catch {
      return shortToken;
    }
  };

  // ── Init: check stored token + handle redirect callback ─────────────────
  useEffect(() => {
    // 1) Si volvemos de un redirect OAuth, procesar el token del hash
    const redirectToken = consumeRedirectHash();
    if (redirectToken) {
      localStorage.removeItem(REDIRECT_PENDING_KEY);
      setStatus("loading");
      exchangeForLongLived(redirectToken)
        .then((longToken) => {
          localStorage.setItem(TOKEN_KEY, longToken);
          setToken(longToken);
          setStatus("connected");
        })
        .catch(() => {
          localStorage.setItem(TOKEN_KEY, redirectToken);
          setToken(redirectToken);
          setStatus("connected");
        });
      return;
    }

    // 2) Token ya guardado de sesión previa
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      setToken(stored);
      setStatus("connected");
      return;
    }

    // 3) Si había un redirect pendiente que no completó, limpiar
    if (localStorage.getItem(REDIRECT_PENDING_KEY)) {
      localStorage.removeItem(REDIRECT_PENDING_KEY);
    }

    setStatus("idle");
  }, []);

  // ── Login (intenta SDK primero; en mobile o si falla → redirect) ────────
  const login = () => {
    setStatus("loading");

    // En mobile, usar SIEMPRE redirect — el popup del SDK falla en Safari/Chrome iOS
    if (isMobile()) {
      localStorage.setItem(REDIRECT_PENDING_KEY, "1");
      window.location.href = buildOAuthRedirectUrl();
      return;
    }

    // Desktop: intentar SDK (popup)
    loadSdk(() => {
      let popupBlocked = false;
      // Timeout: si después de 200ms el popup no se abrió, asumimos bloqueo → fallback redirect
      const blockedCheck = setTimeout(() => {
        if (status === "loading") popupBlocked = true;
      }, 200);

      try {
        window.FB.login(
          (res) => {
            clearTimeout(blockedCheck);
            if (res.authResponse?.accessToken) {
              const shortToken = res.authResponse.accessToken;
              exchangeForLongLived(shortToken)
                .then((longToken) => {
                  localStorage.setItem(TOKEN_KEY, longToken);
                  setToken(longToken);
                  setStatus("connected");
                })
                .catch(() => {
                  localStorage.setItem(TOKEN_KEY, shortToken);
                  setToken(shortToken);
                  setStatus("connected");
                });
            } else if (popupBlocked) {
              // Fallback a redirect
              localStorage.setItem(REDIRECT_PENDING_KEY, "1");
              window.location.href = buildOAuthRedirectUrl();
            } else {
              setStatus("idle");
            }
          },
          { scope: FB_SCOPE }
        );
      } catch {
        // Fallback: redirect si el SDK falla
        clearTimeout(blockedCheck);
        localStorage.setItem(REDIRECT_PENDING_KEY, "1");
        window.location.href = buildOAuthRedirectUrl();
      }
    });
  };

  // Permite ingresar un token manualmente (ej: token de larga duración)
  const loginWithToken = (manualToken: string) => {
    const clean = manualToken.trim();
    if (!clean) return;
    localStorage.setItem(TOKEN_KEY, clean);
    setToken(clean);
    setStatus("connected");
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
    localStorage.removeItem(REDIRECT_PENDING_KEY);
    setToken(null);
    setStatus("idle");
    if (typeof window !== "undefined" && window.FB) window.FB.logout(() => {});
  };

  return { status, token, login, loginWithToken, logout };
}

// Helpers para persistir la cuenta seleccionada
export function saveSelectedAccount(accountId: string) {
  try { localStorage.setItem(ACCOUNT_KEY, accountId); } catch { /* ignore */ }
}

export function loadSelectedAccount(): string {
  try { return localStorage.getItem(ACCOUNT_KEY) ?? ""; } catch { return ""; }
}
