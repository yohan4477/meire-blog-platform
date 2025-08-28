'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Tag, Eye, MessageSquare, Heart, Share2 } from 'lucide-react';
import Link from 'next/link';

interface MerryBlogPost {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  author: string;
  createdAt: string;
  views: number;
  likes: number;
  comments: number;
  tags: string[];
  stockTickers?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
}

interface PostCardProps {
  post: MerryBlogPost;
  featured?: boolean;
}

export function PostCard({ post, featured = false }: PostCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card className={`group hover:shadow-lg transition-shadow ${featured ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader>
        <CardTitle className="text-foreground group-hover:text-blue-600 transition-colors">
          <Link href={`/merry/posts/${post.id}`}>
            {post.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
        
        <div className="flex flex-wrap gap-1 mb-4">
          {post.tags?.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              <Tag size={10} className="mr-1" />
              {tag}
            </Badge>
          ))}
          {post.tags?.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{post.tags.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <User size={14} />
            {post.author}
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            {formatDate(post.createdAt)}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Eye size={14} />
              {post.views}
            </div>
            <div className="flex items-center gap-1">
              <Heart size={14} />
              {post.likes}
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare size={14} />
              {post.comments}
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <Share2 size={14} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}