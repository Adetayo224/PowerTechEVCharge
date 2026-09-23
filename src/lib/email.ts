import { Resend } from "resend";
import { env } from "@/lib/env";
import { formatSlotLong } from "@/lib/booking";
import { formatNaira } from "@/lib/utils";

export async function sendBookingEmail(args: {
  to: string;
  reference: string;
  stationName: string;
  address: string;
  chargerLabel: string;
  startISO: string;
  cost: number;
  kwh: number;
}) {
  if (!env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return { skipped: true };
  }
  const resend = new Resend(env.RESEND_API_KEY);
  const start = new Date(args.startISO);
  const when = formatSlotLong(start);
  const html = `
  <div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f6f8f7;padding:24px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(2,44,34,0.08)">
      <div style="background:linear-gradient(180deg,#10B981,#047857);padding:24px;color:#fff">
        <div style="font-size:14px;opacity:0.9">PlugSpot</div>
        <div style="font-size:22px;font-weight:700;margin-top:6px">Your slot is confirmed</div>
      </div>
      <div style="padding:24px">
        <p style="margin:0 0 12px">Hi driver,</p>
        <p style="margin:0 0 16px">Your charging slot is booked. Show this reference at the station.</p>
        <div style="background:#f3f4f6;border-radius:14px;padding:16px;text-align:center;font-family:ui-monospace,monospace;font-size:22px;letter-spacing:3px;font-weight:700">${args.reference}</div>
        <table style="width:100%;margin-top:20px;font-size:14px;color:#374151">
          <tr><td style="padding:6px 0;color:#6b7280">Station</td><td style="text-align:right;font-weight:600">${args.stationName}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Address</td><td style="text-align:right">${args.address}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Charger</td><td style="text-align:right">${args.chargerLabel}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">When</td><td style="text-align:right">${when}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Estimated energy</td><td style="text-align:right">${args.kwh} kWh</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Estimated cost</td><td style="text-align:right;font-weight:700">${formatNaira(args.cost)}</td></tr>
        </table>
        <p style="margin-top:20px;color:#6b7280;font-size:12px">Need to cancel? Open PlugSpot and tap Bookings.</p>
      </div>
    </div>
  </div>`;
  const res = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: args.to,
    subject: `Slot confirmed · ${args.reference}`,
    html,
  });
  return res;
}
