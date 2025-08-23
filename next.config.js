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
  
  // ESLint 설정 - 빌드 시 린트 에러를 경고로 처리
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 성능 헤더 (안전한 설정)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=30, s-maxage=30',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;