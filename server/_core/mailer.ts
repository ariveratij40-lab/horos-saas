import nodemailer from "nodemailer";
import { ENV } from "./env";

function createTransport() {
  // If no SMTP config, use a test/ethereal-like fallback that logs to console
  if (!ENV.smtpHost || !ENV.smtpUser) {
    return nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
  }

  return nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465,
    auth: {
      user: ENV.smtpUser,
      pass: ENV.smtpPass,
    },
    tls: {
      rejectUnauthorized: ENV.isProduction,
    },
  });
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string | null;
  resetUrl: string;
}): Promise<boolean> {
  const transport = createTransport();
  const displayName = opts.name ?? opts.to;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer contraseña</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1e3a5f;padding:32px 40px;text-align:center;">
              <div style="display:inline-block;background:#2563eb;border-radius:12px;width:48px;height:48px;line-height:48px;text-align:center;font-size:24px;font-weight:bold;color:#ffffff;margin-bottom:12px;">H</div>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">HOROS</h1>
              <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">Gestión de Pólizas y SLA</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;font-weight:600;">Restablecer contraseña</h2>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
                Hola <strong>${displayName}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para crear una nueva contraseña. Este enlace es válido por <strong>1 hora</strong>.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
                <tr>
                  <td align="center">
                    <a href="${opts.resetUrl}"
                       style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                      Restablecer contraseña
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.6;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;">
                <a href="${opts.resetUrl}" style="color:#2563eb;font-size:13px;">${opts.resetUrl}</a>
              </p>
              <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                  ⚠️ Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no será modificada.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                HOROS SaaS &copy; ${new Date().getFullYear()} · Este es un correo automático, no respondas a este mensaje.
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

  const text = `
Hola ${displayName},

Recibimos una solicitud para restablecer la contraseña de tu cuenta HOROS.

Para crear una nueva contraseña, visita el siguiente enlace (válido por 1 hora):
${opts.resetUrl}

Si no solicitaste este cambio, puedes ignorar este correo.

— HOROS SaaS
  `.trim();

  try {
    const info = await transport.sendMail({
      from: `"HOROS SaaS" <${ENV.smtpFrom}>`,
      to: opts.to,
      subject: "Restablecer contraseña — HOROS",
      text,
      html,
    });

    // If using stream transport (no SMTP configured), log the email to console
    if (!ENV.smtpHost || !ENV.smtpUser) {
      console.log("[Mailer] SMTP not configured — email would have been sent to:", opts.to);
      console.log("[Mailer] Reset URL:", opts.resetUrl);
    } else {
      console.log("[Mailer] Password reset email sent to:", opts.to, "messageId:", info.messageId);
    }
    return true;
  } catch (error) {
    console.error("[Mailer] Failed to send password reset email:", error);
    return false;
  }
}

/**
 * Generic email sender — use for any transactional email beyond password reset.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const transport = createTransport();
  try {
    const info = await transport.sendMail({
      from: `"HOROS SaaS" <${ENV.smtpFrom ?? "noreply@horos.mx"}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text ?? opts.html.replace(/<[^>]+>/g, ""),
      html: opts.html,
    });

    if (!ENV.smtpHost || !ENV.smtpUser) {
      console.log("[Mailer] SMTP not configured — email would have been sent to:", opts.to);
      console.log("[Mailer] Subject:", opts.subject);
    } else {
      console.log("[Mailer] Email sent to:", opts.to, "messageId:", info.messageId);
    }
    return true;
  } catch (error) {
    console.error("[Mailer] Failed to send email:", error);
    return false;
  }
}
