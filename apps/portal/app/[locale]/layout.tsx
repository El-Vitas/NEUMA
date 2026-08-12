import type { Metadata } from 'next';
import { Barlow_Condensed, Inter, JetBrains_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { readThemeClass } from '@/shared/lib/theme.lib';
import { readRequestTheme } from '@/shared/server/lib/theme.server';
import { NuqsProvider } from '../providers';
import '../../globals.css';
import { routing } from '../../i18n/routing';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  variable: '--font-barlow-condensed',
  weight: ['400', '500', '600', '700'],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Company Brain',
  description: "Your company's internal knowledge workspace.",
};

export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

/**
 * Everything below is dressed in the theme this browser reads with.
 *
 * The reading is asked for here rather than around the `<html>` element so the
 * shell can still be sent while it is being worked out; the wrapper takes no
 * space of its own, it only passes the theme down — and lends itself as the
 * place where dialogs and menus are drawn, so they are dressed too.
 *
 * It says the colour of the text as well as the theme. Whatever does not paint
 * its own colour inherits it from here; without that it would reach up to the
 * document, which is above the theme and always answers in daylight.
 */
const LocaleContent = async ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const messages = await getMessages();
  const theme = await readRequestTheme();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className={`contents text-foreground ${readThemeClass(theme.reading)}`} data-theme-root="true">
        <NuqsProvider>{children}</NuqsProvider>
      </div>
    </NextIntlClientProvider>
  );
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} ${barlowCondensed.variable} ${jetBrainsMono.variable} font-sans antialiased`}>
        <Suspense fallback={null}>
          <LocaleContent>{children}</LocaleContent>
        </Suspense>
      </body>
    </html>
  );
}
