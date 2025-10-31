import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "mt-1 block w-full px-4 py-3 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF] transition-all duration-200",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
