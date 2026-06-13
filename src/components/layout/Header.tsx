"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { MobileNav } from "./MobileNav";
import { SearchButton } from "./SearchButton";
import { UserMenu } from "./UserMenu";

const NAV_LINKS = [
  { href: "/museum", label: "Virtual Museum" },
  { href: "/articles", label: "Articles" },
  { href: "/styletarot", label: "StyleTarot" },
  { href: "/stylebear", label: "StyleBear" },
  { href: "/consulting", label: "Consulting" },
];

export function Header() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

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
      className={`sticky top-0 z-50 w-full transition-shadow duration-200 ${
        scrolled
          ? "bg-background/95 backdrop-blur-sm shadow-md"
          : "bg-background"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-lg font-bold text-primary focus-visible:outline-ring"
          aria-label="StyleGuideAI — home"
        >
          <span className="text-2xl" aria-hidden="true">✦</span>
          <span>StyleGuideAI</span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label="Main navigation"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary focus-visible:outline-ring ${
                pathname.startsWith(link.href)
                  ? "text-primary"
                  : "text-foreground/70"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <SearchButton />
          <UserMenu />
          <MobileNav links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
