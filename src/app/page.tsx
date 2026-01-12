import Hero from "@/components/hero/Hero";
import ExperienceSection from "@/components/experience/ExperienceSection";
import AboutMe from "@/components/aboutMe";
export default function Page() {
  return (
    <main className="relative bg-black">
      <Hero />

      {/* Experience first */}
      <ExperienceSection />

      {/* Keep these for later */}
      {/* <section
        id="skills"
        className="relative z-20 mx-auto max-w-6xl px-6 py-20 text-white"
      >
        <h2 className="text-2xl font-semibold">Skills</h2>
      </section> */}

      <section
        id="About Me"
        className="relative z-20 mx-auto max-w-6xl px-6 py-20 text-white"
      >
        <AboutMe/>
      </section>
    </main>
  );
}
