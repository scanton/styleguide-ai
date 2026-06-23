import { defineRouting } from "next-intl/routing";

export const locales = ["en", "zh", "nl", "fr", "de", "it", "ja", "pt", "ru", "es"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  nl: "Nederlands",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  ja: "日本語",
  pt: "Português",
  ru: "Русский",
  es: "Español",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
