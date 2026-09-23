import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PlugSpot · Find a charger. Book your slot. Drive on.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PRIMARY = "#2F5BD3";
const INK = "#111827";
const MUTED = "#4B5563";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          color: INK,
          padding: "80px 96px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width={64} height={76} viewBox="0 0 40 48">
            <path
              d="M20 1.5c-9.665 0-17.5 7.611-17.5 17 0 5.9 3.516 11.32 7.646 15.79 4.145 4.484 8.998 8.048 9.352 8.298a.845.845 0 0 0 1.004 0c.354-.25 5.207-3.814 9.352-8.298C33.984 29.82 37.5 24.4 37.5 18.5c0-9.389-7.835-17-17.5-17Zm2.5 8.5-8 12h5l-2 8 8-12h-5l2-8Z"
              fill={PRIMARY}
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -0.5, color: INK }}>
            PlugSpot
          </div>
        </div>

        <div style={{ marginTop: 100, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 108, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02, color: INK }}>
            Find a charger.
          </div>
          <div style={{ fontSize: 108, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02, color: INK }}>
            Book your slot.
          </div>
          <div style={{ fontSize: 108, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02, color: PRIMARY }}>
            Drive on.
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: MUTED,
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
