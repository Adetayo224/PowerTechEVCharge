export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="PlugSpot logo">
      <defs>
        <linearGradient id="ps-lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="ps-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#ps-lg)" />
      <rect x="2" y="2" width="60" height="30" rx="16" fill="url(#ps-gloss)" />
      {/* Location pin shape */}
      <path d="M32 12c-8.3 0-15 6.4-15 14.3 0 10.7 15 25.7 15 25.7s15-15 15-25.7C47 18.4 40.3 12 32 12z" fill="#ffffff"/>
      {/* Plug body inside the pin's circle area */}
      <rect x="24" y="19" width="16" height="14" rx="3" fill="url(#ps-lg)"/>
      <rect x="26.5" y="22" width="2.5" height="4" rx="1" fill="#ffffff"/>
      <rect x="35" y="22" width="2.5" height="4" rx="1" fill="#ffffff"/>
      <rect x="29.5" y="33" width="5" height="3" rx="1.2" fill="url(#ps-lg)"/>
      <rect x="30.8" y="36" width="2.4" height="4" rx="1" fill="url(#ps-lg)"/>
    </svg>
  );
}
