"use client";
import { forwardRef } from "react";
import clsx from "clsx";

export const ScrollArea = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          "relative overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent",
          className
        )}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
ScrollArea.displayName = "ScrollArea";