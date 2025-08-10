import type { Metadata } from 'next';
import { Inter, Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
// import Footer from '@/components/layout/Footer';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { ErrorBoundary } from '@/components/ui/error-boundary';

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
    default: '우리아빠 피터린치 / 우리형 메르 Blog',
    template: '%s | 우리아빠 피터린치 / 우리형 메르 Blog'
  },
  description: '니가 뭘 알아. 니가 뭘 아냐고.\n우리아빠 피터린치, 우리형 메르를 보유한 최모군이 선사하는 프리미엄 투자 지식과 라이프스타일 경험',
  keywords: ['피터린치', '투자', '주식', '포트폴리오', '투자 철학', '경제 분석', '국민연금', '투자 인사이트', '금융', '자산관리'],
  authors: [{ name: '우리아빠 피터린치' }],
  creator: '우리아빠 피터린치',
  
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
    url: 'https://peter-lynch-blog.vercel.app',
    title: '우리아빠 피터린치 / 우리형 메르 Blog',
    description: '니가 뭘 알아. 니가 뭘 아냐고.\n우리아빠 피터린치, 우리형 메르를 보유한 최모군이 선사하는 프리미엄 투자 지식과 라이프스타일 경험',
    siteName: '우리아빠 피터린치 / 우리형 메르 Blog',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '우리아빠 피터린치 / 우리형 메르 Blog',
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: '우리아빠 피터린치 / 우리형 메르 Blog',
    description: '프리미엄 투자 지식과 라이프스타일 경험',
    images: ['/og-image.jpg'],
    creator: '@peter_lynch_blog',
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
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="/_next/static/media/inter-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/_next/static/media/noto-sans-kr-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* Performance and security headers */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
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
              <div className="min-h-screen flex flex-col bg-background text-foreground">
                <Header />
                
                <main className="flex-1" role="main" id="main-content">
                  <ErrorBoundary level="section">
                    {children}
                  </ErrorBoundary>
                </main>
                
                <footer className="border-t mt-16">
                  <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
                    <p>&copy; 2025 우리아빠 피터린치 / 우리형 메르 Blog. All rights reserved.</p>
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
