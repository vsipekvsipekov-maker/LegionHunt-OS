import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-2xl border text-[15px] font-semibold transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-white/20 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-white bg-white text-black hover:bg-white/88",
        outline: "border-white/12 bg-white/[0.025] text-white hover:border-white/22 hover:bg-white/[0.07]",
        secondary: "border-white/8 bg-white/[0.07] text-white hover:bg-white/[0.11]",
        ghost: "border-transparent bg-transparent text-white/62 hover:bg-white/[0.07] hover:text-white",
        destructive: "border-red-400/18 bg-red-400/10 text-red-200 hover:bg-red-400/16",
        link: "border-transparent bg-transparent p-0 text-white underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-2 px-4",
        xs: "h-8 gap-1.5 rounded-xl px-2.5 text-xs",
        sm: "h-9 gap-1.5 rounded-xl px-3 text-sm",
        lg: "h-12 gap-2 px-5",
        icon: "size-11 p-0",
        "icon-xs": "size-8 rounded-xl p-0",
        "icon-sm": "size-9 rounded-xl p-0",
        "icon-lg": "size-12 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

function Button({ className, variant = "default", size = "default", ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
