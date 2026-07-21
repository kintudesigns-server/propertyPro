import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg text-sm font-semibold whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[#007AFF] text-white hover:bg-[#0066D9] active:bg-[#0051AF] shadow-xs",
        outline:
          "border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F0F0F0] active:bg-[#E5E5EA]",
        secondary:
          "bg-[rgba(60,60,67,0.08)] text-[#1D1D1F] hover:bg-[rgba(60,60,67,0.14)] active:bg-[rgba(60,60,67,0.20)]",
        ghost:
          "text-[#1D1D1F] hover:bg-[rgba(60,60,67,0.06)] active:bg-[rgba(60,60,67,0.12)]",
        destructive:
          "bg-[#FF3B30] text-white hover:bg-[#D70015] active:bg-[#B00010] shadow-xs",
        link: "text-[#007AFF] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 min-h-[36px] gap-2 px-3.5 text-xs md:text-sm",
        xs: "h-7 min-h-[28px] gap-1 rounded-md px-2 text-xs",
        sm: "h-8 min-h-[32px] gap-1.5 rounded-md px-2.5 text-xs",
        lg: "h-11 min-h-[44px] gap-2 rounded-xl px-5 text-sm font-bold",
        icon: "size-9 min-h-[36px] min-w-[36px]",
        "icon-xs": "size-7 rounded-md",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

