"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { SearchPalette } from "./SearchPalette";

export function SearchButton() {
  const t = useTranslations("search");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 h-9 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-ring transition-colors"
        aria-label={t("buttonAriaLabel")}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <span className="hidden sm:inline">{t("buttonText")}</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-xs font-mono" aria-hidden="true">
          ⌘K
        </kbd>
      </button>
      <SearchPalette open={open} onClose={() => setOpen(false)} />
    </>
  );
}
