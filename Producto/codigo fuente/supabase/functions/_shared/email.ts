

interface ResendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendResendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<ResendResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail =
    Deno.env.get('RESEND_FROM_EMAIL') || 'SotLoy Conecta <onboarding@resend.dev>';

  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY no configurada' };
  }

  const testRedirect = Deno.env.get('EMAIL_TEST_REDIRECT');
  let to = params.to;
  let html = params.html;
  if (testRedirect) {
    const originalTo = Array.isArray(params.to) ? params.to.join(', ') : params.to;
    to = testRedirect;
    const banner = `<div style="background:#fff3cd;border:1px solid #ffe69c;border-radius:8px;padding:12px 16px;font-family:'Inter',sans-serif;font-size:13px;color:#664d03;margin:0 0 12px;">
      <strong>🧪 MODO PRUEBA</strong> — Este correo estaba destinado a: <strong>${originalTo}</strong>
    </div>`;
    html = banner + html;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject: params.subject,
        html,
        text: params.text || '',
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${errBody}` };
    }

    const data = await res.json();
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function passwordResetTemplate(data: {
  nombre: string;
  resetUrl: string;
  expiryHours: number;
}): { subject: string; html: string } {
  return {
    subject: '🔐 Recupera tu contraseña - SotLoy Conecta',
    html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.12); }
    .header { background: linear-gradient(135deg, #091f34 0%, #1e3a5f 100%); padding: 40px 30px; text-align: center; }
    .logo { font-size: 26px; color: #ffffff; font-weight: 700; }
    .logo span { color: #60a5fa; font-weight: 400; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 20px; font-weight: 600; color: #091f34; margin-bottom: 16px; }
    .message { font-size: 15px; line-height: 1.7; color: #4b5563; margin-bottom: 24px; }
    .button-container { text-align: center; margin: 32px 0; }
    .button { display: inline-block; background: #091f34; color: #ffffff !important; text-decoration: none; padding: 15px 38px; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .expiry-notice { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 18px; margin: 24px 0; border-radius: 0 8px 8px 0; }
    .expiry-notice p { font-size: 13px; color: #92400e; }
    .footer { background: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer-text { font-size: 12px; color: #64748b; }
    .support-text { font-size: 13px; color: #64748b; text-align: center; margin-top: 20px; word-break: break-all; }
    .support-text a { color: #091f34; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SotLoy<span>Conecta</span></div>
    </div>
    <div class="content">
      <h1 class="greeting">Hola ${data.nombre},</h1>
      <p class="message">
        Se creó una cuenta para ti en <strong>SotLoy Conecta</strong> (o solicitaste
        restablecer tu contraseña). Haz clic en el botón para establecer tu contraseña:
      </p>
      <div class="button-container">
        <a href="${data.resetUrl}" class="button">Establecer mi contraseña</a>
      </div>
      <div class="expiry-notice">
        <p>⏰ <strong>Importante:</strong> Este enlace expira en <strong>${data.expiryHours} horas</strong>. Si no esperabas este correo, puedes ignorarlo.</p>
      </div>
      <p class="support-text">
        ¿Problemas con el botón? Copia este enlace:<br>
        <a href="${data.resetUrl}">${data.resetUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p class="footer-text">© ${new Date().getFullYear()} SotLoy Conecta · Gestión laboral y de RRHH para Pymes.</p>
    </div>
  </div>
</body>
</html>`,
  };
}
