import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-ink placeholder:text-ink/40",
        "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
