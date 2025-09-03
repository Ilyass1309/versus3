"use client";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import clsx from "clsx";

const styles = cva(
  "relative inline-flex select-none items-center justify-center gap-2 rounded-md font-medium outline-none transition focus-visible:ring-2 ring-offset-2 ring-offset-transparent ring-accent/60 disabled:opacity-40 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        solid: "bg-accent text-accent-fg hover:bg-indigo-500",
        ghost: "bg-white/5 hover:bg-white/10",
        danger: "bg-red-600 text-white hover:bg-red-500",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-14 px-6 text-base",
      },
      glow: { true: "shadow-glow" },
      pressed: { true: "scale-[0.97]" },
      pending: { true: "animate-pulse" },
    },
    defaultVariants: {
      variant: "solid",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref">,
    VariantProps<typeof styles> {
  glow?: boolean;
  pressed?: boolean;
  pending?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, glow, pressed, pending, ...rest }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={!rest.disabled ? { scale: 0.96 } : undefined}
        className={clsx(styles({ variant, size, glow, pressed, pending }), className)}
        {...rest}
      />
    );
  }
);
Button.displayName = "Button";