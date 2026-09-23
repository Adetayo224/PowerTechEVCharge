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
  <div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#ffffff;padding:32px 16px;color:#111827">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
      <div style="padding:24px 28px;border-bottom:1px solid #e5e7eb">
        <div style="font-size:13px;color:#4b5563;letter-spacing:0.3px">PlugSpot</div>
        <div style="font-size:22px;font-weight:700;margin-top:6px;color:#111827">Your slot is confirmed</div>
      </div>
      <div style="padding:24px 28px">
        <p style="margin:0 0 12px;font-size:15px">Hi driver,</p>
        <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.55">Your charging slot is booked. Show this reference at the station.</p>
        <div style="background:#f7f8fa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;text-align:center;font-family:ui-monospace,monospace;font-size:22px;letter-spacing:3px;font-weight:700;color:#111827">${args.reference}</div>
        <table style="width:100%;margin-top:20px;font-size:14px;color:#111827">
          <tr><td style="padding:6px 0;color:#4b5563">Station</td><td style="text-align:right;font-weight:600">${args.stationName}</td></tr>
          <tr><td style="padding:6px 0;color:#4b5563">Address</td><td style="text-align:right">${args.address}</td></tr>
          <tr><td style="padding:6px 0;color:#4b5563">Charger</td><td style="text-align:right">${args.chargerLabel}</td></tr>
          <tr><td style="padding:6px 0;color:#4b5563">When</td><td style="text-align:right">${when}</td></tr>
          <tr><td style="padding:6px 0;color:#4b5563">Estimated energy</td><td style="text-align:right">${args.kwh} kWh</td></tr>
          <tr><td style="padding:6px 0;color:#4b5563">Estimated cost</td><td style="text-align:right;font-weight:700">${formatNaira(args.cost)}</td></tr>
        </table>
        <p style="margin-top:20px;color:#4b5563;font-size:12px">Need to cancel? Open PlugSpot and tap Bookings.</p>
      </div>
      <div style="background:#f7f8fa;padding:14px 28px;color:#4b5563;font-size:12px;text-align:center;border-top:1px solid #e5e7eb">PlugSpot · Built for PowerTech Nigeria</div>
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
