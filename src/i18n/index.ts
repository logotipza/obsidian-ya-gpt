import ruTranslations from "./ru";
import enTranslations from "./en";

// Use a structural type that works for both locales
export type Translations = {
  [K in keyof typeof ruTranslations]: (typeof ruTranslations)[K] extends (...args: infer A) => infer R
    ? (...args: A) => R
    : string;
};

function detectLocale(): string {
  // Obsidian sets moment locale to match app language
  try {
    const momentLocale = (window as Window & { moment?: { locale?: () => string } }).moment?.locale?.();
    if (momentLocale) return momentLocale;
  } catch { /* ignore */ }
  // Fallback: check html lang attribute
  return document.documentElement.lang || "en";
}

export function getT(): Translations {
  const locale = detectLocale();
  if (locale.startsWith("ru")) return ruTranslations as unknown as Translations;
  return enTranslations as unknown as Translations;
}
