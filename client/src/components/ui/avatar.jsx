import * as React from "react"
import { cn } from "../../lib/utils"

const Avatar = ({ className, children }) => (
    <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}>
        {children}
    </div>
)

const AvatarImage = ({ className, src }) => (
    <img className={cn("aspect-square h-full w-full", className)} src={src} />
)

const AvatarFallback = ({ className, children }) => (
    <div className={cn("flex h-full w-full items-center justify-center rounded-full bg-zinc-800 text-xs", className)}>
        {children}
    </div>
)

export { Avatar, AvatarImage, AvatarFallback }
