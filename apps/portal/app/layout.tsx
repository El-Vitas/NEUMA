import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { ThemeProvider } from '@/shared/components/ui/theme-provider';
import { NuqsProvider } from './providers';
import '../globals.css';

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
  title: 'Starter Portal',
  description: 'Servicio técnico especializado en reparación de notebooks y computadores. Santiago, Chile.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          <NuqsProvider>{children}</NuqsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
