"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type OrderItem = { id: number; slug: string };

type SwipeReaderNavProps = {
  order: OrderItem[];
  initialIndex: number;
};

const SWIPE_X_PX = 90;
const SWIPE_VEL = 0.35;

export default function SwipeReaderNav({
  order,
  initialIndex,
}: SwipeReaderNavProps) {
  const router = useRouter();
  const sp = useSearchParams();

  const n = order.length;

  const mod = useCallback((x: number) => (n <= 0 ? 0 : ((x % n) + n) % n), [n]);

  const iRaw = sp.get("i");
  const curI = mod(Number.isFinite(Number(iRaw)) ? Number(iRaw) : initialIndex);


  const go = useCallback(
    (nextI: number, dir: "next" | "prev") => {
      if (!n) return;

      const idx = mod(nextI);
      const next = order[idx];

      const params = new URLSearchParams(sp.toString());
      params.set("i", String(idx));
      params.set("id", String(next.id));
      params.set("name", next.slug);
      params.set("dir", dir);

      router.push(`/blogs/read?${params.toString()}`, { scroll: true });
    },
    [mod, n, order, router, sp]
  );

  const startX = useRef(0);
  const startY = useRef(0);
  const startT = useRef(0);
  const tracking = useRef(false);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      tracking.current = true;
      startX.current = e.clientX;
      startY.current = e.clientY;
      startT.current = performance.now();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!tracking.current) return;
      tracking.current = false;

      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;
      const dt = Math.max(1, performance.now() - startT.current);

      // keep vertical scroll normal
      if (Math.abs(dy) > Math.abs(dx) * 1.2) return;

      const vel = Math.abs(dx) / dt;
      if (Math.abs(dx) < SWIPE_X_PX && vel < SWIPE_VEL) return;

      if (dx < 0) go(curI + 1, "next"); // swipe left -> next
      else go(curI - 1, "prev"); // swipe right -> prev
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointerup", onPointerUp, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, [curI, go]);

  return null;
}
