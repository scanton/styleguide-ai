"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("footer");
  const pathname = usePathname();
  const isDark = pathname === "/rising";

  const toolLinks = [
    { href: "/stylebear" as const, label: "StyleBear" },
    { href: "/styledice" as const, label: "StyleDice" },
    { href: "/styletarot" as const, label: "StyleTarot" },
  ];

  const exploreLinks = [
    { href: "/museum" as const, label: t("museum") },
    { href: "/articles" as const, label: t("articles") },
    { href: "/themes" as const, label: t("themes") },
    { href: "/about" as const, label: t("about") },
  ];

  const companyLinks = [
    { href: "/consulting" as const, label: t("consulting") },
    { href: "/privacy" as const, label: t("privacy") },
  ];

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
              {t("tagline")}
            </p>
            <div className="flex gap-3 pt-1">
              <a
                href="https://discord.gg/3QK2B3zhGb"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm font-medium hover:underline focus-visible:outline-ring rounded transition-colors duration-700 ${
                  isDark ? "text-purple-400" : "text-primary"
                }`}
                aria-label={t("discordAriaLabel")}
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
                aria-label={t("deviantartAriaLabel")}
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
              {t("toolsHeading")}
            </h3>
            <ul
              className={`space-y-2 text-sm transition-colors duration-700 ${
                isDark ? "text-stone-400" : "text-muted-foreground"
              }`}
            >
              {toolLinks.map((l) => (
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
              {t("exploreHeading")}
            </h3>
            <ul
              className={`space-y-2 text-sm transition-colors duration-700 ${
                isDark ? "text-stone-400" : "text-muted-foreground"
              }`}
            >
              {exploreLinks.map((l) => (
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
              {t("companyHeading")}
            </h3>
            <ul
              className={`space-y-2 text-sm transition-colors duration-700 ${
                isDark ? "text-stone-400" : "text-muted-foreground"
              }`}
            >
              {companyLinks.map((l) => (
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
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <p>
            {t("builtBy")}{" "}
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
