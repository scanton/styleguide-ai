"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap } from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { Link, usePathname } from "@/i18n/navigation";
import { MobileNav } from "./MobileNav";
import { SearchButton } from "./SearchButton";
import { UserMenu } from "./UserMenu";
import { LanguageSelector } from "./LanguageSelector";

export function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isDark = pathname === "/rising";
  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const NAV_LINKS = [
    { href: "/rising" as const, label: t("rising") },
    { href: "/museum" as const, label: t("museum") },
    { href: "/articles" as const, label: t("articles") },
    { href: "/styletarot" as const, label: t("styletarot") },
    { href: "/stylebear" as const, label: t("stylebear") },
    { href: "/consulting" as const, label: t("consulting") },
  ];

  useEffect(() => {
    if (!headerRef.current) return;
    if (!prefersReducedMotion()) {
      gsap.from(headerRef.current, {
        y: -80,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
      });
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 w-full transition-colors duration-700 ${
        isDark
          ? scrolled
            ? "bg-stone-950/95 backdrop-blur-sm shadow-md shadow-black/40"
            : "bg-stone-950"
          : scrolled
          ? "bg-background/95 backdrop-blur-sm shadow-md"
          : "bg-background"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link
          href="/"
          className={`flex items-center gap-2 font-heading text-lg font-bold transition-colors duration-700 focus-visible:outline-ring ${
            isDark ? "text-purple-400" : "text-primary"
          }`}
          aria-label={t("homeAriaLabel")}
        >
          <span className="text-2xl" aria-hidden="true">✦</span>
          <span>StyleGuideAI</span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label={t("mainNav")}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname.startsWith(link.href) ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors duration-700 focus-visible:outline-ring ${
                isDark
                  ? pathname.startsWith(link.href)
                    ? "text-purple-400"
                    : "text-stone-300 hover:text-purple-400"
                  : pathname.startsWith(link.href)
                  ? "text-primary"
                  : "text-foreground/70 hover:text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <SearchButton />
          <LanguageSelector />
          <UserMenu />
          <MobileNav links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
