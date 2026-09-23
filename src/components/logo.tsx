import { cn } from "@/lib/utils";

/**
 * PlugSpot mark: a map pin whose inner negative space is a lightning bolt.
 * No face, no eyes, no character. Geometric, minimal.
 */
export function LogoMark({ size = 32, className, color = "var(--primary)" }: { size?: number; className?: string; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 48"
      aria-label="PlugSpot"
      className={className}
      fill="none"
    >
      {/* Pin body with bolt cut out via evenodd */}
      <path
        d="M20 1.5c-9.665 0-17.5 7.611-17.5 17 0 5.9 3.516 11.32 7.646 15.79 4.145 4.484 8.998 8.048 9.352 8.298a.845.845 0 0 0 1.004 0c.354-.25 5.207-3.814 9.352-8.298C33.984 29.82 37.5 24.4 37.5 18.5c0-9.389-7.835-17-17.5-17Zm2.5 8.5-8 12h5l-2 8 8-12h-5l2-8Z"
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function LogoWordmark({ size = 28, className }: { size?: number; className?: string }) {
  const height = size;
  const mark = height;
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={mark} />
      <span
        className="font-semibold tracking-tight text-foreground"
        style={{ fontSize: Math.round(mark * 0.72), lineHeight: 1 }}
      >
        PlugSpot
      </span>
    </div>
  );
}

export function LogoMono({ size = 32, className }: { size?: number; className?: string }) {
  return <LogoMark size={size} color="currentColor" className={className} />;
}

// Back-compat: existing callers imported `Logo`. Keep it as an alias for the mark.
export const Logo = LogoMark;
