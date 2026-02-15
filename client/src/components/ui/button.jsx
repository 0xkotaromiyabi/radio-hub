import * as React from "react"
import { cn } from "../../lib/utils"

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
    const variants = {
        ghost: "hover:bg-zinc-800 text-zinc-400 hover:text-white",
        secondary: "bg-zinc-800 text-white hover:bg-zinc-700",
        default: "bg-blue-600 text-white hover:bg-blue-500",
    }
    const sizes = {
        icon: "h-9 w-9",
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
    }

    return (
        <button
            ref={ref}
            className={cn(
                "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
                variants[variant || "default"],
                sizes[size || "default"],
                className
            )}
            {...props}
        />
    )
})
Button.displayName = "Button"

export { Button }
