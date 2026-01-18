/* eslint-disable react-hooks/immutability */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  targetId: string;
  motionKey: string;
  className?: string;
  rate?: number;
  pitch?: number;
};

function getTextFromElement(id: string) {
  const el = document.getElementById(id);
  if (!el) return "";
  const text = (el as HTMLElement).innerText || "";
  return text.replace(/\s+/g, " ").trim();
}

// NO regex lookbehind (prevents hard crashes / white screens)
function chunkByPunctuation(text: string) {
  if (!text) return [];
  const out: string[] = [];
  let buf = "";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    buf += ch;

    if (ch === "." || ch === "!" || ch === "?" || ch === "…") {
      const trimmed = buf.trim();
      if (trimmed) out.push(trimmed);
      buf = "";
    }
  }

  const tail = buf.trim();
  if (tail) out.push(tail);

  return out.length ? out : [text];
}

// Helper to find a suitable female voice (prefers English)
function getPreferredVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const preferred = [
    /samantha/i, // macOS/iOS
    /fiona/i, // macOS/iOS
    /karen/i, // macOS/iOS
    /victoria/i, // macOS/iOS
    /zira/i, // Windows
    /aria/i, // Windows
    /jenny/i, // Windows
    /susan/i, // Android
    /google.*female/i, // Google voices
    /microsoft.*female/i, // Microsoft voices
  ];

  // Preferred list first
  for (const pattern of preferred) {
    const voice = voices.find(
      (v) =>
        pattern.test(v.name) &&
        (v.lang?.toLowerCase().startsWith("en") ?? false),
    );
    if (voice) return voice;
  }

  // Fallback: "female-sounding" heuristics
  const femaleVoice = voices.find((v) => {
    const name = (v.name || "").toLowerCase();
    const langOk = (v.lang || "").toLowerCase().startsWith("en");
    if (!langOk) return false;
    return (
      /female|woman/.test(name) ||
      /samantha|victoria|karen|susan|fiona|zira|aria|jenny/.test(name)
    );
  });
  if (femaleVoice) return femaleVoice;

  // Last resort: first English voice
  return (
    voices.find((v) => (v.lang || "").toLowerCase().startsWith("en")) ||
    voices[0] ||
    null
  );
}

export default function ReaderTTSButton({
  targetId,
  motionKey,
  className,
  rate = 1.1,
  pitch = 1.1,
}: Props) {
  // Hydration-safe: always render same markup; enable after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const supported =
    mounted && typeof window !== "undefined" && "speechSynthesis" in window;

  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  const runIdRef = useRef(0);
  const idxRef = useRef(0);
  const chunksRef = useRef<string[]>([]);
  const lastTextHashRef = useRef<string>("");
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Load voices when available
  useEffect(() => {
    if (!supported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        selectedVoiceRef.current = getPreferredVoice(voices);
        setVoicesLoaded(true);
      }
    };

    loadVoices();

    // Some browsers load voices async
    const prev = window.speechSynthesis.onvoiceschanged;
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      // restore to avoid clobbering other handlers
      window.speechSynthesis.onvoiceschanged = prev ?? null;
    };
  }, [supported]);

  const stop = useCallback(() => {
    runIdRef.current += 1;
    idxRef.current = 0;
    chunksRef.current = [];

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    setSpeaking(false);
    setPaused(false);
  }, []);

  const speakNext = useCallback(
    (runId: number) => {
      if (!supported || !voicesLoaded) return;
      if (runId !== runIdRef.current) return;

      const chunks = chunksRef.current;
      const i = idxRef.current;

      if (i >= chunks.length) {
        setSpeaking(false);
        setPaused(false);
        return;
      }

      const u = new SpeechSynthesisUtterance(chunks[i]);

      if (selectedVoiceRef.current) {
        u.voice = selectedVoiceRef.current;
      }

      u.rate = rate;
      u.pitch = pitch;

      u.onend = () => {
        if (runId !== runIdRef.current) return;
        idxRef.current += 1;
        speakNext(runId);
      };

      u.onerror = () => {
        if (runId !== runIdRef.current) return;
        setSpeaking(false);
        setPaused(false);
      };

      try {
        window.speechSynthesis.speak(u);
      } catch {
        stop();
      }
    },
    [pitch, rate, supported, voicesLoaded, stop],
  );

  const start = useCallback(() => {
    if (!supported || !voicesLoaded) return;

    const text = getTextFromElement(targetId);
    if (!text) return;

    const hash = String(text.length) + ":" + text.slice(0, 60);
    lastTextHashRef.current = hash;

    try {
      window.speechSynthesis.cancel();
    } catch {
      // if cancel fails, still proceed
    }

    chunksRef.current = chunkByPunctuation(text);
    idxRef.current = 0;

    runIdRef.current += 1;
    const runId = runIdRef.current;

    setSpeaking(true);
    setPaused(false);

    speakNext(runId);
  }, [speakNext, supported, targetId, voicesLoaded]);

  const toggle = useCallback(() => {
    if (!supported || !voicesLoaded) return;

    if (!speaking) {
      start();
      return;
    }

    try {
      if (paused) {
        window.speechSynthesis.resume();
        setPaused(false);
      } else {
        window.speechSynthesis.pause();
        setPaused(true);
      }
    } catch {
      stop();
    }
  }, [paused, speaking, start, supported, voicesLoaded, stop]);

  // Stop on article change (fix deps)
  useEffect(() => {
    if (!mounted) return;
    stop();
  }, [mounted, motionKey, stop]);

  // Stop if article DOM changes while speaking
  useEffect(() => {
    if (!supported || !speaking) return;

    const el = document.getElementById(targetId);
    if (!el || typeof MutationObserver === "undefined") return;

    const obs = new MutationObserver(() => {
      const text = getTextFromElement(targetId);
      const hash = String(text.length) + ":" + text.slice(0, 60);
      if (hash !== lastTextHashRef.current) stop();
    });

    obs.observe(el, { subtree: true, childList: true, characterData: true });
    return () => obs.disconnect();
  }, [speaking, stop, supported, targetId]);

  // Stop on unmount
  useEffect(() => stop, [stop]);

  const canUse = supported && voicesLoaded;
  const label = speaking ? (paused ? "Resume" : "Pause") : "Listen";

  return (
    <div className={className}>
      <button
        type="button"
        onClick={canUse ? toggle : undefined}
        disabled={!canUse}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 transition disabled:opacity-50 disabled:hover:bg-white/5"
        aria-label={label}
        title={canUse ? label : "Text-to-speech not available"}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M11 5L6 9H3v6h3l5 4V5z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M15.5 8.5a4.5 4.5 0 010 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M18 6a8 8 0 010 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
        <span>{label}</span>
      </button>

      {canUse && speaking && (
        <button
          type="button"
          onClick={stop}
          className="ml-2 inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 transition"
          aria-label="Stop"
          title="Stop"
        >
          Stop
        </button>
      )}
    </div>
  );
}
