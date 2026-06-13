"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { gsap } from "gsap";
import { prefersReducedMotion } from "@/lib/motion";

interface NavLink {
  href: string;
  label: string;
}

export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const drawer = drawerRef.current;
    const overlay = overlayRef.current;
    if (!drawer || !overlay) return;

    if (open) {
      overlay.style.display = "block";
      drawer.style.display = "flex";
      if (prefersReducedMotion()) {
        gsap.set(overlay, { opacity: 1 });
        gsap.set(drawer, { x: 0 });
      } else {
        gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        gsap.fromTo(drawer, { x: "100%" }, { x: 0, duration: 0.3, ease: "power2.out" });
      }
      document.body.style.overflow = "hidden";
    } else {
      const duration = prefersReducedMotion() ? 0 : 0.2;
      gsap.to(overlay, { opacity: 0, duration, onComplete: () => { overlay.style.display = "none"; } });
      gsap.to(drawer, { x: "100%", duration, ease: "power2.in", onComplete: () => { drawer.style.display = "none"; } });
      document.body.style.overflow = "";
    }
  }, [open]);

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        className="md:hidden flex flex-col justify-center items-center w-11 h-11 gap-1.5 rounded-md focus-visible:outline-ring"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
      >
        <span className={`block h-0.5 w-6 bg-foreground transition-transform duration-200 ${open ? "translate-y-2 rotate-45" : ""}`} />
        <span className={`block h-0.5 w-6 bg-foreground transition-opacity duration-200 ${open ? "opacity-0" : ""}`} />
        <span className={`block h-0.5 w-6 bg-foreground transition-transform duration-200 ${open ? "-translate-y-2 -rotate-45" : ""}`} />
      </button>

      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 bg-black/50 hidden md:hidden"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        className="fixed top-0 right-0 z-50 h-full w-72 flex-col bg-background shadow-2xl hidden md:hidden"
        role="dialog"
        aria-label="Mobile navigation"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <span className="font-heading font-bold text-primary text-lg">Menu</span>
          <button
            onClick={() => setOpen(false)}
            className="w-11 h-11 flex items-center justify-center rounded-md text-foreground/70 hover:text-foreground focus-visible:outline-ring"
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-4 py-3 text-base font-medium min-h-[44px] flex items-center transition-colors hover:bg-muted focus-visible:outline-ring ${
                pathname.startsWith(link.href) ? "text-primary bg-muted" : "text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Account section */}
          <div className="mt-2 pt-2 border-t border-border space-y-0.5">
            {session?.user ? (
              <>
                <Link
                  href="/account/history"
                  className="rounded-md px-4 py-3 text-base font-medium min-h-[44px] flex items-center gap-2 transition-colors hover:bg-muted focus-visible:outline-ring text-foreground"
                >
                  📋 My History
                </Link>
                <Link
                  href="/account/profile"
                  className="rounded-md px-4 py-3 text-base font-medium min-h-[44px] flex items-center gap-2 transition-colors hover:bg-muted focus-visible:outline-ring text-foreground"
                >
                  👤 Profile
                </Link>
                <button
                  onClick={() => { setOpen(false); signOut(); }}
                  className="w-full rounded-md px-4 py-3 text-base font-medium min-h-[44px] flex items-center gap-2 transition-colors hover:bg-muted focus-visible:outline-ring text-foreground text-left"
                >
                  ↩ Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => { setOpen(false); signIn("google"); }}
                className="w-full rounded-md px-4 py-3 text-base font-medium min-h-[44px] flex items-center transition-colors hover:bg-muted focus-visible:outline-ring text-primary text-left"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
