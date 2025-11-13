import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface DropdownMenuProps {
  children: React.ReactNode
}

const DropdownMenuContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.MutableRefObject<HTMLElement | null>
}>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
})

const DropdownMenu = ({ children }: DropdownMenuProps) => {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement | null>(null)

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

const useDropdownMenu = () => {
  const context = React.useContext(DropdownMenuContext)
  if (!context) {
    throw new Error("DropdownMenu components must be used within DropdownMenu")
  }
  return context
}

export interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  children: React.ReactNode
}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ asChild, children, className, ...props }, ref) => {
    const { open, setOpen, triggerRef } = useDropdownMenu()
    const internalRef = React.useRef<HTMLButtonElement>(null)

    React.useEffect(() => {
      if (internalRef.current) {
        triggerRef.current = internalRef.current
      }
    }, [])

    const handleClick = (e: React.MouseEvent) => {
      setOpen(!open)
      if (props.onClick) {
        props.onClick(e as any)
      }
    }

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        onClick: handleClick,
        ref: (node: HTMLElement) => {
          internalRef.current = node as HTMLButtonElement
          triggerRef.current = node
          if (typeof ref === 'function') {
            ref(node as HTMLButtonElement)
          } else if (ref) {
            ref.current = node as HTMLButtonElement
          }
        },
        ...props,
      })
    }

    return (
      <Button
        ref={(node) => {
          internalRef.current = node
          triggerRef.current = node
          if (typeof ref === 'function') {
            ref(node)
          } else if (ref) {
            ref.current = node
          }
        }}
        className={className}
        onClick={handleClick}
        {...props}
      >
        {children}
      </Button>
    )
  }
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

export interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end" | "center"
  className?: string
}

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ align = "start", className, children, ...props }, ref) => {
    const { open, setOpen, triggerRef } = useDropdownMenu()
    const contentRef = React.useRef<HTMLDivElement>(null)
    const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null)

    React.useImperativeHandle(ref, () => contentRef.current as HTMLDivElement)

    // Calculate position based on trigger element
    React.useEffect(() => {
      if (!open || !triggerRef.current || !contentRef.current) {
        setPosition(null)
        return
      }

      const updatePosition = () => {
        if (!triggerRef.current || !contentRef.current) return

        const triggerRect = triggerRef.current.getBoundingClientRect()
        const contentRect = contentRef.current.getBoundingClientRect()

        // Fixed positioning is relative to viewport, not document
        let left = triggerRect.left
        let top = triggerRect.bottom + 8 // 8px margin

        // Adjust for alignment
        if (align === 'end') {
          left = triggerRect.right - (contentRect.width || 264) // Default width is 264 (w-64)
        } else if (align === 'center') {
          left = triggerRect.left + (triggerRect.width / 2) - ((contentRect.width || 264) / 2)
        }

        // Ensure dropdown doesn't go off screen
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        if (left + (contentRect.width || 264) > viewportWidth) {
          left = viewportWidth - (contentRect.width || 264) - 8
        }
        if (left < 8) {
          left = 8
        }
        if (top + (contentRect.height || 200) > viewportHeight) {
          // If it would go off bottom, position above the trigger
          top = triggerRect.top - (contentRect.height || 200) - 8
        }

        setPosition({ top, left })
      }

      // Initial position calculation
      updatePosition()

      // Update on scroll/resize
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)

      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }, [open, align, triggerRef])

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node
        // Don't close if clicking inside the dropdown content
        if (contentRef.current && !contentRef.current.contains(target)) {
          // Also check if the click is on the trigger button (allow toggle)
          if (triggerRef.current && !triggerRef.current.contains(target)) {
            setOpen(false)
          }
        }
      }

      if (open) {
        // Use click event instead of mousedown to allow menu item clicks to register first
        setTimeout(() => {
          document.addEventListener("click", handleClickOutside, true)
        }, 0)
      }

      return () => {
        document.removeEventListener("click", handleClickOutside, true)
      }
    }, [open, setOpen, triggerRef])

    if (!open) return null

    const content = (
      <div
        ref={contentRef}
        className={cn(
          "fixed z-[999999] min-w-[8rem] overflow-hidden rounded-md border border-[#E0E0E0] bg-white shadow-lg",
          className
        )}
        style={position ? {
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
        } : { display: 'none' }}
        onMouseDown={(e) => {
          // Prevent mousedown from bubbling to click outside handler
          e.stopPropagation()
        }}
        {...props}
      >
        {children}
      </div>
    )

    // Use portal to render at document body level, ensuring it's above all other elements
    return typeof window !== 'undefined' ? createPortal(content, document.body) : content
  }
)
DropdownMenuContent.displayName = "DropdownMenuContent"

export interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-2 py-1.5 text-sm font-semibold text-[#333333]", className)}
      {...props}
    />
  )
)
DropdownMenuLabel.displayName = "DropdownMenuLabel"

export interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive"
  className?: string
  children: React.ReactNode
}

const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ variant = "default", className, children, ...props }, ref) => {
    const { setOpen } = useDropdownMenu()

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Prevent event bubbling
      e.stopPropagation()
      
      if (props.onClick) {
        props.onClick(e)
      }
      // Close menu after a small delay to ensure navigation completes
      setTimeout(() => {
        setOpen(false)
      }, 100)
    }

    const variantClasses = {
      default: "text-[#333333] hover:bg-[#F5F5F5]",
      destructive: "text-red-600 hover:bg-red-50",
    }

    return (
      <button
        ref={ref}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-[#F5F5F5] disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    )
  }
)
DropdownMenuItem.displayName = "DropdownMenuItem"

export interface DropdownMenuGroupProps {
  children: React.ReactNode
}

const DropdownMenuGroup = ({ children }: DropdownMenuGroupProps) => {
  return <div className="p-1">{children}</div>
}

export interface DropdownMenuSeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  className?: string
}

const DropdownMenuSeparator = React.forwardRef<HTMLHRElement, DropdownMenuSeparatorProps>(
  ({ className, ...props }, ref) => (
    <hr
      ref={ref}
      className={cn("my-1 border-[#E0E0E0]", className)}
      {...props}
    />
  )
)
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
}

