import * as React from "react"
import { cn } from "../../lib/utils"

export function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />
}

export function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-4", className)} {...props} />
}

export function FieldLabel({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />
}
