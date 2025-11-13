import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export interface AlertDialogTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

export interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export interface AlertDialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface AlertDialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface AlertDialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export interface AlertDialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export interface AlertDialogCancelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const AlertDialogContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({
  open: false,
  onOpenChange: () => {},
})

const AlertDialog: React.FC<AlertDialogProps> = ({ open, onOpenChange, children }) => {
  const [isOpen, setIsOpen] = React.useState(open || false)

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])

  return (
    <AlertDialogContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </AlertDialogContext.Provider>
  )
}

const AlertDialogTrigger: React.FC<AlertDialogTriggerProps> = ({ asChild, children }) => {
  const { onOpenChange } = React.useContext(AlertDialogContext)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: () => onOpenChange(true),
    })
  }

  return (
    <button onClick={() => onOpenChange(true)}>
      {children}
    </button>
  )
}

const AlertDialogContent: React.FC<AlertDialogContentProps> = ({ className, children, ...props }) => {
  const { open, onOpenChange } = React.useContext(AlertDialogContext)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/80"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "relative z-50 grid w-full max-w-lg gap-4 border border-[#E0E0E0] bg-white p-6 shadow-lg sm:rounded-lg",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

const AlertDialogHeader: React.FC<AlertDialogHeaderProps> = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)

const AlertDialogFooter: React.FC<AlertDialogFooterProps> = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)

const AlertDialogTitle: React.FC<AlertDialogTitleProps> = ({ className, ...props }) => (
  <h2
    className={cn("text-lg font-semibold text-[#333333]", className)}
    {...props}
  />
)

const AlertDialogDescription: React.FC<AlertDialogDescriptionProps> = ({ className, ...props }) => (
  <p
    className={cn("text-sm text-[#9E9E9E]", className)}
    {...props}
  />
)

const AlertDialogAction: React.FC<AlertDialogActionProps> = ({ className, ...props }) => (
  <Button
    className={cn("", className)}
    {...props}
  />
)

const AlertDialogCancel: React.FC<AlertDialogCancelProps> = ({ className, ...props }) => (
  <Button
    variant="outline"
    className={cn("mt-2 sm:mt-0", className)}
    {...props}
  />
)

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
