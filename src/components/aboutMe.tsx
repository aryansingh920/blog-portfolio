/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./AboutMe.module.css";
import { ImageDP } from "./ImageDP";


export default function AboutMe() {

  return (
    <section className={styles.section} id="about">
      <div className={styles.shell}>
        <div className={styles.glass}>
          <header className={styles.header}>
            <h2 className={styles.title}>About Me</h2>
            <div className={styles.subtleLine} />
          </header>

          <div className={styles.grid}>
            <div>
              <ImageDP />
            </div>
            <div className={styles.card}>
              <p className={styles.p}>
                I am a passionate and versatile innovator with a deep-rooted
                curiosity for solving complex problems at the intersection of
                technology, data, and strategy. With a strong foundation in
                computational thinking and analytical rigor, I thrive on
                transforming abstract concepts into tangible solutions that
                drive progress and create value. My journey is fueled by a blend
                of creativity, technical expertise, and an insatiable appetite
                for learning, allowing me to navigate diverse domains and adapt
                to the ever-evolving landscape of innovation.
              </p>
            </div>
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
                and the intricate tapestry of our universe. My interests extend
                far beyond the confines of technology and finance, reaching into
                the realms of evolution, space, quantum mechanics, philosophy,
                and history—subjects that not only inspire but also shape my
                understanding of humanity’s place in the cosmos. I often find
                myself reflecting on the grand narratives of our universe, from
                the moment of the Big Bang to the evolutionary journey that led
                to conscious beings pondering their origins.
                <br />
                <br /> The interplay between the infinitely vast cosmos and the
                intricate workings of quantum particles fascinates me, as it
                bridges the macro and micro scales of existence. These
                reflections fuel my curiosity about how the fundamental
                principles of the universe can be harnessed, not just for
                technological advancements, but to answer timeless questions
                about existence itself. Space, in particular, captivates my
                imagination—not merely as a frontier of exploration but as a
                stage for humanity’s potential to transcend its limitations. I
                marvel at the sheer vastness of the cosmos and the profound
                questions it raises about life beyond Earth, the origins of
                time, and the potential for interstellar communication.
                <br />
                <br /> This fascination often finds parallels in my projects,
                like secure satellite communication protocols, where I seek to
                replicate, albeit in a small way, the seamless and dynamic
                systems that govern celestial bodies. Philosophy and history
                ground these explorations, providing a framework to connect
                abstract scientific concepts with human experience. I am
                intrigued by how ancient civilizations grappled with questions
                of purpose and existence, and how their insights echo in today’s
                scientific pursuits. The convergence of these disciplines—where
                philosophy informs science, and history illuminates the
                future—is a constant source of inspiration for me. Quantum
                mechanics, with its mind-bending principles and infinite
                possibilities, is another area where I find endless wonder.
                <br />
                <br />
                The duality of particles, the strange entanglements, and the
                non-intuitive nature of quantum reality challenge the very
                foundations of classical thinking, pushing the boundaries of
                what we understand about reality itself. My work in quantum
                machine learning and algorithmic development is deeply
                influenced by this fascination, as I strive to bring abstract
                theories into practical applications that could revolutionize
                industries. I also take great interest in the interconnectedness
                of life and the philosophical implications of evolution. From
                the simplest single-celled organisms to the emergence of
                complex, intelligent beings, I find awe in how {"nature's"}{" "}
                patterns and processes mirror the complexity and elegance of the
                systems I study and create in my work. Writing and thinking
                about these topics allow me to connect deeply with both the
                material and the immaterial—using words to explore ideas that
                lie at the intersection of science, philosophy, and the human
                condition.
                <br />
                <br />
                It is through this lens that I approach both my professional and
                personal pursuits, seeking to understand not just how things
                work but why they matter in the grand scheme of existence. For
                me, these explorations are not mere intellectual pursuits; they
                are a way to contextualize my work and my life. They remind me
                that while we may strive to solve immediate problems and push
                the boundaries of technology, we are ultimately participants in
                a much larger story—a story of evolution, discovery, and the
                enduring quest to understand our place in the universe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
