import * as React from "react"
import { cn } from "../../lib/utils"

const ScrollArea = ({ className, children, ...props }) => {
    return (
        <div className={cn("relative overflow-auto custom-scrollbar", className)} {...props}>
            {children}
        </div>
    )
}

export { ScrollArea }
