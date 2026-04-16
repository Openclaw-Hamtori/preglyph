import { Noto_Naskh_Arabic, Noto_Sans, Noto_Sans_Devanagari, Noto_Sans_JP, Noto_Sans_KR, Noto_Sans_SC } from 'next/font/google';
import './globals.css';
import AppProviders from './providers';

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-noto-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  variable: '--font-noto-sans-kr',
  weight: ['400', '500', '700'],
  display: 'swap',
});

const notoSansSc = Noto_Sans_SC({
  subsets: ['latin'],
  variable: '--font-noto-sans-sc',
  weight: ['400', '500', '700'],
  display: 'swap',
});

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  weight: ['400', '500', '700'],
  display: 'swap',
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-naskh-arabic',
  weight: ['400', '500', '700'],
  display: 'swap',
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-noto-sans-devanagari',
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'Preglyph — Public archive',
  description:
    'Preglyph is a public archive for short permanent onchain records.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={[
          notoSans.variable,
          notoSansKr.variable,
          notoSansSc.variable,
          notoSansJp.variable,
          notoNaskhArabic.variable,
          notoSansDevanagari.variable,
        ].join(' ')}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
