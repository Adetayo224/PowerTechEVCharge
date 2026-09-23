"use client";
import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className, ...props }, ref
) {
  const [reveal, setReveal] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        type={reveal ? "text" : "password"}
        {...props}
        className={cn(
          "h-11 w-full field pl-3.5 pr-11 text-sm text-foreground placeholder:text-[var(--muted-foreground)] focus:outline-none",
          className
        )}
      />
      <button
        type="button"
        onClick={() => setReveal((r) => !r)}
        aria-label={reveal ? "Hide password" : "Show password"}
        aria-pressed={reveal}
        tabIndex={-1}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-foreground hover:bg-[var(--surface)] transition-colors"
      >
        {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
