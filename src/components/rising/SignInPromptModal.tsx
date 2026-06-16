"use client";
import { signIn } from "next-auth/react";
import { X } from "lucide-react";
import { savePendingShare, type PendingShare } from "@/lib/session-restore";

interface Props {
  pendingShare: PendingShare;
  onClose: () => void;
}

export function SignInPromptModal({ pendingShare, onClose }: Props) {
  function handleSignIn() {
    savePendingShare(pendingShare);
    // pathname only — full URLs are rejected by Auth.js as open-redirect protection
    signIn("google", { callbackUrl: window.location.pathname });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 space-y-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 transition-colors">
          <X size={20} />
        </button>

        <div>
          <h2 className="font-bold text-stone-900 text-2xl">Sign in to unlock everything</h2>
          <p className="text-stone-500 text-sm mt-1">Free with your Google account — takes 10 seconds.</p>
        </div>

        <ul className="space-y-3">
          {[
            "Upload your AI renders to the Rising community gallery",
            "Prompt history saved automatically (StyleBear, StyleTarot, StyleDice & Museum)",
            "Site preferences synced across devices (preferred aspect ratio, etc.)",
            "Like and engage with the community's art in Rising",
          ].map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <span className="mt-0.5 text-[oklch(0.42_0.22_285)] font-bold text-lg leading-none">✓</span>
              <span className="text-stone-700 text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-stone-400 bg-stone-50 rounded-lg px-4 py-3">
          Your current prompt will be saved — you&apos;ll be taken right back to share it after signing in.
        </p>

        <button
          onClick={handleSignIn}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm bg-[oklch(0.42_0.22_285)] hover:opacity-90 transition-opacity"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
