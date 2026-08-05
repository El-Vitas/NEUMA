import type { Metadata } from 'next';
import { Barlow_Condensed, Inter, JetBrains_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
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

const LocaleContent = async ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <NuqsProvider>{children}</NuqsProvider>
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
