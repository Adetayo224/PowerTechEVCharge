"use client";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Card(
  { className, ...props }, ref
) {
  return <div ref={ref} className={cn("surface p-4", className)} {...props} />;
});

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";
type ButtonProps = HTMLMotionProps<"button"> & { variant?: Variant; size?: Size };

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
};

const VARIANT: Record<Variant, string> = {
  primary: "btn-primary rounded-xl font-semibold",
  outline: "btn-outline rounded-xl font-medium",
  ghost: "btn-ghost rounded-xl font-medium",
  danger: "btn-danger rounded-xl font-semibold",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props }, ref
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 500, damping: 34 }}
      className={cn("inline-flex items-center justify-center gap-2 select-none focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]", SIZE[size], VARIANT[variant], className)}
      {...props}
    />
  );
});

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full field px-3.5 text-sm text-foreground placeholder:text-[var(--muted-foreground)]",
        "focus:outline-none",
        props.className
      )}
    />
  );
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="text-xs font-medium text-[var(--muted-foreground)]">{children}</label>;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "primary" | "accent" | "neutral";
  className?: string;
}) {
  const tones = {
    primary: "bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)]/25",
    accent: "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/25",
    neutral: "bg-[var(--surface)] text-[var(--muted-foreground)] border border-[var(--border)]",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
        tones,
        className
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}
