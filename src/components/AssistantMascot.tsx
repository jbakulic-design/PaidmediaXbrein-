"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, MessageCircle } from "lucide-react";

// Rotating greeting messages — ROI's personality
const MESSAGES = [
  "¡Hola! Soy ROI 👋 tu próximo asistente.",
  "Sí, me llamo como la métrica favorita de todos. 😎",
  "Pronto vas a poder preguntarme: '¿Qué campaña rinde mejor?' ✨",
  "Te voy a leer las métricas y darte insights al instante. 🚀",
  "Estoy entrenándome para hacerte ganar tiempo. ¡Te aviso cuando esté listo! 🤖",
];

const SHADOW_MESSAGE = "Hey, aquí sigo… por si me necesitás, entre las sombras 🌙";

export function AssistantMascot() {
  const [mounted,        setMounted]        = useState(false);
  const [visible,        setVisible]        = useState(false);
  const [expanded,       setExpanded]       = useState(true);
  const [msgIndex,       setMsgIndex]       = useState(0);
  const [waving,         setWaving]         = useState(true);
  const [showShadow,     setShowShadow]     = useState(false);  // brief peek after collapse
  const [hoverShadow,    setHoverShadow]    = useState(false);  // on hover when minimized
  const shadowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount + initial show
  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Stop the wave animation after a few seconds
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setWaving(false), 4000);
    return () => clearTimeout(t);
  }, [visible]);

  // Cycle messages while expanded
  useEffect(() => {
    if (!visible || !expanded) return;
    const t = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length);
    }, 4500);
    return () => clearInterval(t);
  }, [visible, expanded]);

  // Minimize → show "still here, in the shadows" briefly
  function minimize() {
    setExpanded(false);
    setShowShadow(true);
    if (shadowTimerRef.current) clearTimeout(shadowTimerRef.current);
    shadowTimerRef.current = setTimeout(() => setShowShadow(false), 4000);
  }

  function expand() {
    setExpanded(true);
    setShowShadow(false);
    if (shadowTimerRef.current) clearTimeout(shadowTimerRef.current);
  }

  function toggleBubble() {
    if (expanded) minimize();
    else expand();
  }

  if (!mounted || !visible) return null;

  // Minimized state when no bubble showing
  const minimized = !expanded;
  // Show shadow message when minimized (briefly after collapse OR while hovering)
  const showShadowBubble = minimized && (showShadow || hoverShadow);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-end gap-3 pointer-events-none">

      {/* ── Main speech bubble (expanded state) ──────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="bubble"
            initial={{ opacity: 0, x: 20, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.85 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pointer-events-auto relative max-w-[260px] rounded-2xl rounded-br-md px-4 py-3 shadow-2xl border backdrop-blur-md"
            style={{
              background: "color-mix(in oklab, var(--card) 92%, transparent)",
              borderColor: "var(--border)",
            }}
          >
            {/* Minimize */}
            <button
              onClick={minimize}
              className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-accent/60 transition"
              title="Minimizar — ROI sigue acá por si lo necesitás"
            >
              <X className="w-3 h-3" style={{ color: "var(--muted-foreground)" }} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-1.5 mb-1.5 pr-5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <p className="text-xs font-bold tracking-wide">ROI</p>
              <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>· Asistente IA</span>
              <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                PRONTO
              </span>
            </div>

            {/* Rotating message */}
            <AnimatePresence mode="wait">
              <motion.p
                key={msgIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--foreground)" }}
              >
                {MESSAGES[msgIndex]}
              </motion.p>
            </AnimatePresence>

            {/* Progress dots */}
            <div className="flex gap-1 mt-2">
              {MESSAGES.map((_, i) => (
                <span
                  key={i}
                  className="h-0.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === msgIndex ? 12 : 4,
                    background: i === msgIndex ? "#3b82f6" : "var(--border)",
                  }}
                />
              ))}
            </div>

            {/* Bubble tail */}
            <span
              className="absolute -bottom-1.5 right-4 w-3 h-3 rotate-45 border-r border-b"
              style={{
                background: "color-mix(in oklab, var(--card) 92%, transparent)",
                borderColor: "var(--border)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Shadow bubble (minimized peek) ──────────────────────────────── */}
      <AnimatePresence>
        {showShadowBubble && (
          <motion.div
            key="shadow-bubble"
            initial={{ opacity: 0, x: 8, y: 4 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 8, y: 4 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pointer-events-auto relative max-w-[220px] rounded-xl rounded-br-sm px-3 py-2 shadow-xl border backdrop-blur-md"
            style={{
              background: "color-mix(in oklab, var(--card) 70%, transparent)",
              borderColor: "color-mix(in oklab, var(--border) 60%, transparent)",
            }}
          >
            <p className="text-[10.5px] leading-snug italic" style={{ color: "var(--muted-foreground)" }}>
              {SHADOW_MESSAGE}
            </p>
            <span
              className="absolute -bottom-1 right-3 w-2.5 h-2.5 rotate-45 border-r border-b"
              style={{
                background: "color-mix(in oklab, var(--card) 70%, transparent)",
                borderColor: "color-mix(in oklab, var(--border) 60%, transparent)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mascot button ──────────────────────────────────────────────── */}
      <motion.button
        onClick={toggleBubble}
        onMouseEnter={() => { if (minimized) setHoverShadow(true); }}
        onMouseLeave={() => setHoverShadow(false)}
        initial={{ scale: 0, rotate: -180 }}
        animate={{
          scale: minimized ? 0.85 : 1,
          rotate: 0,
          opacity: minimized ? 0.7 : 1,
        }}
        transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.1 }}
        whileHover={{ scale: minimized ? 1 : 1.08, opacity: 1 }}
        whileTap={{ scale: 0.92 }}
        className="pointer-events-auto relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center overflow-hidden border-2"
        style={{
          background: minimized
            ? "linear-gradient(135deg, #1e293b 0%, #334155 60%, #475569 100%)"
            : "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 60%, #ec4899 100%)",
          borderColor: "rgba(255,255,255,0.15)",
        }}
        title={expanded ? "Minimizar ROI" : "Volver a saludar a ROI"}
      >
        {/* Floating + waving emoji */}
        <motion.span
          className="text-2xl select-none"
          animate={
            waving
              ? { rotate: [0, -15, 15, -10, 10, 0], y: [0, -2, 0] }
              : { y: [0, -3, 0] }
          }
          transition={
            waving
              ? { duration: 1.2, repeat: 2, ease: "easeInOut" }
              : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          }
          style={{ filter: minimized ? "grayscale(0.4)" : undefined }}
        >
          🤖
        </motion.span>

        {/* Pulse glow on idle (only when active) */}
        {!minimized && (
          <motion.span
            className="absolute inset-0 rounded-full"
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(59,130,246,0.4)",
                "0 0 0 8px rgba(59,130,246,0)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        {/* Online indicator */}
        <motion.span
          className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
          style={{
            background: minimized ? "#94a3b8" : "#34d399",
            borderColor: "var(--background)",
          }}
          animate={{ scale: minimized ? 1 : [1, 1.15, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Chat icon overlay when minimized — invites to re-open */}
        {minimized && (
          <motion.span
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center border-2"
            style={{ borderColor: "var(--background)" }}
          >
            <MessageCircle className="w-2 h-2 text-white" />
          </motion.span>
        )}
      </motion.button>
    </div>
  );
}
