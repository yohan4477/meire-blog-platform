import { MetadataRoute } from 'next';
import { query } from '@/lib/database';
import { BlogPost } from '@/types';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 모든 포스트 가져오기
  const posts = await query<BlogPost>(
    `SELECT log_no, updated_at FROM blog_posts ORDER BY updated_at DESC`
  );

  // 카테고리 가져오기
  const categories = await query<{ name: string }>(
    `SELECT DISTINCT category as name FROM blog_posts WHERE category IS NOT NULL`
  );

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

  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/posts/${post.log_no}`,
    lastModified: new Date(post.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/posts?category=${encodeURIComponent(category.name)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.5,
  }));

  return [...staticPages, ...postPages, ...categoryPages];
}