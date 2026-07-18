import { Resend } from "resend";

const fromEmail = process.env.EMAIL_FROM ?? "noreply@classphere.com";
const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export interface FacultyInviteParams {
  to: string;
  name: string;
  instituteName: string;
  tempPassword: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]!));
}

/** Sends credentials only through the configured delivery provider. */
export async function sendFacultyInviteEmail(params: FacultyInviteParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    // A console fallback leaked temporary passwords into application logs.
    throw new Error("Faculty email delivery is not configured. Set RESEND_API_KEY before creating faculty accounts.");
  }

  const recipient = escapeHtml(params.to);
  const name = escapeHtml(params.name);
  const institute = escapeHtml(params.instituteName);
  const password = escapeHtml(params.tempPassword);
  const html = `<p>Welcome, ${name}.</p><p>You have been added as faculty at ${institute}.</p><p>Email: ${recipient}<br>Temporary password: <code>${password}</code></p><p><a href="${appUrl}/login">Log in</a></p>`;
  const { error } = await new Resend(apiKey).emails.send({
    from: fromEmail,
    to: params.to,
    subject: `Faculty access for ${params.instituteName}`,
    html,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}
