"use client";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Card(
  { className, ...props }, ref
) {
  return <div ref={ref} className={cn("glass rounded-2xl p-4", className)} {...props} />;
});

type ButtonProps = HTMLMotionProps<"button"> & { variant?: "primary" | "ghost" | "outline"; size?: "sm" | "md" | "lg" };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props }, ref
) {
  const sizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-sm", lg: "h-12 px-6 text-base" }[size];
  const variants = {
    primary: "btn-primary rounded-2xl font-semibold",
    ghost: "bg-transparent hover:bg-[var(--muted)] rounded-2xl text-foreground",
    outline: "border border-[var(--border)] rounded-2xl bg-[var(--card)] hover:bg-[var(--muted)] text-foreground",
  }[variant];
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      className={cn("inline-flex items-center justify-center gap-2 select-none", sizes, variants, className)}
      {...props}
    />
  );
});

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm outline-none",
        "placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-4 focus:ring-emerald-500/10",
        props.className
      )}
    />
  );
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="text-xs font-medium text-[var(--muted-foreground)]">{children}</label>;
}

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "success" | "warn" | "neutral" | "danger"; className?: string }) {
  const tones = {
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    neutral: "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  }[tone];
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", tones, className)}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}
