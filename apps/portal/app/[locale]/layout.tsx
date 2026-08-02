import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { ThemeProvider } from '@/shared/components/ui/theme-provider';
import { NuqsProvider } from '../providers';
import '../../globals.css';
import { routing } from '../../i18n/routing';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-ibm-plex-sans',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-ibm-plex-mono',
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
      <ThemeProvider>
        <NuqsProvider>{children}</NuqsProvider>
      </ThemeProvider>
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
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans antialiased`}>
        <Suspense fallback={null}>
          <LocaleContent>{children}</LocaleContent>
        </Suspense>
      </body>
    </html>
  );
}
