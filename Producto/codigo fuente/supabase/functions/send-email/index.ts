import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendResendEmail } from '../_shared/email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const emailTemplates = {
  passwordReset: (data: {
    nombre: string;
    resetUrl: string;
    expiryHours: number;
  }) => ({
    subject: '🔐 Recupera tu contraseña - SotLoy Conecta',
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperar Contraseña - SotLoy Conecta</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #132140 0%, #1a3a6c 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      background: linear-gradient(135deg, #132140 0%, #1e3a5f 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      color: #ffffff;
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    .logo span {
      color: #60a5fa;
      font-weight: 400;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #132140;
      margin-bottom: 16px;
    }
    .message {
      font-size: 16px;
      line-height: 1.7;
      color: #4b5563;
      margin-bottom: 24px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #132140 0%, #1e3a5f 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 14px rgba(19, 33, 64, 0.3);
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(19, 33, 64, 0.4);
    }
    .expiry-notice {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px 20px;
      margin: 24px 0;
      border-radius: 0 8px 8px 0;
    }
    .expiry-notice p {
      font-size: 14px;
      color: #92400e;
      margin: 0;
    }
    .expiry-notice strong {
      color: #78350f;
    }
    .footer {
      background: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 12px;
    }
    .footer-links {
      font-size: 13px;
      color: #64748b;
    }
    .footer-links a {
      color: #132140;
      text-decoration: none;
      font-weight: 500;
    }
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 24px 0;
    }
    .support-text {
      font-size: 14px;
      color: #64748b;
      text-align: center;
      margin-top: 24px;
    }
    .support-text a {
      color: #132140;
      font-weight: 500;
      text-decoration: none;
    }
    @media (max-width: 480px) {
      .container { border-radius: 12px; }
      .header { padding: 30px 20px; }
      .content { padding: 30px 20px; }
      .button { padding: 14px 30px; font-size: 15px; }
    }
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
        Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>SotLoy Conecta</strong>.
        Para continuar con el proceso, haz clic en el botón de abajo:
      </p>

      <div class="button-container">
        <a href="${data.resetUrl}" class="button">Restablecer mi contraseña</a>
      </div>

      <div class="expiry-notice">
        <p>⏰ <strong>Importante:</strong> Este enlace expirará en <strong>${data.expiryHours} horas</strong> por seguridad. Si no solicitaste este cambio, puedes ignorar este correo.</p>
      </div>

      <div class="divider"></div>

      <p class="support-text">
        ¿Tienes problemas con el botón? Copia y pega este enlace en tu navegador:<br>
        <a href="${data.resetUrl}">${data.resetUrl}</a>
      </p>
    </div>

    <div class="footer">
      <p class="footer-text">
        © ${new Date().getFullYear()} SotLoy Conecta. Todos los derechos reservados.
      </p>
      <p class="footer-links">
        Gestión laboral y de RRHH simple y segura para Pymes.<br>
        <a href="https://sotloy.cl">www.sotloy.cl</a> |
        <a href="mailto:soporte@sotloy.cl">soporte@sotloy.cl</a>
      </p>
    </div>
  </div>
</body>
</html>
    `,
  }),

  welcome: (data: { nombre: string; loginUrl: string }) => ({
    subject: '🎉 Bienvenido a SotLoy Conecta - Tu gestión laboral simplificada',
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido - SotLoy Conecta</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #132140 0%, #1a3a6c 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      background: linear-gradient(135deg, #132140 0%, #1e3a5f 100%);
      padding: 50px 30px;
      text-align: center;
    }
    .logo {
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      color: #ffffff;
      font-weight: 600;
    }
    .logo span { color: #60a5fa; font-weight: 400; }
    .welcome-badge {
      display: inline-block;
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      padding: 10px 24px;
      border-radius: 50px;
      margin-top: 20px;
    }
    .welcome-badge span {
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 700;
      color: #132140;
      margin-bottom: 16px;
    }
    .message {
      font-size: 16px;
      line-height: 1.8;
      color: #4b5563;
      margin-bottom: 30px;
    }
    .features {
      background: #f8fafc;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    .features h3 {
      font-size: 16px;
      font-weight: 600;
      color: #132140;
      margin-bottom: 16px;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 14px;
      color: #4b5563;
    }
    .feature-icon {
      width: 24px;
      height: 24px;
      background: #132140;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      flex-shrink: 0;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #132140 0%, #1e3a5f 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 14px rgba(19, 33, 64, 0.3);
    }
    .footer {
      background: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text { font-size: 13px; color: #64748b; }
    @media (max-width: 480px) {
      .container { border-radius: 12px; }
      .header { padding: 40px 20px; }
      .content { padding: 30px 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SotLoy<span>Conecta</span></div>
      <div class="welcome-badge">
        <span>🎉 BIENVENIDO</span>
      </div>
    </div>

    <div class="content">
      <h1 class="greeting">¡Hola ${data.nombre}!</h1>

      <p class="message">
        Tu cuenta ha sido creada exitosamente. Estás a un paso de simplificar la gestión laboral y de RRHH de tu empresa.
      </p>

      <div class="features">
        <h3>Con SotLoy Conecta puedes:</h3>
        <div class="feature-item">
          <div class="feature-icon">✓</div>
          <span>Gestionar documentos laborales de forma segura</span>
        </div>
        <div class="feature-item">
          <div class="feature-icon">✓</div>
          <span>Recibir asesoría legal con nuestro Asistente IA</span>
        </div>
        <div class="feature-item">
          <div class="feature-icon">✓</div>
          <span>Administrar trabajadores y sus documentos</span>
        </div>
        <div class="feature-item">
          <div class="feature-icon">✓</div>
          <span>Cumplir con normativas chilenas actualizadas</span>
        </div>
      </div>

      <div class="button-container">
        <a href="${data.loginUrl}" class="button">Acceder a mi cuenta</a>
      </div>
    </div>

    <div class="footer">
      <p class="footer-text">
        © ${new Date().getFullYear()} SotLoy Conecta. Todos los derechos reservados.<br>
        <a href="https://sotloy.cl" style="color: #132140;">www.sotloy.cl</a>
      </p>
    </div>
  </div>
</body>
</html>
    `,
  }),

  documentNotification: (data: {
    nombre: string;
    documentType: string;
    uploadedBy: string;
    viewUrl: string;
    empresaName: string;
  }) => ({
    subject: `📄 Nuevo documento disponible - ${data.documentType}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo Documento - SotLoy Conecta</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #132140 0%, #1a3a6c 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      background: linear-gradient(135deg, #132140 0%, #1e3a5f 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      color: #ffffff;
      font-weight: 600;
    }
    .logo span { color: #60a5fa; font-weight: 400; }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #132140;
      margin-bottom: 16px;
    }
    .document-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      border-left: 4px solid #132140;
    }
    .document-type {
      font-size: 18px;
      font-weight: 600;
      color: #132140;
      margin-bottom: 8px;
    }
    .document-meta {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #132140 0%, #1e3a5f 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
    }
    .footer {
      background: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text { font-size: 13px; color: #64748b; }
    @media (max-width: 480px) {
      .container { border-radius: 12px; }
      .content { padding: 30px 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SotLoy<span>Conecta</span></div>
    </div>

    <div class="content">
      <h1 class="greeting">Hola ${data.nombre},</h1>

      <p style="font-size: 16px; line-height: 1.7; color: #4b5563; margin-bottom: 24px;">
        Se ha subido un nuevo documento relacionado contigo en <strong>${data.empresaName}</strong>:
      </p>

      <div class="document-card">
        <div class="document-type">📄 ${data.documentType}</div>
        <div class="document-meta">Subido por: ${data.uploadedBy}</div>
        <div class="document-meta">Fecha: ${new Date().toLocaleDateString('es-CL')}</div>
      </div>

      <div class="button-container">
        <a href="${data.viewUrl}" class="button">Ver documento</a>
      </div>

      <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 20px;">
        Si no puedes ver el botón, accede directamente desde tu dashboard.
      </p>
    </div>

    <div class="footer">
      <p class="footer-text">
        © ${new Date().getFullYear()} SotLoy Conecta |
        <a href="https://sotloy.cl" style="color: #132140;">www.sotloy.cl</a>
      </p>
    </div>
  </div>
</body>
</html>
    `,
  }),

  paymentReminder: (data: {
    nombre: string;
    empresaName: string;
    monto: string;
    fechaVencimiento: string;
    plan: string;
    paymentUrl: string;
  }) => ({
    subject: `💳 Recordatorio de pago - ${data.empresaName}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Pago - SotLoy Conecta</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #132140 0%, #1a3a6c 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      background: linear-gradient(135deg, #132140 0%, #1e3a5f 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      color: #ffffff;
      font-weight: 600;
    }
    .logo span { color: #60a5fa; font-weight: 400; }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #132140;
      margin-bottom: 16px;
    }
    .alert-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin: 24px 0;
      border-radius: 0 8px 8px 0;
    }
    .alert-box h3 {
      color: #92400e;
      font-size: 16px;
      margin-bottom: 8px;
    }
    .alert-box p {
      color: #78350f;
      font-size: 14px;
    }
    .payment-details {
      background: #f8fafc;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-size: 14px; color: #64748b; }
    .detail-value { font-size: 14px; font-weight: 600; color: #132140; }
    .amount { font-size: 24px; color: #132140; }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #132140 0%, #1e3a5f 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
    }
    .footer {
      background: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text { font-size: 13px; color: #64748b; }
    @media (max-width: 480px) {
      .container { border-radius: 12px; }
      .content { padding: 30px 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SotLoy<span>Conecta</span></div>
    </div>

    <div class="content">
      <h1 class="greeting">Hola ${data.nombre},</h1>

      <p style="font-size: 16px; line-height: 1.7; color: #4b5563; margin-bottom: 20px;">
        Te recordamos que tienes un pago pendiente para mantener activo tu servicio de <strong>SotLoy Conecta</strong>.
      </p>

      <div class="alert-box">
        <h3>⏰ Vencimiento próximo</h3>
        <p>Tu pago vence el <strong>${data.fechaVencimiento}</strong>. Evita la suspensión de tu servicio.</p>
      </div>

      <div class="payment-details">
        <div class="detail-row">
          <span class="detail-label">Empresa</span>
          <span class="detail-value">${data.empresaName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Plan</span>
          <span class="detail-value">${data.plan}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Monto</span>
          <span class="detail-value amount">$${data.monto}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Vencimiento</span>
          <span class="detail-value" style="color: #dc2626;">${data.fechaVencimiento}</span>
        </div>
      </div>

      <div class="button-container">
        <a href="${data.paymentUrl}" class="button">Realizar pago ahora</a>
      </div>

      <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 20px;">
        ¿Tienes dudas? Contáctanos en <a href="mailto:soporte@sotloy.cl" style="color: #132140;">soporte@sotloy.cl</a>
      </p>
    </div>

    <div class="footer">
      <p class="footer-text">
        © ${new Date().getFullYear()} SotLoy Conecta |
        <a href="https://sotloy.cl" style="color: #132140;">www.sotloy.cl</a>
      </p>
    </div>
  </div>
</body>
</html>
    `,
  }),

  paymentConfirmation: (data: {
    nombre: string;
    plan: string;
    monto: string;
    paymentId: string;
    fecha: string;
  }) => ({
    subject: `✅ Pago Confirmado - Plan ${data.plan}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pago Confirmado - SotLoy Conecta</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #132140 0%, #1a3a6c 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      background: linear-gradient(135deg, #132140 0%, #1e3a5f 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      color: #ffffff;
      font-weight: 600;
    }
    .logo span { color: #60a5fa; font-weight: 400; }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #132140;
      margin-bottom: 16px;
    }
    .success-box {
      background: #d1fae5;
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 24px 0;
      border-radius: 0 8px 8px 0;
    }
    .success-box h3 {
      color: #065f46;
      font-size: 16px;
      margin-bottom: 8px;
    }
    .success-box p {
      color: #047857;
      font-size: 14px;
    }
    .payment-details {
      background: #f8fafc;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-size: 14px; color: #64748b; }
    .detail-value { font-size: 14px; font-weight: 600; color: #132140; }
    .amount { font-size: 24px; color: #10b981; }
    .footer {
      background: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text { font-size: 13px; color: #64748b; }
    @media (max-width: 480px) {
      .container { border-radius: 12px; }
      .header { padding: 30px 20px; }
      .content { padding: 30px 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SotLoy<span>Conecta</span></div>
    </div>

    <div class="content">
      <h1 class="greeting">¡Hola ${data.nombre}!</h1>

      <div class="success-box">
        <h3>✅ Pago Confirmado Exitosamente</h3>
        <p>Hemos recibido y procesado tu pago. Tu plan está ahora activo.</p>
      </div>

      <div class="payment-details">
        <div class="detail-row">
          <span class="detail-label">Plan</span>
          <span class="detail-value">${data.plan}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Monto Pagado</span>
          <span class="detail-value amount">$${data.monto}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Fecha</span>
          <span class="detail-value">${data.fecha}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">ID de Pago</span>
          <span class="detail-value" style="font-size: 12px; font-family: monospace;">${data.paymentId}</span>
        </div>
      </div>

      <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 20px;">
        ¿Tienes dudas? Contáctanos en <a href="mailto:soporte@sotloy.cl" style="color: #132140;">soporte@sotloy.cl</a>
      </p>
    </div>

    <div class="footer">
      <p class="footer-text">
        © ${new Date().getFullYear()} SotLoy Conecta |
        <a href="https://sotloy.cl" style="color: #132140;">www.sotloy.cl</a>
      </p>
    </div>
  </div>
</body>
</html>
    `,
  }),
};

const PREFERENCE_AWARE_TEMPLATES: Record<string, 'documentAlerts'> = {
  documentNotification: 'documentAlerts',
};

async function recipientAllowsEmail(
  email: string,
  prefKey: 'documentAlerts'
): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return true;

  try {
    const url =
      `${supabaseUrl}/rest/v1/kv_store_7d36b31f` +
      `?value->>email=eq.${encodeURIComponent(email)}&select=value&limit=1`;
    const res = await fetch(url, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!res.ok) return true;

    const rows = await res.json();
    const prefs = rows?.[0]?.value?.preferences;
    if (!prefs) return true;

    if (prefs.emailNotifications === false) return false;

    if (prefs[prefKey] === false) return false;

    return true;
  } catch (_e) {
    return true;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY no configurada' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { to, template, data, subject, html, text } = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: 'El destinatario (to) es requerido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let emailContent: { subject: string; html: string } | null = null;

    if (template && emailTemplates[template as keyof typeof emailTemplates]) {
      const templateFn =
        emailTemplates[template as keyof typeof emailTemplates];
      emailContent = templateFn(data);
    } else if (subject && (html || text)) {

      emailContent = { subject, html: html || '' };
    } else {
      return new Response(
        JSON.stringify({
          error: 'Se requiere template válido o subject + html/text',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const prefKey = template
      ? PREFERENCE_AWARE_TEMPLATES[template as keyof typeof PREFERENCE_AWARE_TEMPLATES]
      : undefined;
    if (prefKey) {
      const recipientEmail = Array.isArray(to) ? to[0] : to;
      const allowed = await recipientAllowsEmail(recipientEmail, prefKey);
      if (!allowed) {
        console.log(`✉️  Omitido: ${recipientEmail} desactivó '${template}'`);
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            reason: 'El destinatario desactivó este tipo de notificación',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const result = await sendResendEmail({
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text,
    });

    if (!result.ok) {
      console.error('Error de Resend:', result.error);
      return new Response(
        JSON.stringify({ error: 'Error enviando email', details: result.error }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email enviado exitosamente',
        id: result.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error en send-email:', error);
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
