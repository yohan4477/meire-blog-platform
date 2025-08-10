import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface HoldingsSkeletonProps {
  rows?: number;
  showStats?: boolean;
  className?: string;
}

export default function HoldingsSkeleton({ 
  rows = 8, 
  showStats = true, 
  className = "" 
}: HoldingsSkeletonProps) {
  return (
    <Card className={`p-6 ${className}`}>
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="h-6 w-6 bg-muted rounded animate-pulse" />
          <div>
            <div className="h-6 w-48 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-9 w-24 bg-muted rounded animate-pulse" />
      </div>

      {/* Stats Skeleton */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="h-5 w-5 bg-muted rounded mx-auto mb-2 animate-pulse" />
              <div className="h-6 w-16 bg-muted rounded mx-auto mb-1 animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded mx-auto animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Table Header Skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
      </div>

      {/* Holdings List Skeleton */}
      <div className="space-y-2">
        {[...Array(rows)].map((_, i) => (
          <div 
            key={i}
            className="flex items-center justify-between p-4 rounded-lg border bg-card"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-5 w-20 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-4 w-48 bg-muted rounded animate-pulse mt-1" />
            </div>
            
            <div className="text-right">
              <div className="flex flex-col space-y-1">
                <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-6" />

      {/* Footer Skeleton */}
      <div className="text-center">
        <div className="h-4 w-96 bg-muted rounded mx-auto animate-pulse" />
      </div>
    </Card>
  );
}