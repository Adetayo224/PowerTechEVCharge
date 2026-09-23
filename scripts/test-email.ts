import "dotenv/config";
import { Resend } from "resend";

const key = process.env.RESEND_API_KEY;
const fromRaw = process.env.EMAIL_FROM;
const to = process.argv[2] || "adetayosaka045@gmail.com";

if (!key || key.startsWith("paste_") || key.length < 20) {
  console.error("RESEND_API_KEY appears to be missing or a placeholder. Nothing sent.");
  process.exit(2);
}
if (!fromRaw) {
  console.error("EMAIL_FROM is missing.");
  process.exit(2);
}
const from: string = fromRaw;

const resend = new Resend(key);

const html = `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0a0a0a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden">
        <tr><td style="background:linear-gradient(180deg,#10B981,#047857);padding:24px 28px;color:#ffffff">
          <div style="font-size:14px;opacity:0.9">PlugSpot</div>
          <div style="font-size:22px;font-weight:700;margin-top:6px">PlugSpot email test</div>
        </td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 12px">Hi,</p>
          <p style="margin:0 0 20px;color:#374151;line-height:1.55">This is a test message from PlugSpot to verify that Resend delivery through samfredrobotics.com is live and correctly branded.</p>
          <p style="margin:0 0 24px">
            <a href="https://samfredrobotics.com" style="display:inline-block;background:linear-gradient(180deg,#10B981,#047857);color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:700;box-shadow:0 6px 18px rgba(4,120,87,0.35)">Visit PlugSpot</a>
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 28px;color:#6b7280;font-size:12px;text-align:center">PlugSpot · Built for PowerTech Nigeria</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

async function main() {
  const res = await resend.emails.send({
    from,
    to,
    subject: "PlugSpot email test",
    html,
  });
  if (res.error) {
    console.error("SEND FAILED:", res.error.message);
    process.exit(1);
  }
  console.log("Sent to:", to);
  console.log("Provider id:", res.data?.id);
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
