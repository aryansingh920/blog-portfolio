"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  targetId: string;
  motionKey: string;
  title: string;
  rate?: number;
  pitch?: number;
};

// ─── Text preprocessing ───────────────────────────────────────────────────────

function preprocessForSpeech(raw: string): string {
  let t = raw;
  t = t.replace(/```[\s\S]*?```/gm, " ");
  t = t.replace(/`([^`\n]{1,80})`/g, "$1");
  t = t.replace(/https?:\/\/\S+/g, "");
  t = t.replace(/#{1,6}\s+/g, "");
  t = t.replace(/[*_~]{1,3}([^*_~\n]+)[*_~]{1,3}/g, "$1");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  t = t.replace(/!\[[^\]]*\]\([^)]+\)/g, "");
  t = t.replace(/\be\.g\./gi, "for example");
  t = t.replace(/\bi\.e\./gi, "that is");
  t = t.replace(/\betc\./gi, "and so on");
  t = t.replace(/\bvs\./gi, "versus");
  t = t.replace(/\bapprox\./gi, "approximately");
  t = t.replace(/\bFig\./gi, "Figure");
  t = t.replace(/(\d[\d,]*)%/g, "$1 percent");
  t = t.replace(/\$(\d)/g, "$1 dollars");
  t = t.replace(/(\d+)x\b/g, "$1 times");
  t = t.replace(/(\d+)k\b/g, "$1 thousand");
  t = t.replace(/(\d+)M\b/g, "$1 million");
  t = t.replace(/—|–/g, ", ");
  t = t.replace(/[""]/g, '"');
  t = t.replace(/['']/g, "'");
  t = t.replace(/\.\.\./g, ", ");
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

function chunkByParagraph(text: string, maxWords = 110): string[] {
  const paragraphs = text.split(/\n\n+/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
  const out: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    if (words.length <= maxWords) { out.push(para); continue; }
    const sentences = para.match(/[^.!?]+[.!?]+\s*/g) ?? [para];
    let buf = "";
    let wc = 0;
    for (const s of sentences) {
      const sw = s.split(/\s+/).length;
      if (wc + sw > maxWords && buf) { out.push(buf.trim()); buf = s; wc = sw; }
      else { buf += s; wc += sw; }
    }
    if (buf.trim()) out.push(buf.trim());
  }

  return out.filter((c) => c.length > 2);
}

// ─── Voice selection ──────────────────────────────────────────────────────────

function getBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const tiers = [
    /^Siri\b/i, /\bNeural\b/i, /\bEnhanced\b/i,
    /samantha/i, /ava/i, /allison/i, /fiona/i, /karen/i, /victoria/i,
    /^Microsoft Aria/i, /^Microsoft Jenny/i, /^Microsoft Zira/i,
    /^Google UK English Female/i, /^Google US English/i,
  ];
  for (const pattern of tiers) {
    const v = voices.find((v) => pattern.test(v.name) && v.lang.toLowerCase().startsWith("en"));
    if (v) return v;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith("en")) ?? voices[0] ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TTSFloatingPlayer({
  targetId,
  motionKey,
  title,
  rate = 0.92,
  pitch = 1.0,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const supported = mounted && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [chunkProgress, setChunkProgress] = useState(0);

  // Portal target — the slot injected into BottomToolsBar
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!mounted) return;
    const el = document.getElementById("tts-toolbar-slot");
    setSlotEl(el);
  }, [mounted]);

  const runIdRef = useRef(0);
  const idxRef = useRef(0);
  const chunksRef = useRef<string[]>([]);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) { voiceRef.current = getBestVoice(voices); setVoicesLoaded(true); }
    };
    load();
    const prev = window.speechSynthesis.onvoiceschanged;
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = prev ?? null; };
  }, [supported]);

  const stop = useCallback(() => {
    runIdRef.current += 1;
    idxRef.current = 0;
    chunksRef.current = [];
    if (supported) { try { window.speechSynthesis.cancel(); } catch {} }
    setSpeaking(false);
    setPaused(false);
    setChunkProgress(0);
  }, [supported]);

  const speakNext = useCallback(
    (runId: number) => {
      if (!supported) return;
      if (runId !== runIdRef.current) return;
      const chunks = chunksRef.current;
      const i = idxRef.current;
      if (i >= chunks.length) { setSpeaking(false); setPaused(false); setChunkProgress(1); return; }
      setChunkProgress(i / Math.max(1, chunks.length));
      const u = new SpeechSynthesisUtterance(chunks[i]);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = rate;
      u.pitch = pitch;
      u.volume = 1;
      u.onend = () => { if (runId !== runIdRef.current) return; idxRef.current += 1; speakNext(runId); };
      u.onerror = (e) => {
        if (e.error === "interrupted") return;
        if (runId !== runIdRef.current) return;
        setSpeaking(false); setPaused(false);
      };
      try { window.speechSynthesis.speak(u); } catch { stop(); }
    },
    [pitch, rate, supported, stop]
  );

  const start = useCallback(() => {
    if (!supported || !voicesLoaded) return;
    const raw = (() => {
      const el = document.getElementById(targetId);
      if (!el) return "";
      return ((el as HTMLElement).innerText || "").replace(/\s+/g, " ").trim();
    })();
    if (!raw) return;
    try { window.speechSynthesis.cancel(); } catch {}
    chunksRef.current = chunkByParagraph(preprocessForSpeech(raw));
    idxRef.current = 0;
    runIdRef.current += 1;
    setSpeaking(true);
    setPaused(false);
    setChunkProgress(0);
    speakNext(runIdRef.current);
  }, [speakNext, supported, targetId, voicesLoaded]);

  const togglePlayPause = useCallback(() => {
    if (!supported || !voicesLoaded) return;
    if (!speaking) { start(); return; }
    try {
      if (paused) { window.speechSynthesis.resume(); setPaused(false); }
      else { window.speechSynthesis.pause(); setPaused(true); }
    } catch { stop(); }
  }, [paused, speaking, start, supported, voicesLoaded, stop]);

  // Chrome bug: nudge speech every 12s to prevent silent stopping
  useEffect(() => {
    if (!speaking || paused) return;
    const id = setInterval(() => {
      if (!window.speechSynthesis.speaking) return;
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 12000);
    return () => clearInterval(id);
  }, [speaking, paused]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (mounted) stop(); }, [mounted, motionKey]);
  useEffect(() => stop, [stop]);

  const canUse = supported && voicesLoaded;

  // ── Listen pill — portalled into BottomToolsBar slot ─────────────────────
  const listenPill = canUse && !speaking && slotEl
    ? createPortal(
        <button
          type="button"
          onClick={start}
          className={[
            "group relative shrink-0 rounded-xl px-4 py-2",
            "border border-indigo-400/30",
            "bg-gradient-to-b from-indigo-500/15 to-indigo-500/8",
            "hover:from-indigo-500/22 hover:to-indigo-500/12",
            "active:from-indigo-500/18 active:to-indigo-500/10",
            "transition shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
            "flex items-center gap-1.5",
            "text-[12px] text-indigo-300 group-hover:text-indigo-200",
          ].join(" ")}
          aria-label="Listen to article"
        >
          <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition shadow-[0_0_20px_rgba(99,102,241,0.25)]" />
          <span className="relative flex items-center gap-1.5">
            <SpeakerIcon />
            <span className="whitespace-nowrap">Listen</span>
          </span>
        </button>,
        slotEl
      )
    : null;

  // ── Mini-player — floats above the BottomToolsBar while speaking ──────────
  // BottomToolsBar is ~88px tall + 12px bottom margin = ~100px from bottom.
  // We add 8px breathing room → position at 108px from bottom.
  const miniPlayerBottom = "calc(max(12px, env(safe-area-inset-bottom)) + 100px)";

  return (
    <>
      {listenPill}

      <AnimatePresence>
        {speaking && (
          <motion.div
            key="tts-player"
            className="fixed left-3 right-3 z-[10000] mx-auto max-w-md"
            style={{ bottom: miniPlayerBottom }}
            initial={{ opacity: 0, y: 32, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
          >
            <div className="relative overflow-hidden rounded-2xl bg-zinc-900/95 border border-white/10 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.05)]">
              {/* Progress track */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/8">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-400 to-violet-400"
                  animate={{ scaleX: chunkProgress }}
                  style={{ originX: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>

              <div className="px-4 py-3 flex items-center gap-3">
                {/* Animated waveform */}
                <div className="flex items-end gap-[3px] shrink-0 h-5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-[3px] rounded-full bg-violet-400"
                      animate={
                        paused
                          ? { height: 3, opacity: 0.4 }
                          : {
                              height: [3, 14 + i * 2, 5, 18, 3],
                              opacity: 1,
                              transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.13 },
                            }
                      }
                      style={{ height: 3 }}
                    />
                  ))}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-white/35 font-semibold uppercase tracking-widest">
                    {paused ? "Paused" : "Now Reading"}
                  </div>
                  <div className="text-sm font-semibold text-white/90 truncate leading-tight mt-0.5">
                    {title}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-white/90 active:scale-90 transition-all duration-150 shadow"
                    aria-label={paused ? "Resume" : "Pause"}
                  >
                    {paused ? <PlayIcon /> : <PauseIcon />}
                  </button>
                  <button
                    type="button"
                    onClick={stop}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/18 border border-white/10 flex items-center justify-center active:scale-90 transition-all duration-150"
                    aria-label="Stop"
                  >
                    <StopIcon />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SpeakerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 5L6 9H3v6h3l5 4V5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M15.5 8.5a4.5 4.5 0 010 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 4l14 8-14 8V4z" fill="black" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="4" width="4" height="16" rx="1" fill="black" />
      <rect x="15" y="4" width="4" height="16" rx="1" fill="black" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" fill="white" opacity="0.8" />
    </svg>
  );
}
