import Hero from "@/components/hero/Hero";
import ExperienceSection from "@/components/experience/ExperienceSection";
import AboutMe from "@/components/aboutMe";
import SpacePageBackgroundLoader from "@/components/SpacePageBackgroundLoader";

export default function Page() {
  return (
    <main className="relative bg-black">
      <SpacePageBackgroundLoader />
      <Hero />

      {/* Experience — wrapped with nebula glow */}
      <div className="relative">
        <div className="section-nebula" />
        <div className="section-nebula-accent" />
        <ExperienceSection />
      </div>

      {/* About Me — second nebula layer */}
      <div className="relative">
        <div className="section-nebula" style={{ transform: "scaleX(-1)" }} />
        <section
          id="About Me"
          className="relative z-20 mx-auto max-w-6xl px-6 py-20 text-white"
        >
          <AboutMe />
        </section>
      </div>
    </main>
  );
}

