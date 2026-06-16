"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  const isDark = pathname === "/rising";

  return (
    <footer
      className={`border-t transition-colors duration-700 ${
        isDark ? "bg-stone-950 border-stone-800" : "bg-card mt-16"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <div
              className={`flex items-center gap-2 font-heading font-bold transition-colors duration-700 ${
                isDark ? "text-purple-400" : "text-primary"
              }`}
            >
              <span className="text-xl" aria-hidden="true">✦</span>
              <span>StyleGuideAI</span>
            </div>
            <p
              className={`text-sm leading-relaxed transition-colors duration-700 ${
                isDark ? "text-stone-400" : "text-muted-foreground"
              }`}
            >
              A 1,000+ member community for AI artists and art enthusiasts.
            </p>
            <div className="flex gap-3 pt-1">
              <a
                href="https://discord.gg/3QK2B3zhGb"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm font-medium hover:underline focus-visible:outline-ring rounded transition-colors duration-700 ${
                  isDark ? "text-purple-400" : "text-primary"
                }`}
                aria-label="Join our Discord (opens in new tab)"
              >
                Discord
              </a>
              <a
                href="https://www.deviantart.com/styleguideai"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm font-medium hover:underline focus-visible:outline-ring rounded transition-colors duration-700 ${
                  isDark ? "text-purple-400" : "text-primary"
                }`}
                aria-label="StyleGuideAI on DeviantArt (opens in new tab)"
              >
                DeviantArt
              </a>
            </div>
          </div>

          {/* Tools */}
          <div className="space-y-3">
            <h3
              className={`font-heading font-semibold text-sm uppercase tracking-wide transition-colors duration-700 ${
                isDark ? "text-stone-100" : "text-foreground"
              }`}
            >
              Tools
            </h3>
            <ul
              className={`space-y-2 text-sm transition-colors duration-700 ${
                isDark ? "text-stone-400" : "text-muted-foreground"
              }`}
            >
              {[
                { href: "/stylebear", label: "StyleBear" },
                { href: "/styledice", label: "StyleDice" },
                { href: "/styletarot", label: "StyleTarot" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`focus-visible:outline-ring rounded transition-colors duration-700 ${
                      isDark ? "hover:text-purple-400" : "hover:text-primary"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore */}
          <div className="space-y-3">
            <h3
              className={`font-heading font-semibold text-sm uppercase tracking-wide transition-colors duration-700 ${
                isDark ? "text-stone-100" : "text-foreground"
              }`}
            >
              Explore
            </h3>
            <ul
              className={`space-y-2 text-sm transition-colors duration-700 ${
                isDark ? "text-stone-400" : "text-muted-foreground"
              }`}
            >
              {[
                { href: "/museum", label: "Virtual Museum" },
                { href: "/articles", label: "Articles" },
                { href: "/themes", label: "Daily Themes" },
                { href: "/about", label: "About" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`focus-visible:outline-ring rounded transition-colors duration-700 ${
                      isDark ? "hover:text-purple-400" : "hover:text-primary"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <h3
              className={`font-heading font-semibold text-sm uppercase tracking-wide transition-colors duration-700 ${
                isDark ? "text-stone-100" : "text-foreground"
              }`}
            >
              Company
            </h3>
            <ul
              className={`space-y-2 text-sm transition-colors duration-700 ${
                isDark ? "text-stone-400" : "text-muted-foreground"
              }`}
            >
              {[
                { href: "/consulting", label: "Consulting" },
                { href: "/privacy", label: "Privacy Policy" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`focus-visible:outline-ring rounded transition-colors duration-700 ${
                      isDark ? "hover:text-purple-400" : "hover:text-primary"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className={`mt-10 border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors duration-700 ${
            isDark
              ? "border-stone-800 text-stone-500"
              : "text-muted-foreground"
          }`}
        >
          <p>© {new Date().getFullYear()} StyleGuideAI. All rights reserved.</p>
          <p>
            Built by{" "}
            <a
              href="https://satoricanton.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`hover:underline focus-visible:outline-ring rounded transition-colors duration-700 ${
                isDark ? "text-purple-400" : "text-primary"
              }`}
            >
              Satori Canton
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
