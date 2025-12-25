import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/ko";
import en from "./dictionaries/en";
import ko from "./dictionaries/ko";

const dictionaries: Record<Locale, Dictionary> = {
  ko,
  en,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
