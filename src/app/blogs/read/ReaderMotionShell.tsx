"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  motionKey: string; // change triggers transition (use post id)
  dir: "next" | "prev";
  children: ReactNode;
};

export default function ReaderMotionShell({ motionKey, dir, children }: Props) {
  const enterX = dir === "next" ? 70 : -70;
  const exitX = dir === "next" ? -70 : 70;
  const rotate = dir === "next" ? -1.4 : 1.4;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={motionKey}
        initial={{
          opacity: 0,
          x: enterX,
          scale: 0.992,
          rotateZ: rotate,
          filter: "blur(2px)",
        }}
        animate={{
          opacity: 1,
          x: 0,
          scale: 1,
          rotateZ: 0,
          filter: "blur(0px)",
        }}
        exit={{
          opacity: 0,
          x: exitX,
          scale: 0.992,
          rotateZ: -rotate,
          filter: "blur(2px)",
        }}
        transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.9 }}
        style={{
          transformStyle: "preserve-3d",
          boxShadow: "0px 28px 52px rgba(0,0,0,0.42)",
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
