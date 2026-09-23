export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="Samfred Charge logo">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#lg)" />
      <path d="M34 8L14 36h14l-6 20 22-30H30l4-18z" fill="white" />
      <circle cx="47" cy="47" r="6" fill="white" opacity="0.9" />
      <rect x="44" y="41" width="2" height="4" rx="1" fill="url(#lg)" />
      <rect x="48" y="41" width="2" height="4" rx="1" fill="url(#lg)" />
    </svg>
  );
}
