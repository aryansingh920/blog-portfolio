/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { sendPortfolioRequest } from "@/api/sendPortfolioRequest";
import { Github, Linkedin, Mail } from "lucide-react";
import Link from "next/link";

type FormState = {
  name: string;
  email: string;
  phone: string;
  inquiry: string;
};

export default function ContactPage() {
  const [form, setForm] = React.useState<FormState>({
    name: "",
    email: "",
    phone: "",
    inquiry: "",
  });

  const [status, setStatus] = React.useState<
    | { state: "idle" }
    | { state: "sending" }
    | { state: "success"; message: string }
    | { state: "error"; message: string }
  >({ state: "idle" });

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const inquiry = form.inquiry.trim();

    if (name.length < 2) {
      setStatus({
        state: "error",
        message: "Name must be at least 2 characters.",
      });
      return;
    }
    if (!isValidEmail(email)) {
      setStatus({ state: "error", message: "Enter a valid email address." });
      return;
    }
    if (inquiry.length < 10) {
      setStatus({
        state: "error",
        message: "Inquiry must be at least 10 characters.",
      });
      return;
    }

    setStatus({ state: "sending" });

    const controller = new AbortController();

    try {
      await sendPortfolioRequest(
        {
          name,
          email,
          phone: phone || undefined,
          inquiry,
        },
        { signal: controller.signal },
      );

      setStatus({
        state: "success",
        message: "Sent. I’ll get back to you.",
      });
      setForm({ name: "", email: "", phone: "", inquiry: "" });
    } catch (err: any) {
      if (err?.name === "AbortError") return;

      setStatus({
        state: "error",
        message: err?.message || "Something broke. Try again.",
      });
    }
  }

  const sending = status.state === "sending";

  const statusText =
    status.state === "error"
      ? status.message
      : status.state === "success"
        ? status.message
        : "Response time depends on workload.";

  const statusStyle =
    status.state === "error"
      ? "border-red-500/20 bg-red-500/10 text-red-200"
      : status.state === "success"
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
        : "border-white/10 bg-white/5 text-white/60";

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden">
      {/* subtle background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/[0.06] blur-3xl" />
        <div className="absolute bottom-[-280px] right-[-220px] h-[520px] w-[520px] rounded-full bg-white/[0.04] blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-transparent" />
      </div>

      <div className="relative max-w-5xl mx-auto p-4 md:p-6 flex flex-col items-center">
        <h1 className="text-3xl md:text-5xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600 text-center font-sans font-bold mt-10 md:mt-16 lg:mt-24">
          Connect With me Here!
        </h1>

        <div className="w-full mt-8 md:mt-10 mb-14">
          <div className="mx-auto max-w-4xl">
            {/* gradient border wrapper */}
            <div className="rounded-[28px] p-[1px] bg-gradient-to-b from-white/15 via-white/5 to-transparent">
              <div className="rounded-[28px] border border-white/10 bg-black/40 backdrop-blur-xl shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)]">
                <div className="p-6 md:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs tracking-[0.35em] text-white/50">
                        INQUIRY
                      </div>
                      <h2 className="mt-2 text-xl md:text-2xl font-semibold text-white/90">
                        Send a message
                      </h2>
                      <p className="mt-1 text-sm text-white/55">
                        Context + timeline. If it’s a fit, I’ll reply.
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${statusStyle}`}
                      >
                        {statusText}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={onSubmit} className="mt-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field
                        label="Name"
                        hint="Your full name"
                        disabled={sending}
                      >
                        <input
                          name="name"
                          value={form.name}
                          onChange={onChange}
                          placeholder="Aryan Singh"
                          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white/90 placeholder:text-white/25 outline-none focus:border-white/25 focus:ring-4 focus:ring-white/10"
                          autoComplete="name"
                          disabled={sending}
                        />
                      </Field>

                      <Field
                        label="Email"
                        hint="Where I should reply"
                        disabled={sending}
                      >
                        <input
                          name="email"
                          value={form.email}
                          onChange={onChange}
                          placeholder="you@company.com"
                          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white/90 placeholder:text-white/25 outline-none focus:border-white/25 focus:ring-4 focus:ring-white/10"
                          autoComplete="email"
                          disabled={sending}
                        />
                      </Field>

                      <div className="md:col-span-2">
                        <Field
                          label={
                            <span>
                              Phone{" "}
                              <span className="text-white/30">(optional)</span>
                            </span>
                          }
                          hint="Useful if email goes to spam"
                          disabled={sending}
                        >
                          <input
                            name="phone"
                            value={form.phone}
                            onChange={onChange}
                            placeholder="+353 ..."
                            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white/90 placeholder:text-white/25 outline-none focus:border-white/25 focus:ring-4 focus:ring-white/10"
                            autoComplete="tel"
                            disabled={sending}
                          />
                        </Field>
                      </div>

                      <div className="md:col-span-2">
                        <Field
                          label="Inquiry"
                          hint="What do you need? What’s the deadline?"
                          disabled={sending}
                        >
                          <textarea
                            name="inquiry"
                            value={form.inquiry}
                            onChange={onChange}
                            placeholder="Project summary, scope, timeline, budget (if any)."
                            className="min-h-[160px] w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white/90 placeholder:text-white/25 outline-none focus:border-white/25 focus:ring-4 focus:ring-white/10"
                            disabled={sending}
                          />
                        </Field>
                      </div>
                    </div>

                    {/* mobile status */}
                    <div className="md:hidden">
                      <div
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${statusStyle}`}
                      >
                        {statusText}
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-1">
                      <div className="text-xs text-white/40">
                        No spam. No nonsense.
                      </div>

                      <button
                        type="submit"
                        disabled={sending}
                        className="relative inline-flex w-full md:w-auto items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-6 py-3 text-sm font-semibold text-white/90 shadow-sm transition hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent opacity-0 transition-opacity hover:opacity-100" />
                        <span className="relative">
                          {sending ? "Sending..." : "Send message"}
                        </span>
                      </button>
                    </div>

                    <div className="pt-1 text-xs text-white/35">
                      By sending, you’re okay with me using your details to
                      reply. Nothing else.
                    </div>
                  </form>

                  <div className="mt-3 text-xs text-white/40">
                    For more information regarding the services visit my{" "}
                    <Link
                      style={{
                        color: "blue",
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                      href="https://portfolio.aryan-singh.online"
                    >
                      <u>Portfolio</u>
                    </Link>
                  </div>
                  {/* ICONS BELOW FORM */}
                  <div className="mt-6 pt-5 border-t border-white/10">
                    <div className="flex items-center justify-center gap-3">
                      <a
                        href="https://www.linkedin.com/in/aryan-singh-axone125/"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="LinkedIn"
                        title="LinkedIn"
                        className={[
                          "relative inline-flex items-center justify-center",
                          "h-11 w-11 rounded-full",
                          "border border-white/12",
                          "bg-gradient-to-b from-white/10 to-white/5",
                          "shadow-[0_10px_34px_rgba(0,0,0,0.45)]",
                          "ring-1 ring-white/10 hover:ring-white/20",
                          "text-white/85 hover:text-white",
                          "transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]",
                        ].join(" ")}
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_22px_rgba(120,160,255,0.18)] opacity-0 hover:opacity-100 transition"
                        />
                        <span className="relative">
                          <Linkedin size={18} />
                        </span>
                      </a>

                      <a
                        href="mailto:aryansingh920@outlook.com"
                        aria-label="Email"
                        title="Email"
                        className={[
                          "relative inline-flex items-center justify-center",
                          "h-11 w-11 rounded-full",
                          "border border-white/12",
                          "bg-gradient-to-b from-white/10 to-white/5",
                          "shadow-[0_10px_34px_rgba(0,0,0,0.45)]",
                          "ring-1 ring-white/10 hover:ring-white/20",
                          "text-white/85 hover:text-white",
                          "transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]",
                        ].join(" ")}
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_22px_rgba(120,160,255,0.18)] opacity-0 hover:opacity-100 transition"
                        />
                        <span className="relative">
                          <Mail size={18} />
                        </span>
                      </a>

                      <a
                        href="https://github.com/aryansingh920"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="GitHub"
                        title="GitHub"
                        className={[
                          "relative inline-flex items-center justify-center",
                          "h-11 w-11 rounded-full",
                          "border border-white/12",
                          "bg-gradient-to-b from-white/10 to-white/5",
                          "shadow-[0_10px_34px_rgba(0,0,0,0.45)]",
                          "ring-1 ring-white/10 hover:ring-white/20",
                          "text-white/85 hover:text-white",
                          "transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]",
                        ].join(" ")}
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_22px_rgba(120,160,255,0.18)] opacity-0 hover:opacity-100 transition"
                        />
                        <span className="relative">
                          <Github size={18} />
                        </span>
                      </a>
                    </div>

                    <div className="mt-3 text-center text-xs text-white/40">
                      Or reach out directly.
                    </div>
                  </div>
                  {/* /ICONS BELOW FORM */}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* nothing else here */}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  disabled,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={disabled ? "opacity-90" : ""}>
      <div className="flex items-end justify-between gap-3 mb-2">
        <label className="block text-xs font-medium text-white/70">
          {label}
        </label>
        {hint ? (
          <span className="text-[11px] text-white/35">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
