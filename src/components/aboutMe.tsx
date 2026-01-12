/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./AboutMe.module.css";

function useTypewriter(text: string, cps = 35, startDelayMs = 250) {
  const [out, setOut] = useState("");

  useEffect(() => {
    let i = 0;
    let raf = 0;
    let timeout: any;

    const start = () => {
      const tick = () => {
        // add 1 char per frame based on cps
        // convert cps (chars/sec) -> ms per char
        const msPerChar = 1000 / Math.max(1, cps);
        // append one char per tick, but schedule via RAF for smoothness
        setOut(text.slice(0, i + 1));
        i++;
        if (i < text.length) {
          timeout = setTimeout(() => {
            raf = requestAnimationFrame(tick);
          }, msPerChar);
        }
      };

      raf = requestAnimationFrame(tick);
    };

    setOut("");
    timeout = setTimeout(start, Math.max(0, startDelayMs));

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [text, cps, startDelayMs]);

  return out;
}

export default function AboutMe() {
  const introText = useMemo(
    () => `I am a passionate and versatile innovator with a deep-rooted
curiosity for solving complex problems at the intersection of
technology, data, and strategy. With a strong foundation in
computational thinking and analytical rigor, I thrive on
transforming abstract concepts into tangible solutions that drive
progress and create value. My journey is fueled by a blend of
creativity, technical expertise, and an insatiable appetite for
learning, allowing me to navigate diverse domains and adapt to the
ever-evolving landscape of innovation.`,
    []
  );

  const typedIntro = useTypewriter(introText, 40, 200);

  return (
    <section className={styles.section} id="about">
      <div className={styles.shell}>
        <div className={styles.glass}>
          <header className={styles.header}>
            <h2 className={styles.title}>About Me</h2>
            <div className={styles.subtleLine} />
          </header>

          <p className={styles.typed}>
            {typedIntro}
            <span className={styles.caret} aria-hidden="true" />
          </p>

          <div className={styles.grid}>
            <div className={styles.card}>
              <h3 className={styles.h3}>Professional Background</h3>
              <p className={styles.p}>
                I have honed my skills through diverse professional roles,
                including internships at renowned organizations such as Novade,
                Samsung PRISM, Chennai Metro Rails Limited, Infosys, Nucash, and
                Edue Limited. These experiences equipped me with a deep
                understanding of full-stack and iOS development, algorithms,
                cloud services, and DevOps. As the CTO & Co-Founder of Canverro,
                I spearheaded innovative solutions that bridged gaps in
                technology, driving meaningful impact.
              </p>
            </div>

            <div className={styles.card}>
              <h3 className={styles.h3}>Research and Innovations</h3>
              <p className={styles.p}>
                I am deeply passionate about exploring intersections of quantum
                computing and finance. My dissertation on Quantum Machine
                Learning (QML) delves into leveraging quantum algorithms for
                financial modeling, showcasing my ability to apply cutting-edge
                research to industry challenges. Notably, I’ve devised a method
                that uses qudits and Grover’s algorithm to break hash functions
                in linear time, demonstrating my knack for tackling complex
                computational problems with creative solutions.
              </p>
            </div>

            <div className={styles.card}>
              <h3 className={styles.h3}>Investment Insights</h3>
              <p className={styles.p}>
                I am equally fascinated by financial markets, with a focus on
                investment strategies and quantitative analysis. I’ve analyzed
                U.S. stocks like ServiceNow and Paycom Software, exploring
                valuation metrics such as Price-to-Earnings ratios, and I
                actively identify growth opportunities in small-cap companies
                with promising revenue potential.
              </p>
            </div>

            <div className={styles.cardWide}>
              <h3 className={styles.h3}>Beyond the Professional Sphere</h3>
              <p className={styles.p}>
                Outside the realm of my technical and professional endeavors, I
                immerse myself in exploring the profound mysteries of existence
                and the intricate tapestry of our universe... (keep your long
                paragraph here as-is)
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
