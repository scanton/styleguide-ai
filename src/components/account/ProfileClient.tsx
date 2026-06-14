"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ASPECT_RATIOS } from "@/lib/aspect-ratios";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  displayName: string | null;
  preferredAspectRatio: string | null;
  createdAt: string | null;
}

export function ProfileClient() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [preferredAspectRatio, setPreferredAspectRatio] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user);
          setDisplayName(data.user.displayName ?? data.user.name ?? "");
          setPreferredAspectRatio(data.user.preferredAspectRatio ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, preferredAspectRatio: preferredAspectRatio || null }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [displayName, preferredAspectRatio]);

  if (!session?.user) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Sign in to view your profile.
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground text-sm animate-pulse">Loading…</div>;
  }

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="max-w-lg mx-auto space-y-8">
      {/* Avatar + name */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 shadow-md flex-shrink-0">
          {profile?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.image} alt={profile.name ?? "Avatar"} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {(profile?.name ?? "?")[0].toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="font-bold text-lg text-foreground">{profile?.displayName ?? profile?.name ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
          {memberSince && (
            <p className="text-xs text-muted-foreground mt-0.5">Member since {memberSince}</p>
          )}
        </div>
      </div>

      {/* Display name edit */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Display Name</h2>
        <p className="text-sm text-muted-foreground">
          This name is shown in your history. Leave blank to use your Google name.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            placeholder={profile?.name ?? "Your display name"}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Display name"
          />
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saved ? "Saved!" : saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Preferred Aspect Ratio */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Preferred Aspect Ratio</h2>
        <p className="text-sm text-muted-foreground">
          StyleBear, StyleDice, and StyleTarot will include your preferred aspect ratio in generated prompts when you&apos;re signed in.
        </p>
        <div className="flex gap-3 items-end">
          <select
            value={preferredAspectRatio}
            onChange={(e) => setPreferredAspectRatio(e.target.value)}
            className="flex-1 h-11 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Preferred aspect ratio"
          >
            <option value="">No preference</option>
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar.value} value={ar.value}>{ar.label}</option>
            ))}
          </select>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saved ? "Saved!" : saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Read-only info */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h2 className="font-semibold text-foreground">Account Info</h2>
        <div className="text-sm space-y-2">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground font-medium truncate">{profile?.email ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Sign-in method</span>
            <span className="text-foreground font-medium">Google</span>
          </div>
          {memberSince && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Member since</span>
              <span className="text-foreground font-medium">{memberSince}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
