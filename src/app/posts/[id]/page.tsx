import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BlogPost } from '@/types';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';

interface PostPageProps {
  params: Promise<{ id: string }>;
}

async function getPost(id: string): Promise<BlogPost | null> {
  try {
    const baseUrl = process.env['NEXT_PUBLIC_BASE_URL'] || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/posts/${id}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    // 새로운 API 응답 형식 처리
    if (data.success && data.data) {
      return data.data;
    }
    
    // 이전 형식과의 호환성을 위해
    if (data.id) {
      return data;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch post:', error);
    return null;
  }
}

function convertToMarkdown(htmlContent: string): string {
  // 기본 HTML을 마크다운으로 변환하는 간단한 함수
  return htmlContent
    .replace(/<br\s*\/?>/gi, '\n\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<h([1-6])>(.*?)<\/h[1-6]>/gi, (match, level, content) => '#'.repeat(parseInt(level)) + ' ' + content + '\n\n')
    .replace(/<[^>]*>/g, '') // 나머지 HTML 태그 제거
    .replace(/\n{3,}/g, '\n\n') // 연속된 줄바꿈 정리
    .trim();
}

function getReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

export default async function PostPage({ params }: PostPageProps) {
  const resolvedParams = await params;
  const post = await getPost(resolvedParams.id);

  if (!post) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 MM월 dd일', { locale: ko });
    } catch {
      return dateString;
    }
  };

  const markdownContent = convertToMarkdown(post.content);
  const readingTime = getReadingTime(post.content);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 뒤로가기 버튼 */}
      <Button variant="ghost" size="sm" className="mb-6" asChild>
        <Link href="/posts">
          <ArrowLeft className="mr-2 h-4 w-4" />
          포스트 목록으로
        </Link>
      </Button>

      {/* 헤더 */}
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
          {post.title}
        </h1>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <time>{formatDate(post.created_date)}</time>
          </div>
          
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{readingTime}분 읽기</span>
          </div>
        </div>

        {post.category && (
          <Badge variant="secondary" className="mb-6">
            {post.category}
          </Badge>
        )}

        <Separator />
      </header>

      {/* 본문 */}
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <div className="whitespace-pre-wrap leading-relaxed">
          {/* HTML 태그가 포함된 경우를 대비한 안전한 렌더링 */}
          <ReactMarkdown>
            {markdownContent}
          </ReactMarkdown>
        </div>
      </article>

      {/* 푸터 */}
      <footer className="mt-16 pt-8 border-t">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            <p>작성일: {formatDate(post.created_date)}</p>
            {post.updated_at && post.updated_at !== post.created_date && (
              <p>수정일: {formatDate(post.updated_at)}</p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/posts">다른 포스트 보기</Link>
            </Button>
            {post.category && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/posts?category=${encodeURIComponent(post.category)}`}>
                  같은 카테고리 포스트
                </Link>
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

// 메타데이터 생성
export async function generateMetadata({ params }: PostPageProps) {
  const resolvedParams = await params;
  const post = await getPost(resolvedParams.id);
  
  if (!post) {
    return {
      title: '포스트를 찾을 수 없습니다',
      description: '요청하신 포스트를 찾을 수 없습니다.'
    };
  }

  const excerpt = post.content
    .replace(/<[^>]*>/g, '')
    .substring(0, 160)
    .trim() + '...';

  return {
    title: post.title,
    description: excerpt,
    openGraph: {
      title: post.title,
      description: excerpt,
      type: 'article',
      publishedTime: post.created_date,
      modifiedTime: post.updated_at,
    },
  };
}