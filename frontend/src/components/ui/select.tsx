import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  children: React.ReactNode
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  children: React.ReactNode
}

export interface SelectValueProps {
  placeholder?: string
}

const SelectContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}>({
  isOpen: false,
  setIsOpen: () => {},
})

const Select: React.FC<SelectProps> = ({ value, onValueChange, defaultValue, children }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState(defaultValue || value)

  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue)
    onValueChange?.(newValue)
    setIsOpen(false)
  }

  return (
    <SelectContext.Provider value={{ value: selectedValue, onValueChange: handleValueChange, isOpen, setIsOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { isOpen, setIsOpen } = React.useContext(SelectContext)

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "mt-1 flex w-full items-center justify-between px-4 py-3 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF] transition-all duration-200 h-12 box-border text-left font-normal",
          className
        )}
        style={{
          fontFamily: 'Open Sans, sans-serif',
          lineHeight: '1.5',
          appearance: 'none',
          outline: 'none'
        }}
        onClick={() => setIsOpen(!isOpen)}
        {...props}
      >
        <span className="flex-1 text-left">{children}</span>
        <svg
          className="h-4 w-4 opacity-50 flex-shrink-0 ml-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectContent: React.FC<SelectContentProps> = ({ children, className }) => {
  const { isOpen, setIsOpen } = React.useContext(SelectContext)

  if (!isOpen) return null

  return (
    <div
      className={cn(
        "absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-lg border border-[#E0E0E0] bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.1)]",
        className
      )}
    >
      <div className="p-1">
        {children}
      </div>
    </div>
  )
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = React.useContext(SelectContext)

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-md py-2 px-3 text-sm text-[#333333] hover:bg-[#1E90FF] hover:text-white focus:bg-[#1E90FF] focus:text-white focus:outline-none transition-colors duration-200",
          selectedValue === value && "bg-[#1E90FF] text-white hover:bg-[#1877D2]",
          className
        )}
        onClick={() => onValueChange?.(value)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  const { value } = React.useContext(SelectContext)
  return <span>{value || placeholder}</span>
}

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
}
