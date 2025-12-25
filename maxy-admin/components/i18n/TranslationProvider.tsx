"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Locale } from "../../i18n/config";
import type { Dictionary } from "../../i18n/dictionaries/ko";

type TranslationContextValue = {
  locale: Locale;
  dictionary: Dictionary;
};

const TranslationContext = createContext<TranslationContextValue | null>(null);

export function TranslationProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  return (
    <TranslationContext.Provider value={{ locale, dictionary }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useI18n must be used within a TranslationProvider");
  }
  return context;
}
