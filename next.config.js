/** @type {import('next').NextConfig} */
const nextConfig = {
  // 안정적인 기본 설정 + 필수 최적화만 유지
  
  // 필수 실험적 기능 (안전한 것들만)
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react'],
  },
  
  // Fast Refresh 설정
  reactStrictMode: true,
  
  // SQLite 클라이언트 측 호환성 (필수)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
      };
    }
    return config;
  },

  // 이미지 최적화
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  // 기본 압축
  compress: true,
  
  // ⚡ 성능 최적화 (1초 이내 로딩 목표)
  poweredByHeader: false, // X-Powered-By 헤더 제거
  
  // 번들 분석 최적화
  modularizeImports: {
    'recharts': {
      transform: 'recharts/lib/{{member}}',
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    }
  },
  
  // ESLint 설정 - 빌드 시 린트 에러를 경고로 처리
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // ⚡ 성능 헤더 (1초 로딩 최적화)
  async headers() {
    return [
      {
        source: '/api/today-merry-quote',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300, stale-while-revalidate=600', // 5분 캐시
          },
        ],
      },
      {
        source: '/api/merry/picks',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=120, s-maxage=120, stale-while-revalidate=240', // 2분 캐시
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=60, stale-while-revalidate=120', // 기본 1분 캐시
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;