import { useState, useCallback } from 'react';
import { getSupabase } from '../context/AuthContext';

export interface EmailData {
  to: string | string[];
  template?:
    | 'passwordReset'
    | 'welcome'
    | 'documentNotification'
    | 'paymentReminder';
  data?: Record<string, unknown>;
  subject?: string;
  html?: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  message: string;
  id?: string;
}

export function useEmail() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendEmail = useCallback(
    async (emailData: EmailData): Promise<EmailResult> => {
      setLoading(true);
      setError(null);

      try {
        const supabase = getSupabase();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(emailData),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error enviando email');
        }

        return {
          success: true,
          message: result.message || 'Email enviado exitosamente',
          id: result.id,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        return {
          success: false,
          message: errorMessage,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const sendDocumentNotification = useCallback(
    async (params: {
      to: string;
      nombre: string;
      documentType: string;
      uploadedBy: string;
      empresaName: string;
      viewUrl?: string;
    }) => {
      return sendEmail({
        to: params.to,
        template: 'documentNotification',
        data: {
          nombre: params.nombre,
          documentType: params.documentType,
          uploadedBy: params.uploadedBy,
          empresaName: params.empresaName,
          viewUrl:
            params.viewUrl || `${window.location.origin}/conecta/dashboard`,
        },
      });
    },
    [sendEmail]
  );

  const sendPaymentReminder = useCallback(
    async (params: {
      to: string;
      nombre: string;
      empresaName: string;
      monto: number;
      fechaVencimiento: string;
      plan: string;
      paymentUrl?: string;
    }) => {
      const formatter = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
      });

      return sendEmail({
        to: params.to,
        template: 'paymentReminder',
        data: {
          nombre: params.nombre,
          empresaName: params.empresaName,
          monto: formatter.format(params.monto),
          fechaVencimiento: params.fechaVencimiento,
          plan: params.plan,
          paymentUrl:
            params.paymentUrl || `${window.location.origin}/conecta/pagos`,
        },
      });
    },
    [sendEmail]
  );

  const sendWelcomeEmail = useCallback(
    async (params: { to: string; nombre: string }) => {
      return sendEmail({
        to: params.to,
        template: 'welcome',
        data: {
          nombre: params.nombre,
          loginUrl: `${window.location.origin}/conecta/login`,
        },
      });
    },
    [sendEmail]
  );

  return {
    sendEmail,
    sendDocumentNotification,
    sendPaymentReminder,
    sendWelcomeEmail,
    loading,
    error,
  };
}
