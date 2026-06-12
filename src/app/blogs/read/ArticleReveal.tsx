"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function ArticleReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove("reveal-hidden");
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    // stagger delay per element index
    const targets = root.querySelectorAll<HTMLElement>(
      "section, h2, h3, .highlight, .quote, table, img, iframe"
    );
    targets.forEach((el, i) => {
      el.classList.add("reveal-hidden");
      el.style.transitionDelay = `${Math.min(i * 30, 120)}ms`;
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{children}</div>;
}
