import type { Metadata } from "next";
import { ContactForm } from "@/components/consulting/ContactForm";
import { ServicesSection } from "@/components/consulting/ServicesSection";

export const metadata: Metadata = {
  title: "AI & Art Consulting",
  description:
    "Satori Canton offers consulting on AI model training, art direction, and AI agent design. Head of AI at HeartStamp, founder of StyleGuideAI.",
};

export default function ConsultingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 md:py-24 space-y-20">
      {/* Header */}
      <section aria-labelledby="consulting-heading" className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            Available for engagements
          </div>
          <h1
            id="consulting-heading"
            className="font-heading text-4xl font-bold sm:text-5xl leading-tight"
          >
            AI &amp; Art
            <br />
            Consulting
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-md">
            Head of AI at HeartStamp. Founder of StyleGuideAI. Author of 300+ articles on art history and AI art. I help teams build AI-powered creative systems that actually work.
          </p>

          {/* Past clients — hidden until ready to publish */}
          <div className="pt-4 space-y-3 hidden">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Past clients include
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { name: "Zynga", desc: "Social game company" },
                { name: "CivitAI", desc: "Open image model platform" },
                { name: "HeartStamp", desc: "AI greeting cards" },
                { name: "PicRenew", desc: "AI photo restoration" },
                { name: "Playground", desc: "AI image generation platform" },
              ].map((c) => (
                <div
                  key={c.name}
                  className="rounded-xl border border-border bg-card px-4 py-2.5 flex flex-col"
                >
                  <span className="font-heading font-bold text-sm">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact form */}
        <div
          id="contact"
          className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6"
        >
          <div className="space-y-1">
            <h2 className="font-heading font-bold text-xl">Get in touch</h2>
            <p className="text-sm text-muted-foreground">
              Tell me about your project. I&apos;ll reply within a couple of days.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* Services */}
      <ServicesSection />
    </div>
  );
}
