import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 성능 최적화 (최소한)
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // 이미지 최적화 (기본)
  images: {
    formats: ['image/webp'],
    domains: [],
  },

  // TypeScript and ESLint (무시)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 외부 패키지 설정
  serverExternalPackages: ['mysql2'],
};

export default nextConfig;
