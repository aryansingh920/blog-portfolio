import Hero from "@/components/hero/Hero";
import ExperienceSection from "@/components/experience/ExperienceSection";
import AboutMe from "@/components/aboutMe";
import WhiteHoleEnding from "@/components/WhiteHoleEnding";

function SpaceDivider() {
  const asteroids = [
    { left: "8%",  top: "40%", size: 2, dur: "9s",  delay: "0s",   dx: "110px",  dy: "-30px", rot: "160deg" },
    { left: "22%", top: "65%", size: 1.5, dur: "7s", delay: "1.2s", dx: "80px",  dy: "20px",  rot: "220deg" },
    { left: "38%", top: "30%", size: 2.5, dur: "11s", delay: "0.4s", dx: "140px", dy: "-45px", rot: "100deg" },
    { left: "55%", top: "55%", size: 1, dur: "8s",  delay: "2s",   dx: "60px",  dy: "30px",  rot: "300deg" },
    { left: "70%", top: "25%", size: 2, dur: "10s", delay: "0.8s", dx: "120px", dy: "-25px", rot: "200deg" },
    { left: "85%", top: "70%", size: 1.5, dur: "6s", delay: "1.6s", dx: "70px",  dy: "15px",  rot: "130deg" },
  ];

  return (
    <div className="space-divider" aria-hidden>
      {asteroids.map((a, i) => (
        <div
          key={i}
          className="asteroid"
          style={{
            left: a.left,
            top: a.top,
            width: a.size,
            height: a.size,
            "--dur": a.dur,
            "--delay": a.delay,
            "--dx": a.dx,
            "--dy": a.dy,
            "--rot": a.rot,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <main className="relative bg-black">
      {/* The Hero mounts the persistent BlackHoleScene as a fixed 3D backdrop
          that drives the scroll story across every section below. */}
      <Hero />

      <div className="relative">
        <div className="section-nebula" />
        <div className="section-nebula-accent" />
        <ExperienceSection />
      </div>

      <SpaceDivider />

      <div className="relative">
        <div className="section-nebula" style={{ transform: "scaleX(-1)" }} />
        <section
          id="About Me"
          className="relative z-20 mx-auto max-w-6xl px-6 py-20 text-white"
        >
          <AboutMe />
        </section>
      </div>

      {/* The White Hole — final climax. As the user scrolls in, a brilliant
          point of light explodes into a generative nebula, marking emergence
          on the other side of the singularity. Includes a "transmit" CTA. */}
      <WhiteHoleEnding />
    </main>
  );
}

