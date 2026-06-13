import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-card mt-16">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-heading font-bold text-primary">
              <span className="text-xl" aria-hidden="true">✦</span>
              <span>StyleGuideAI</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A 1,000+ member community for AI artists and art enthusiasts.
            </p>
            <div className="flex gap-3 pt-1">
              <a
                href="https://discord.gg/styleguideai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline focus-visible:outline-ring rounded"
                aria-label="Join our Discord (opens in new tab)"
              >
                Discord
              </a>
              <a
                href="https://www.deviantart.com/styleguideai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline focus-visible:outline-ring rounded"
                aria-label="StyleGuideAI on DeviantArt (opens in new tab)"
              >
                DeviantArt
              </a>
            </div>
          </div>

          {/* Tools */}
          <div className="space-y-3">
            <h3 className="font-heading font-semibold text-sm uppercase tracking-wide text-foreground">
              Tools
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                { href: "/stylebear", label: "StyleBear" },
                { href: "/styledice", label: "StyleDice" },
                { href: "/styletarot", label: "StyleTarot" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-primary focus-visible:outline-ring rounded transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Museum & Content */}
          <div className="space-y-3">
            <h3 className="font-heading font-semibold text-sm uppercase tracking-wide text-foreground">
              Explore
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                { href: "/museum", label: "Virtual Museum" },
                { href: "/articles", label: "Articles" },
                { href: "/themes", label: "Daily Themes" },
                { href: "/about", label: "About" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-primary focus-visible:outline-ring rounded transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <h3 className="font-heading font-semibold text-sm uppercase tracking-wide text-foreground">
              Company
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                { href: "/consulting", label: "Consulting" },
                { href: "/privacy", label: "Privacy Policy" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-primary focus-visible:outline-ring rounded transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} StyleGuideAI. All rights reserved.</p>
          <p>
            Built by{" "}
            <a
              href="https://satoricanton.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline focus-visible:outline-ring rounded"
            >
              Satori Canton
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
