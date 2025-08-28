import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

export interface InteractiveButtonProps extends ButtonProps {
  loading?: boolean
  loadingText?: string
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>
  href?: string
  external?: boolean
  download?: boolean
  immediateResponse?: boolean
}

const InteractiveButton = React.forwardRef<HTMLButtonElement, InteractiveButtonProps>(
  ({ 
    children, 
    loading = false, 
    loadingText = "처리 중...", 
    onClick, 
    href, 
    external = false, 
    download = false,
    immediateResponse = true,
    disabled, 
    className,
    ...props 
  }, ref) => {
    const [isLoading, setIsLoading] = React.useState(false)
    const [wasClicked, setWasClicked] = React.useState(false)

    const handleClick = React.useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
      // 🔥 즉시 강한 시각적 피드백
      setWasClicked(true)
      setTimeout(() => setWasClicked(false), 200) // 200ms로 연장

      // 외부 링크 처리 - 즉시 열기 (로딩 없음)
      if (href) {
        if (external) {
          // 🚀 외부 링크는 즉시 새 탭에서 열기 (지연 없음)
          window.open(href, '_blank', 'noopener,noreferrer')
          return
        } else {
          // 🚀 내부 링크는 즉시 이동
          window.location.href = href
          return
        }
      }

      // 커스텀 onClick 핸들러 (API 호출 등)
      if (onClick) {
        try {
          setIsLoading(true)
          const result = onClick(event)
          
          // Promise인 경우 대기
          if (result instanceof Promise) {
            await result
          }
        } catch (error) {
          console.error('Button onClick error:', error)
        } finally {
          setIsLoading(false)
        }
      }
    }, [href, external, onClick])

    const isDisabled = disabled || loading || isLoading

    return (
      <Button
        ref={ref}
        className={cn(
          "relative overflow-hidden transition-all duration-100 active:scale-95",
          // 🔥 강한 클릭 시 즉시 시각적 피드백
          wasClicked && "scale-90 brightness-125 shadow-lg ring-2 ring-primary/50",
          // 로딩 중일 때 스타일 (API 호출만)
          (loading || isLoading) && "cursor-wait",
          // 호버 효과 강화
          "hover:scale-105 hover:shadow-md",
          className
        )}
        disabled={isDisabled}
        onClick={handleClick}
        {...props}
      >
        {/* 로딩 상태 표시 (API 호출만) */}
        {(loading || isLoading) ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingText}</span>
          </>
        ) : (
          children
        )}
        
        {/* 🔥 강한 클릭 시 리플 효과 */}
        {wasClicked && (
          <div className="absolute inset-0 bg-white/30 animate-pulse rounded-md border-2 border-primary/60" />
        )}
      </Button>
    )
  }
)

InteractiveButton.displayName = "InteractiveButton"

export { InteractiveButton }