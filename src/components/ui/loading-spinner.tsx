import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  size?: number
  className?: string
  text?: string
}

export function LoadingSpinner({ size = 24, className = "", text }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`h-${size} w-${size} animate-spin`} />
      {text && <span className="ml-2">{text}</span>}
    </div>
  )
}
