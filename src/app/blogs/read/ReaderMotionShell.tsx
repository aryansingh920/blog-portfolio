"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  motionKey: string;
  dir: "next" | "prev";
  children: ReactNode;
};

export default function ReaderMotionShell({ motionKey, dir, children }: Props) {
  const enterX = dir === "next" ? 90 : -90;
  const exitX = dir === "next" ? -60 : 60;
  const enterRotate = dir === "next" ? -2.5 : 2.5;
  const exitRotate = dir === "next" ? 1.5 : -1.5;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={motionKey}
        initial={{
          opacity: 0,
          x: enterX,
          y: 12,
          scale: 0.988,
          rotateZ: enterRotate,
          filter: "blur(3px)",
        }}
        animate={{
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          rotateZ: 0,
          filter: "blur(0px)",
        }}
        exit={{
          opacity: 0,
          x: exitX,
          y: -8,
          scale: 0.988,
          rotateZ: exitRotate,
          filter: "blur(2px)",
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 28,
          mass: 0.85,
          opacity: { duration: 0.22 },
          filter: { duration: 0.25 },
        }}
        style={{
          transformStyle: "preserve-3d",
          boxShadow: "0px 32px 64px rgba(0,0,0,0.5), 0px 0px 0px 1px rgba(255,255,255,0.04)",
          borderRadius: "1.5rem",
          overflow: "hidden",
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
