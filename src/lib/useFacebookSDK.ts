"use client";

import { useEffect, useState } from "react";

const FB_APP_ID = "1010904391689357";
const FB_VERSION = "v19.0";
const TOKEN_KEY    = "paidmedia_fb_token_v1";
const ACCOUNT_KEY  = "paidmedia_fb_account_v1";

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

export function useFacebookSDK() {
  const [status, setStatus] = useState<FBStatus>("loading");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      setToken(stored);
      setStatus("connected");
      return;
    }
    setStatus("idle");
  }, []);

  const login = () => {
    setStatus("loading");
    loadSdk(() => {
      window.FB.login(
        (res) => {
          if (res.authResponse?.accessToken) {
            localStorage.setItem(TOKEN_KEY, res.authResponse.accessToken);
            setToken(res.authResponse.accessToken);
            setStatus("connected");
          } else {
            setStatus("idle");
          }
        },
        { scope: "ads_read,ads_management" }
      );
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
    setToken(null);
    setStatus("idle");
    if (window.FB) window.FB.logout(() => {});
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
