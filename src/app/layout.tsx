import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'SafeLink - Human Safety Platform',
  description: 'A secure, responsive multi-user safety application for emergency alerts and location sharing.',
  keywords: ['safety', 'emergency', 'alert', 'location', 'contacts', 'watch'],
  authors: [{ name: 'SafeLink Team' }],
  creator: 'SafeLink',
  publisher: 'SafeLink',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://safelink.example.com',
    siteName: 'SafeLink',
    title: 'SafeLink - Human Safety Platform',
    description: 'A secure, responsive multi-user safety application for emergency alerts and location sharing.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SafeLink - Human Safety Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SafeLink - Human Safety Platform',
    description: 'A secure, responsive multi-user safety application for emergency alerts and location sharing.',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'google-site-verification-code',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f1a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}