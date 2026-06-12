"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  targetId: string;
  motionKey: string;
  title: string;
  rate?: number;
  pitch?: number;
};

// ─── Text preprocessing ───────────────────────────────────────────────────────
// Makes speech sound natural by removing artifacts before it reaches the synth.

function preprocessForSpeech(raw: string): string {
  let t = raw;

  // Strip fenced code blocks entirely – reading code character-by-character is terrible
  t = t.replace(/```[\s\S]*?```/gm, " ");
  // Inline code: drop backticks, keep the word
  t = t.replace(/`([^`\n]{1,80})`/g, "$1");

  // Strip URLs
  t = t.replace(/https?:\/\/\S+/g, "");

  // Markdown formatting
  t = t.replace(/#{1,6}\s+/g, "");                          // headings
  t = t.replace(/[*_~]{1,3}([^*_~\n]+)[*_~]{1,3}/g, "$1"); // bold/italic
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");            // [text](url)
  t = t.replace(/!\[[^\]]*\]\([^)]+\)/g, "");               // images

  // Common abbreviations that trip up synthesis
  t = t.replace(/\be\.g\./gi, "for example");
  t = t.replace(/\bi\.e\./gi, "that is");
  t = t.replace(/\betc\./gi, "and so on");
  t = t.replace(/\bvs\./gi, "versus");
  t = t.replace(/\bapprox\./gi, "approximately");
  t = t.replace(/\bFig\./gi, "Figure");

  // Numbers / units
  t = t.replace(/(\d[\d,]*)%/g, "$1 percent");
  t = t.replace(/\$(\d)/g, "$1 dollars");
  t = t.replace(/(\d+)x\b/g, "$1 times");
  t = t.replace(/(\d+)k\b/g, "$1 thousand");
  t = t.replace(/(\d+)M\b/g, "$1 million");

  // Special punctuation that confuses synths
  t = t.replace(/—|–/g, ", ");
  t = t.replace(/[""]/g, '"');
  t = t.replace(/['']/g, "'");
  t = t.replace(/\.\.\./g, ", ");

  // Collapse whitespace / blank lines
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

// ─── Chunking ─────────────────────────────────────────────────────────────────
// Chunk by paragraph, not sentence — far fewer gaps, much more natural flow.
// Paragraphs larger than maxWords are split at sentence boundaries.

function chunkByParagraph(text: string, maxWords = 110): string[] {
  const paragraphs = text.split(/\n\n+/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
  const out: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    if (words.length <= maxWords) {
      out.push(para);
      continue;
    }
    // Split large paragraph at sentence endings
    const sentences = para.match(/[^.!?]+[.!?]+\s*/g) ?? [para];
    let buf = "";
    let wc = 0;
    for (const s of sentences) {
      const sw = s.split(/\s+/).length;
      if (wc + sw > maxWords && buf) {
        out.push(buf.trim());
        buf = s;
        wc = sw;
      } else {
        buf += s;
        wc += sw;
      }
    }
    if (buf.trim()) out.push(buf.trim());
  }

  return out.filter((c) => c.length > 2);
}

// ─── Voice selection ──────────────────────────────────────────────────────────

function getBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  // Quality tiers: neural / enhanced voices first
  const tiers = [
    // macOS / iOS Siri neural voices
    /^Siri\b/i,
    /\bNeural\b/i,
    /\bEnhanced\b/i,
    // Named good voices
    /samantha/i,
    /ava/i,
    /allison/i,
    /fiona/i,
    /karen/i,
    /victoria/i,
    // Windows neural
    /^Microsoft Aria/i,
    /^Microsoft Jenny/i,
    /^Microsoft Zira/i,
    // Google
    /^Google UK English Female/i,
    /^Google US English/i,
  ];

  for (const pattern of tiers) {
    const v = voices.find(
      (v) => pattern.test(v.name) && v.lang.toLowerCase().startsWith("en")
    );
    if (v) return v;
  }

  // Fallback: any English voice
  return voices.find((v) => v.lang.toLowerCase().startsWith("en")) ?? voices[0] ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TTSFloatingPlayer({
  targetId,
  motionKey,
  title,
  rate = 0.92,   // slower = more natural, 0.9-0.95 is the sweet spot
  pitch = 1.0,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const supported = mounted && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [chunkProgress, setChunkProgress] = useState(0); // 0–1

  const runIdRef = useRef(0);
  const idxRef = useRef(0);
  const chunksRef = useRef<string[]>([]);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Load voices
  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        voiceRef.current = getBestVoice(voices);
        setVoicesLoaded(true);
      }
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

      if (i >= chunks.length) {
        setSpeaking(false);
        setPaused(false);
        setChunkProgress(1);
        return;
      }

      setChunkProgress(i / Math.max(1, chunks.length));

      const u = new SpeechSynthesisUtterance(chunks[i]);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = rate;
      u.pitch = pitch;
      u.volume = 1;

      u.onend = () => {
        if (runId !== runIdRef.current) return;
        idxRef.current += 1;
        speakNext(runId);
      };
      u.onerror = (e) => {
        // "interrupted" fires when we cancel intentionally — ignore it
        if (e.error === "interrupted") return;
        if (runId !== runIdRef.current) return;
        setSpeaking(false);
        setPaused(false);
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
      if (paused) {
        window.speechSynthesis.resume();
        setPaused(false);
      } else {
        window.speechSynthesis.pause();
        setPaused(true);
      }
    } catch { stop(); }
  }, [paused, speaking, start, supported, voicesLoaded, stop]);

  // Chrome bug: speechSynthesis silently stops after ~15 seconds.
  // Fix: nudge it with pause/resume every 12 seconds while playing.
  useEffect(() => {
    if (!speaking || paused) return;
    const id = setInterval(() => {
      if (!window.speechSynthesis.speaking) return;
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 12000);
    return () => clearInterval(id);
  }, [speaking, paused]);

  // Stop on article change
  useEffect(() => { if (mounted) stop(); }, [mounted, motionKey, stop]); // eslint-disable-line react-hooks/exhaustive-deps
  // Stop on unmount
  useEffect(() => stop, [stop]);

  const canUse = supported && voicesLoaded;

  return (
    <>
      {/* Listen trigger — shown when idle */}
      <AnimatePresence>
        {canUse && !speaking && (
          <motion.button
            key="listen-btn"
            type="button"
            onClick={start}
            className="fixed bottom-28 right-4 z-40 flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/18 border border-white/15 backdrop-blur-md px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-colors duration-200 active:scale-95"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <SpeakerIcon />
            Listen
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating mini-player — shown only while speaking */}
      <AnimatePresence>
        {speaking && (
          <motion.div
            key="tts-player"
            className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm"
            initial={{ opacity: 0, y: 32, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
          >
            <div className="relative overflow-hidden rounded-2xl bg-zinc-900/92 border border-white/10 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)]">
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
                              transition: {
                                duration: 1.1,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.13,
                              },
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
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
