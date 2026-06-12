import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "StyleGuideAI privacy policy — how we collect and use your data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:py-24 space-y-10">
      <header className="space-y-3">
        <h1 className="font-heading text-4xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: June 11, 2026
        </p>
      </header>

      <div className="prose prose-neutral max-w-none space-y-8 text-muted-foreground">

        <section aria-labelledby="overview-heading" className="space-y-3">
          <h2 id="overview-heading" className="font-heading text-xl font-bold text-foreground">
            Overview
          </h2>
          <p>
            StyleGuideAI (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;the site&rdquo;) is operated by Satori Canton. This Privacy Policy explains how we collect, use, and protect information when you visit styleGuideAI.com and use our tools and features.
          </p>
          <p>
            We keep data collection minimal. We do not sell your personal data. We do not run advertising.
          </p>
        </section>

        <section aria-labelledby="collect-heading" className="space-y-3">
          <h2 id="collect-heading" className="font-heading text-xl font-bold text-foreground">
            Information We Collect
          </h2>

          <h3 className="font-semibold text-foreground">Account information (optional)</h3>
          <p>
            If you choose to sign in with Google, we receive your name, email address, and profile picture from Google. This information is stored in our database and used only to power account features such as saving your StyleBear prompt history. Sign-in is never required to use any feature on the site.
          </p>

          <h3 className="font-semibold text-foreground">Contact form submissions</h3>
          <p>
            When you use the contact form on the Consulting page, we collect your name, email address, optional subject, and message text. This information is sent by email to Satori Canton and is used solely to respond to your inquiry. We do not store contact form submissions in our database.
          </p>

          <h3 className="font-semibold text-foreground">Usage data</h3>
          <p>
            We may collect basic, anonymized analytics about site usage (pages visited, browser type, approximate location by country). This is used to understand how the site is being used and to improve it. We do not use tracking pixels or third-party advertising trackers.
          </p>
        </section>

        <section aria-labelledby="use-heading" className="space-y-3">
          <h2 id="use-heading" className="font-heading text-xl font-bold text-foreground">
            How We Use Your Information
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and improve our tools and features</li>
            <li>To save your StyleBear prompt history (authenticated users only)</li>
            <li>To respond to consulting inquiries submitted via the contact form</li>
            <li>To understand aggregate site usage patterns</li>
          </ul>
          <p>We do not use your information for advertising, profiling, or sale to third parties.</p>
        </section>

        <section aria-labelledby="thirdparty-heading" className="space-y-3">
          <h2 id="thirdparty-heading" className="font-heading text-xl font-bold text-foreground">
            Third-Party Services
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Google OAuth</strong> — used for optional sign-in. Google&apos;s privacy policy applies to data shared via OAuth.
            </li>
            <li>
              <strong className="text-foreground">OpenRouter</strong> — our AI prompt generation tools send your inputs to OpenRouter&apos;s API to generate responses. Inputs are processed server-side and not stored beyond the request.
            </li>
            <li>
              <strong className="text-foreground">Resend</strong> — used to deliver contact form emails. Submission data is transmitted through Resend&apos;s email infrastructure.
            </li>
            <li>
              <strong className="text-foreground">Vercel</strong> — our hosting provider. Standard server logs may be retained per Vercel&apos;s data policy.
            </li>
          </ul>
        </section>

        <section aria-labelledby="cookies-heading" className="space-y-3">
          <h2 id="cookies-heading" className="font-heading text-xl font-bold text-foreground">
            Cookies
          </h2>
          <p>
            We use a session cookie to maintain your sign-in state if you choose to authenticate with Google. This cookie is essential for the sign-in feature to work and is not used for tracking. We do not use advertising or third-party tracking cookies.
          </p>
        </section>

        <section aria-labelledby="rights-heading" className="space-y-3">
          <h2 id="rights-heading" className="font-heading text-xl font-bold text-foreground">
            Your Rights
          </h2>
          <p>
            You may request deletion of your account and associated data at any time by emailing{" "}
            <a
              href="mailto:satoricanton@gmail.com"
              className="text-primary hover:underline focus-visible:outline-ring rounded"
            >
              satoricanton@gmail.com
            </a>
            . We will delete your account and any personally identifiable information within 30 days.
          </p>
          <p>
            If you are in the European Economic Area (EEA), you have rights under the GDPR including the right to access, correct, and delete your data. Contact us at the email above to exercise these rights.
          </p>
        </section>

        <section aria-labelledby="contact-heading" className="space-y-3">
          <h2 id="contact-heading" className="font-heading text-xl font-bold text-foreground">
            Contact
          </h2>
          <p>
            Questions about this Privacy Policy? Email{" "}
            <a
              href="mailto:satoricanton@gmail.com"
              className="text-primary hover:underline focus-visible:outline-ring rounded"
            >
              satoricanton@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
