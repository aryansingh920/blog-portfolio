import Hero from "@/components/hero/Hero";
export default function Page() {
  return (
    <main className="relative bg-black">
      <Hero />
      <section
        id="projects"
        className="relative z-20 mx-auto max-w-6xl px-6 py-20 text-white"
      >
        <h2 className="text-2xl font-semibold">Projects</h2>
      </section>
      <section
        id="contact"
        className="relative z-20 mx-auto max-w-6xl px-6 py-20 text-white"
      >
        <h2 className="text-2xl font-semibold">Contact</h2>
      </section>
    </main>
  );
}
