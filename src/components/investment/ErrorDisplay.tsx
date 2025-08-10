import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  RefreshCw, 
  Wifi,
  Server,
  Key,
  Clock,
  ExternalLink,
  Info
} from 'lucide-react';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export default function ErrorDisplay({ 
  error, 
  onRetry, 
  isRetrying = false, 
  className = "" 
}: ErrorDisplayProps) {
  
  const getErrorDetails = (errorMessage: string) => {
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('rate limit') || lowerError.includes('429')) {
      return {
        icon: Clock,
        title: 'API 요청 제한',
        message: 'WhaleWisdom API 요청 한도에 도달했습니다.',
        suggestion: '잠시 후 다시 시도해주세요. (보통 1분 후 재시도 가능)',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        canRetry: true
      };
    }
    
    if (lowerError.includes('authentication') || lowerError.includes('401') || lowerError.includes('403')) {
      return {
        icon: Key,
        title: 'API 인증 오류',
        message: 'WhaleWisdom API 인증에 실패했습니다.',
        suggestion: 'API 키 설정을 확인해주세요.',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        canRetry: false
      };
    }
    
    if (lowerError.includes('network') || lowerError.includes('fetch')) {
      return {
        icon: Wifi,
        title: '네트워크 오류',
        message: '네트워크 연결에 문제가 있습니다.',
        suggestion: '인터넷 연결을 확인하고 다시 시도해주세요.',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        canRetry: true
      };
    }
    
    if (lowerError.includes('server') || lowerError.includes('500') || lowerError.includes('503')) {
      return {
        icon: Server,
        title: '서버 오류',
        message: 'WhaleWisdom 서버에 일시적인 문제가 있습니다.',
        suggestion: '잠시 후 다시 시도해주세요.',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        canRetry: true
      };
    }
    
    if (lowerError.includes('not found') || lowerError.includes('404')) {
      return {
        icon: Info,
        title: '데이터를 찾을 수 없음',
        message: 'Scion Asset Management 데이터를 찾을 수 없습니다.',
        suggestion: 'WhaleWisdom에서 데이터 업데이트가 지연될 수 있습니다.',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        canRetry: true
      };
    }
    
    // Default error
    return {
      icon: AlertCircle,
      title: '알 수 없는 오류',
      message: error || '예상치 못한 오류가 발생했습니다.',
      suggestion: '문제가 계속되면 잠시 후 다시 시도해주세요.',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      canRetry: true
    };
  };

  const errorDetails = getErrorDetails(error);
  const Icon = errorDetails.icon;

  return (
    <Card className={`p-8 ${className}`}>
      <div className="text-center max-w-md mx-auto">
        {/* Error Icon */}
        <div className={`p-4 rounded-full ${errorDetails.bgColor} w-20 h-20 mx-auto mb-6`}>
          <Icon className={`h-12 w-12 ${errorDetails.color} mx-auto`} />
        </div>

        {/* Error Title */}
        <h3 className="text-xl font-semibold mb-3">
          {errorDetails.title}
        </h3>

        {/* Error Message */}
        <p className="text-muted-foreground mb-2">
          {errorDetails.message}
        </p>

        {/* Suggestion */}
        <p className="text-sm text-muted-foreground mb-6">
          {errorDetails.suggestion}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {errorDetails.canRetry && onRetry && (
            <Button 
              onClick={onRetry} 
              disabled={isRetrying}
              variant="default"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? '재시도 중...' : '다시 시도'}
            </Button>
          )}
          
          <Button variant="outline" asChild>
            <a 
              href="https://whalewisdom.com/filer/scion-asset-management-llc" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              WhaleWisdom에서 보기
            </a>
          </Button>
        </div>

        {/* Technical Details (for debugging) */}
        <details className="mt-6 text-left">
          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
            기술적 세부사항
          </summary>
          <div className="mt-2 p-3 bg-muted rounded text-sm font-mono text-muted-foreground">
            {error}
          </div>
        </details>
      </div>
    </Card>
  );
}