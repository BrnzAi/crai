import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'CryptoAI.ai - AI-Powered Tokenization Platform',
  description:
    'Fractional ownership of equity and real estate assets through AI-powered tokenization',
  keywords: [
    'tokenization',
    'real estate',
    'equity',
    'blockchain',
    'security tokens',
    'fractional ownership',
    'Dubai',
    'UAE',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
