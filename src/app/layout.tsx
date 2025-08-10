import type { Metadata } from 'next';
import { Inter, Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
});

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-kr'
});

export const metadata: Metadata = {
  title: {
    default: 'Meire Blog',
    template: '%s | Meire Blog'
  },
  description: '경제, 투자, 일상의 이야기를 담은 개인 블로그',
  keywords: ['블로그', '경제', '투자', '주식', '일상', '경제 분석'],
  authors: [{ name: 'Meire' }],
  creator: 'Meire',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://meire-blog.vercel.app',
    title: 'Meire Blog',
    description: '경제, 투자, 일상의 이야기를 담은 개인 블로그',
    siteName: 'Meire Blog',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoSansKr.variable} font-sans antialiased`}>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
