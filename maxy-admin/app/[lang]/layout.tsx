import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { MaxyMenu } from "./Menu";
import { TranslationProvider } from "../../components/i18n/TranslationProvider";
import { isLocale, type Locale } from "../../i18n/config";
import { getDictionary } from "../../i18n/get-dictionary";
import { UserSettingsProvider } from "../../components/usersettings/UserSettingsProvider";
import { SessionGuard } from "../../components/auth/SessionGuard";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { lang } = await params;

  if (!isLocale(lang)) {
    notFound();
  }

  const dictionary = getDictionary(lang as Locale);

  return (
    <TranslationProvider locale={lang} dictionary={dictionary}>
        <SessionGuard />
        <MaxyMenu />
        {children}
    </TranslationProvider>
  );
}
