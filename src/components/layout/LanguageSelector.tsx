"use client";

import { useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, localeNames } from "@/i18n/routing";

export function LanguageSelector() {
  const t = useTranslations("languageSelector");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className="relative">
      <select
        value={locale}
        onChange={onSelect}
        disabled={isPending}
        aria-label={t("ariaLabel")}
        className="appearance-none cursor-pointer rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-foreground/70 hover:text-primary hover:bg-muted focus-visible:outline-ring transition-colors disabled:opacity-50"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
