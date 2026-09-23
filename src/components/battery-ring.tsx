"use client";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

export function BatteryRing({
  percent,
  size = 96,
  stroke = 8,
}: { percent: number; size?: number; stroke?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = display;
    const to = Math.max(0, Math.min(100, percent));
    const dur = 700;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / dur);
      setDisplay(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - display / 100);
  const colour = display < 15 ? "var(--accent)" : "var(--primary)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={colour} strokeWidth={stroke} fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xl font-bold tabular-nums">{Math.round(display)}%</div>
        <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Battery</div>
      </div>
    </div>
  );
}
