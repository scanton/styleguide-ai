"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

type Status = "idle" | "loading" | "success" | "error";

const INITIAL: FormState = { name: "", email: "", subject: "", message: "" };

export function ContactForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [status, setStatus] = useState<Status>("idle");

  const validate = (): boolean => {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.email.trim()) {
      e.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Enter a valid email address.";
    }
    if (!form.message.trim()) e.message = "Message is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("success");
        setForm(INITIAL);
        setErrors({});
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const update = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((err) => ({ ...err, [field]: undefined }));
  };

  if (status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl bg-accent/10 border border-accent/20 p-6 text-center space-y-2"
      >
        <p className="text-2xl" aria-hidden="true">✓</p>
        <p className="font-heading font-bold">Thanks — I&apos;ll be in touch.</p>
        <p className="text-sm text-muted-foreground">
          I typically reply within a couple of business days.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => setStatus("idle")}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-label="Contact form">
      {/* Name */}
      <div className="space-y-1.5">
        <label htmlFor="contact-name" className="text-sm font-medium">
          Name <span className="text-primary" aria-hidden="true">*</span>
        </label>
        <Input
          id="contact-name"
          type="text"
          value={form.name}
          onChange={update("name")}
          autoComplete="name"
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "contact-name-error" : undefined}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p id="contact-name-error" role="alert" className="text-xs text-destructive">
            {errors.name}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="contact-email" className="text-sm font-medium">
          Email <span className="text-primary" aria-hidden="true">*</span>
        </label>
        <Input
          id="contact-email"
          type="email"
          value={form.email}
          onChange={update("email")}
          autoComplete="email"
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
          className={errors.email ? "border-destructive" : ""}
        />
        {errors.email && (
          <p id="contact-email-error" role="alert" className="text-xs text-destructive">
            {errors.email}
          </p>
        )}
      </div>

      {/* Subject */}
      <div className="space-y-1.5">
        <label htmlFor="contact-subject" className="text-sm font-medium">
          Subject
        </label>
        <Input
          id="contact-subject"
          type="text"
          value={form.subject}
          onChange={update("subject")}
          placeholder="What&apos;s this about?"
        />
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <label htmlFor="contact-message" className="text-sm font-medium">
          Message <span className="text-primary" aria-hidden="true">*</span>
        </label>
        <Textarea
          id="contact-message"
          value={form.message}
          onChange={update("message")}
          rows={5}
          aria-required="true"
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          className={errors.message ? "border-destructive" : ""}
          placeholder="Tell me about your project…"
        />
        {errors.message && (
          <p id="contact-message-error" role="alert" className="text-xs text-destructive">
            {errors.message}
          </p>
        )}
      </div>

      {status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          Something went wrong. Please try again or email satoricanton@gmail.com directly.
        </p>
      )}

      <Button
        type="submit"
        className="w-full min-h-[44px]"
        disabled={status === "loading"}
        aria-busy={status === "loading"}
      >
        {status === "loading" ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
