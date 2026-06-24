"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ASPECT_RATIOS } from "@/lib/aspect-ratios";
import { locales, localeNames } from "@/i18n/routing";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  displayName: string | null;
  preferredAspectRatio: string | null;
  preferredLanguage: string | null;
  createdAt: string | null;
}

export function ProfileClient() {
  const { data: session } = useSession();
  const t = useTranslations("account");
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [preferredAspectRatio, setPreferredAspectRatio] = useState<string>("");
  const [preferredLanguage, setPreferredLanguage] = useState<string>("");
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
          setPreferredLanguage(data.user.preferredLanguage ?? "");
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
        body: JSON.stringify({
          displayName,
          preferredAspectRatio: preferredAspectRatio || null,
          preferredLanguage: preferredLanguage || null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // If a language was selected, switch the UI immediately
      if (preferredLanguage) {
        router.replace("/account/profile", { locale: preferredLanguage });
      }
    } finally {
      setSaving(false);
    }
  }, [displayName, preferredAspectRatio, preferredLanguage, router]);

  if (!session?.user) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        {t("signInRequiredProfile")}
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
            <p className="text-xs text-muted-foreground mt-0.5">{t("memberSinceLabel")}: {memberSince}</p>
          )}
        </div>
      </div>

      {/* Display name edit */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground">{t("displayName")}</h2>
        <p className="text-sm text-muted-foreground">{t("displayNameHint")}</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            placeholder={profile?.name ?? t("displayNamePlaceholder")}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={t("displayName")}
          />
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saved ? t("saved") : saving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>

      {/* Preferred Aspect Ratio */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground">{t("preferredRatio")}</h2>
        <p className="text-sm text-muted-foreground">{t("preferredRatioHint")}</p>
        <div className="flex gap-3 items-end">
          <select
            value={preferredAspectRatio}
            onChange={(e) => setPreferredAspectRatio(e.target.value)}
            className="flex-1 h-11 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={t("preferredRatio")}
          >
            <option value="">{t("noPreference")}</option>
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar.value} value={ar.value}>{ar.label}</option>
            ))}
          </select>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saved ? t("saved") : saving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>

      {/* Preferred Language */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground">{t("preferredLanguage")}</h2>
        <p className="text-sm text-muted-foreground">{t("preferredLanguageHint")}</p>
        <div className="flex gap-3 items-end">
          <select
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className="flex-1 h-11 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={t("preferredLanguage")}
          >
            <option value="">{t("noPreference")}</option>
            {locales.map((l) => (
              <option key={l} value={l}>{localeNames[l]}</option>
            ))}
          </select>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saved ? t("saved") : saving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>

      {/* Read-only info */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h2 className="font-semibold text-foreground">{t("accountInfo")}</h2>
        <div className="text-sm space-y-2">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t("emailLabel")}</span>
            <span className="text-foreground font-medium truncate">{profile?.email ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t("signInMethodLabel")}</span>
            <span className="text-foreground font-medium">Google</span>
          </div>
          {memberSince && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("memberSinceLabel")}</span>
              <span className="text-foreground font-medium">{memberSince}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
