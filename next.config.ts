import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 성능 최적화
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-select', '@tanstack/react-query'],
  },

  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // 이미지 최적화
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: [],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // 압축 및 성능
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // 번들 분석 및 최적화
  webpack: (config, { dev, isServer }) => {
    // 프로덕션 빌드에서 번들 크기 최적화
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            chunks: 'all',
            enforce: true,
          },
        },
      };
    }

    // SVG 최적화
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },

  // 빌드 설정
  typescript: {
    ignoreBuildErrors: false, // 프로덕션에서는 TypeScript 오류 체크
  },
  
  eslint: {
    ignoreDuringBuilds: false, // ESLint 체크 활성화
  },

  // 보안 헤더
  async headers() {
    return [
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
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // 외부 패키지 설정
  serverExternalPackages: ['mysql2', 'sqlite3'],
};

export default nextConfig;
