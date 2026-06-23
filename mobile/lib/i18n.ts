import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../../messages/en.json";
import zh from "../../messages/zh.json";
import nl from "../../messages/nl.json";
import fr from "../../messages/fr.json";
import de from "../../messages/de.json";
import it from "../../messages/it.json";
import ja from "../../messages/ja.json";
import pt from "../../messages/pt.json";
import ru from "../../messages/ru.json";
import es from "../../messages/es.json";

export const SUPPORTED_LOCALES = [
  "en",
  "zh",
  "nl",
  "fr",
  "de",
  "it",
  "ja",
  "pt",
  "ru",
  "es",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
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

function detectLocale(storedLocale?: string | null): SupportedLocale {
  if (storedLocale && SUPPORTED_LOCALES.includes(storedLocale as SupportedLocale)) {
    return storedLocale as SupportedLocale;
  }
  const deviceLocale = Localization.getLocales()[0]?.languageCode ?? "en";
  if (SUPPORTED_LOCALES.includes(deviceLocale as SupportedLocale)) {
    return deviceLocale as SupportedLocale;
  }
  return "en";
}

export function initI18n(storedLocale?: string | null) {
  const lng = detectLocale(storedLocale);

  i18n.use(initReactI18next).init({
    lng,
    fallbackLng: "en",
    resources: {
      en: { translation: en },
      zh: { translation: zh },
      nl: { translation: nl },
      fr: { translation: fr },
      de: { translation: de },
      it: { translation: it },
      ja: { translation: ja },
      pt: { translation: pt },
      ru: { translation: ru },
      es: { translation: es },
    },
    interpolation: { escapeValue: false },
    compatibilityJSON: "v4",
  });

  return i18n;
}

export default i18n;
