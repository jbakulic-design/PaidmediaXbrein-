"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, MessageCircle } from "lucide-react";

const DISMISS_KEY = "tbrein_assistant_dismissed";

// Rotating greeting messages
const MESSAGES = [
  "¡Hola! 👋 Soy IA, tu próximo asistente.",
  "Pronto podrás preguntarme: '¿Qué campaña tuvo mejor CPL este mes?' ✨",
  "Voy a analizar tus métricas y darte insights al instante. 🚀",
  "Te avisaré cuando esté lista. ¡Estoy entrenándome! 🤖",
];

export function AssistantMascot() {
  const [mounted,   setMounted]   = useState(false);
  const [visible,   setVisible]   = useState(false);
  const [expanded,  setExpanded]  = useState(true);
  const [msgIndex,  setMsgIndex]  = useState(0);
  const [waving,    setWaving]    = useState(true);

  // Mount + check dismissal
  useEffect(() => {
    setMounted(true);
    const dismissed = typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY);
    if (dismissed === "permanent") return;
    // Show with a delay (let the page settle)
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Stop waving animation after a moment
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setWaving(false), 4000);
    return () => clearTimeout(t);
  }, [visible]);

  // Cycle through messages
  useEffect(() => {
    if (!visible || !expanded) return;
    const t = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length);
    }, 4500);
    return () => clearInterval(t);
  }, [visible, expanded]);

  function dismissForever() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "permanent");
  }

  function toggleBubble() {
    setExpanded(v => !v);
  }

  if (!mounted || !visible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-end gap-3 pointer-events-none">

      {/* ── Speech bubble ──────────────────────────────────────────────── */}
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
            {/* Close (permanent dismiss) */}
            <button
              onClick={dismissForever}
              className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-accent/60 transition"
              title="Ocultar mascota"
            >
              <X className="w-3 h-3" style={{ color: "var(--muted-foreground)" }} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <p className="text-xs font-bold tracking-wide">IA Assistant</p>
              <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
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
                className="text-[11px] leading-relaxed pr-3"
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

      {/* ── Mascot button ──────────────────────────────────────────────── */}
      <motion.button
        onClick={toggleBubble}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="pointer-events-auto relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center overflow-hidden border-2"
        style={{
          background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 60%, #ec4899 100%)",
          borderColor: "rgba(255,255,255,0.2)",
        }}
        title={expanded ? "Ocultar mensaje" : "Hola, soy tu próximo asistente IA"}
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
        >
          🤖
        </motion.span>

        {/* Pulse glow on idle */}
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

        {/* Online indicator */}
        <motion.span
          className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 bg-green-400"
          style={{ borderColor: "var(--background)" }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Subtle chat icon overlay when bubble is hidden */}
        {!expanded && (
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
