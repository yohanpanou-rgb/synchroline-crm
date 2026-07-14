import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm text-ink placeholder:text-ink/40",
        "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
