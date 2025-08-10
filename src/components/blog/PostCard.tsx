import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BlogPost } from '@/types';

interface PostCardProps {
  post: BlogPost;
}

export default function PostCard({ post }: PostCardProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 MM월 dd일', { locale: ko });
    } catch {
      return dateString;
    }
  };

  const getExcerpt = (content: string, maxLength: number = 150) => {
    const cleanContent = content
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/\n+/g, ' ') // 줄바꿈을 스페이스로 변경
      .trim();
    
    return cleanContent.length > maxLength 
      ? cleanContent.substring(0, maxLength) + '...'
      : cleanContent;
  };

  return (
    <Card className="h-full hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <Link 
            href={`/posts/${post.log_no}`}
            className="flex-1"
          >
            <h3 className="font-semibold text-lg leading-tight hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </h3>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
          {getExcerpt(post.content)}
        </p>
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {post.category && (
            <Badge variant="secondary" className="text-xs">
              {post.category}
            </Badge>
          )}
        </div>
        <time className="text-xs text-muted-foreground">
          {formatDate(post.created_date)}
        </time>
      </CardFooter>
    </Card>
  );
}