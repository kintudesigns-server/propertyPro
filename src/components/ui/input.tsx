import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border-0 bg-[#F0F0F0] px-3 py-2 text-sm text-[#1D1D1F] transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#1D1D1F] placeholder:text-[#C7C7CC] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#007AFF]/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-1 aria-invalid:border-[#FF3B30] aria-invalid:ring-2 aria-invalid:ring-[#FF3B30]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }

