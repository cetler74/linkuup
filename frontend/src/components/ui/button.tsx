import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    
    const variantClasses = {
      default: "bg-[#1E90FF] text-white hover:bg-[#1877D2] focus-visible:ring-[#1E90FF]",
      destructive: "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500",
      outline: "border border-[#E0E0E0] bg-white hover:bg-[#F5F5F5] hover:text-[#333333] focus-visible:ring-[#1E90FF]",
      secondary: "bg-[#F5F5F5] text-[#333333] hover:bg-[#E0E0E0] focus-visible:ring-[#1E90FF]",
      ghost: "hover:bg-[#F5F5F5] hover:text-[#333333] focus-visible:ring-[#1E90FF]",
      link: "text-[#1E90FF] underline-offset-4 hover:underline focus-visible:ring-[#1E90FF]",
    }
    
    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    }
    
    const Comp = asChild ? "div" : "button"
    
    return (
      <Comp
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
