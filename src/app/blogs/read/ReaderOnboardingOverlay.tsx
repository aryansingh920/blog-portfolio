/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ONBOARDING_KEY = "blogs_reader_onboarding_v1";
const ONBOARDING_TTL_MS = 15 * 60 * 1000;

export default function ReaderOnboardingOverlay() {
  const [show, setShow] = useState(false);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, String(Date.now()));
    } catch {}
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_KEY);

      if (!raw) {
        setShow(true);
        return;
      }

      const lastSeen = Number(raw);
      const expired =
        !Number.isFinite(lastSeen) || Date.now() - lastSeen > ONBOARDING_TTL_MS;

      setShow(expired);
    } catch {
      setShow(true);
    }
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[80]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative h-full w-full flex items-center justify-center p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-130 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
              <div className="text-base font-semibold">How to navigate</div>
              <div className="mt-2 text-sm opacity-80">
                Swipe left/right on the reader (or use ← →) to go next/previous.
                Tap anywhere outside to dismiss.
              </div>

              <div className="mt-5 grid gap-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                  <div className="opacity-80">Next / Previous article</div>
                  <div className="font-semibold">← →</div>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  className="flex-1 px-4 py-3 rounded-2xl bg-white text-black font-semibold"
                  onClick={dismiss}
                >
                  Got it
                </button>
                <button
                  className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10"
                  onClick={dismiss}
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
