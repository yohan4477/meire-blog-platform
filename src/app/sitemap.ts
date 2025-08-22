import { MetadataRoute } from 'next';

const baseUrl = process.env['NEXT_PUBLIC_BASE_URL'] || 'https://your-app.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 정적 사이트맵 생성 (데이터베이스 없이)
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/posts`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  // TODO: 데이터베이스 연결 후 동적 sitemap으로 업그레이드
  return staticPages;
}