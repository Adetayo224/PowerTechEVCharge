import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PlugSpot · Find a charger. Book your slot. Drive on.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #052e21 0%, #0a0a0a 100%)",
          color: "white",
          padding: "72px 88px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width={72} height={72} viewBox="0 0 64 64">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#10B981" />
                <stop offset="1" stopColor="#047857" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#g)" />
            <path d="M32 12c-8.3 0-15 6.4-15 14.3 0 10.7 15 25.7 15 25.7s15-15 15-25.7C47 18.4 40.3 12 32 12z" fill="#ffffff" />
            <rect x="24" y="19" width="16" height="14" rx="3" fill="url(#g)" />
            <rect x="26.5" y="22" width="2.5" height="4" rx="1" fill="#ffffff" />
            <rect x="35" y="22" width="2.5" height="4" rx="1" fill="#ffffff" />
            <rect x="29.5" y="33" width="5" height="3" rx="1.2" fill="url(#g)" />
            <rect x="30.8" y="36" width="2.4" height="4" rx="1" fill="url(#g)" />
          </svg>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>PlugSpot</div>
        </div>
        <div style={{ marginTop: 90, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05 }}>
            Find a charger.
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1.05,
              background: "linear-gradient(180deg,#10B981,#047857)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Book your slot. Drive on.
          </div>
        </div>
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#a3a3a3",
            fontSize: 24,
          }}
        >
          <div>plugspot.samfredrobotics.com</div>
          <div>Built for PowerTech Nigeria</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
