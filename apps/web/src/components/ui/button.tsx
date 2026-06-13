import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all disabled:opacity-40 disabled:pointer-events-none focus-visible:shadow-focus",
  {
    variants: {
      variant: {
        primary: "bg-violet text-white hover:bg-violet-hover hover:-translate-y-px shadow-sm hover:shadow-md",
        secondary: "bg-paper text-ink border border-line hover:bg-paper-3",
        ghost: "bg-transparent text-ink-soft hover:bg-paper-3",
        link: "bg-transparent text-violet hover:underline px-0",
        danger: "bg-red text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
