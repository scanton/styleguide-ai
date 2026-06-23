"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const t = useTranslations("userMenu");
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  if (status === "loading") return <div className="w-8 h-8" />;

  if (!session?.user) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => signIn("google")}
        className="hidden sm:flex min-h-[36px]"
      >
        {t("signIn")}
      </Button>
    );
  }

  const displayName = session.user.name ?? session.user.email ?? "Account";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={wrapperRef} onKeyDown={handleKeyDown}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t("openMenu")}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden border-2 border-transparent hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
      >
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={displayName}
            width={36}
            height={36}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-background shadow-xl py-1 z-50"
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
            {session.user.email && (
              <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
            )}
          </div>

          <Link
            href="/account/history"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:bg-muted"
          >
            <span aria-hidden="true">📋</span> {t("history")}
          </Link>
          <Link
            href="/account/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:bg-muted"
          >
            <span aria-hidden="true">👤</span> {t("profile")}
          </Link>

          <div className="border-t border-border mt-1 pt-1">
            <button
              role="menuitem"
              onClick={() => { setOpen(false); signOut(); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:bg-muted text-left"
            >
              <span aria-hidden="true">↩</span> {t("signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
