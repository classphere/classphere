/**
 * mailer.ts
 * Sends transactional emails via Resend.
 * Set RESEND_API_KEY in .env to enable.
 * Falls back to console.log in dev if key is missing.
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");
const FROM_EMAIL = process.env.EMAIL_FROM ?? "noreply@classphere.com";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

// ─── Faculty Invite ────────────────────────────────────────────────────────────

export interface FacultyInviteParams {
  to: string;
  name: string;
  instituteName: string;
  tempPassword: string;
}

export async function sendFacultyInviteEmail(params: FacultyInviteParams): Promise<void> {
  const { to, name, instituteName, tempPassword } = params;

  const loginUrl = `${APP_URL}/login`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ${instituteName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:#0f0f0f;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">⚡ Classphere</p>
              <p style="margin:8px 0 0;font-size:13px;color:#9ca3af;">${instituteName}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f0f0f;letter-spacing:-0.02em;">Welcome, ${name}! 👋</p>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                You've been added as a faculty member at <strong>${instituteName}</strong> on Classphere. 
                Here are your login credentials:
              </p>

              <!-- Credentials card -->
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom:16px;">
                      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;letter-spacing:0.06em;text-transform:uppercase;">EMAIL</p>
                      <p style="margin:0;font-size:15px;color:#0f0f0f;font-weight:500;">${to}</p>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;letter-spacing:0.06em;text-transform:uppercase;">TEMPORARY PASSWORD</p>
                      <p style="margin:0;font-size:18px;color:#0f0f0f;font-weight:700;font-family:monospace;letter-spacing:0.08em;">${tempPassword}</p>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="margin:0 0 24px;font-size:13px;color:#9ca3af;">
                ⚠️ Please change your password after your first login.
              </p>

              <!-- CTA -->
              <a href="${loginUrl}" style="display:block;text-align:center;background:#0f0f0f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 24px;border-radius:10px;">
                Log In to Your Account →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                Sent by Classphere on behalf of ${instituteName}.<br/>
                If you weren't expecting this, please ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  if (!process.env.RESEND_API_KEY) {
    // Dev fallback — log to console instead of sending
    console.log(`[mailer] DEV MODE — Faculty invite email would be sent to ${to}`);
    console.log(`[mailer]   Name: ${name} | Institute: ${instituteName} | Temp PW: ${tempPassword}`);
    console.log(`[mailer]   Set RESEND_API_KEY in .env to enable real email sending.`);
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You've been added as faculty at ${instituteName} — Classphere`,
    html,
  });

  if (error) {
    console.error(`[mailer] Failed to send invite to ${to}:`, error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  console.log(`[mailer] Faculty invite sent to ${to}`);
}
