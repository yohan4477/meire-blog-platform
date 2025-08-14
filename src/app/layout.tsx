import type { Metadata } from 'next';
import { Inter, Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
// import Footer from '@/components/layout/Footer';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { AutoErrorCapture } from '@/components/AutoErrorCapture';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-kr',
  display: 'swap'
});

export const metadata: Metadata = {
  metadataBase: new URL('https://yor-investment-blog.vercel.app'),
  title: {
    default: '요르의 투자 블로그',
    template: '%s | 요르의 투자 블로그'
  },
  description: '니가 뭘 알어. 니가 뭘 아냐고.\n요르가 전하는 날카로운 투자 인사이트와 포트폴리오 분석',
  keywords: ['요르', '투자', '주식', '포트폴리오', '투자 철학', '경제 분석', '투자 인사이트', '금융', '자산관리', 'Scion'],
  authors: [{ name: '요르' }],
  creator: '요르',
  
  // Enhanced SEO metadata
  category: 'finance',
  alternates: {
    canonical: 'https://peter-lynch-blog.vercel.app',
    languages: {
      'ko-KR': 'https://peter-lynch-blog.vercel.app/ko',
      'en-US': 'https://peter-lynch-blog.vercel.app/en',
    },
  },
  
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://yor-investment-blog.vercel.app',
    title: '요르의 투자 블로그',
    description: '니가 뭘 알아. 니가 뭘 아냐고.\n요르가 전하는 날카로운 투자 인사이트와 포트폴리오 분석',
    siteName: '요르의 투자 블로그',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '요르의 투자 블로그',
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: '요르의 투자 블로그',
    description: '날카로운 투자 인사이트와 포트폴리오 분석',
    images: ['/og-image.jpg'],
    creator: '@yor_investment',
  },
  
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Additional metadata for better SEO
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  
  // Verification tags (add actual values when available)
  verification: {
    google: 'your-google-site-verification',
    yandex: 'your-yandex-verification',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Performance and security headers */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
        
        {/* Web app manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      
      <body className={`${inter.variable} ${notoSansKr.variable} font-sans antialiased`}>
        <ErrorBoundary level="page" showDetails={process.env.NODE_ENV === 'development'}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <AutoErrorCapture />
              <div className="min-h-screen flex flex-col bg-background text-foreground">
                <Header />
                
                <main className="flex-1" role="main" id="main-content">
                  <ErrorBoundary level="section">
                    {children}
                  </ErrorBoundary>
                </main>
                
                <footer className="border-t mt-16">
                  <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
                    <p>&copy; 2025 요르의 투자 블로그. All rights reserved.</p>
                    <p className="text-sm mt-2">니가 뭘 알아. 니가 뭘 아냐고.</p>
                  </div>
                </footer>
              </div>
            </QueryProvider>
          </ThemeProvider>
        </ErrorBoundary>
        
        {/* Skip to main content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
        >
          본문으로 바로가기
        </a>
      </body>
    </html>
  );
}
