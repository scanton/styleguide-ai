export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { Resend } from "resend";

interface ContactPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, email, subject, message } = body as ContactPayload;
  const TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? "satoricanton@gmail.com";

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 422 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 422 });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "StyleGuideAI <noreply@styleguideai.com>",
      to: TO_EMAIL,
      replyTo: email,
      subject: `[StyleGuideAI Contact] ${subject?.trim() || "New inquiry"}`,
      text: [
        `From: ${name} <${email}>`,
        subject ? `Subject: ${subject}` : "",
        "",
        message,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Resend error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
