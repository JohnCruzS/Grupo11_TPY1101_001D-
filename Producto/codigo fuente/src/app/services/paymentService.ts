import { getSupabase } from '../context/AuthContext'

const supabase = getSupabase()

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export interface PaymentData {
  empresaId: string
  plan: string
  monto: number
  concepto: string
  metodoPago: 'tarjeta' | 'webpay' | 'transferencia' | 'khipu'
  returnUrl?: string
  tipo?: 'auditoria' | 'plan'
}

export interface PaymentResponse {
  success: boolean
  paymentId?: string
  paymentUrl?: string
  message?: string
  error?: string
  emailSent?: boolean
}

export async function createTransferPayment(data: {
  empresaId: string
  plan: string
  monto: number
  concepto: string
  tipo?: 'auditoria' | 'plan'
}): Promise<PaymentResponse> {
  const { data: response, error } = await supabase.functions.invoke('payments-transfer', {
    body: data,
  })

  if (error) {
    let errorMsg = 'No se pudo registrar la transferencia'
    try {
      const ctx = (error as any).context
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json()
        if (body?.error) errorMsg = body.error
        else if (body?.message) errorMsg = body.message
      } else if (error.message && !error.message.includes('non-2xx')) {
        errorMsg = error.message
      }
    } catch {
      if (error.message) errorMsg = error.message
    }
    console.error('Error en payments-transfer:', errorMsg)
    return { success: false, error: errorMsg }
  }

  return response as PaymentResponse
}

export async function initiatePayment(data: PaymentData): Promise<PaymentResponse> {
  const { data: response, error } = await supabase.functions.invoke('payments-initiate', {
    body: {
      ...data,

      returnUrl: data.returnUrl ?? window.location.origin,
    }
  })

  if (error) {

    let errorMsg = 'No se pudo conectar con el servidor de pagos'
    try {
      const ctx = (error as any).context
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json()
        if (body?.error) errorMsg = body.error
        else if (body?.message) errorMsg = body.message
      } else if (error.message && !error.message.includes('non-2xx')) {
        errorMsg = error.message
      }
    } catch {
      if (error.message) errorMsg = error.message
    }
    console.error('Error en payments-initiate:', errorMsg)
    return { success: false, error: errorMsg }
  }

  return response as PaymentResponse
}

export async function confirmPayment(
  paymentId: string,
  transactionId: string,
  estado: 'exitoso' | 'fallido'
): Promise<PaymentResponse> {
  try {
    const { data: response, error } = await supabase.functions.invoke('payments-confirm', {
      body: { paymentId, transactionId, estado }
    })

    if (error) throw error

    return response as PaymentResponse
  } catch (error: any) {
    console.error('Error confirmando pago:', error)
    return {
      success: false,
      error: error.message || 'Error al confirmar el pago'
    }
  }
}

export async function getPaymentHistory(empresaId: string) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('fecha_creacion', { ascending: false })

    if (error) throw error

    return { success: true, payments: data }
  } catch (error: any) {
    console.error('Error obteniendo historial:', error)
    return { success: false, error: error.message }
  }
}

export async function getSubscriptionStatus(empresaId: string) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('empresa_id', empresaId)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return { success: true, subscription: data }
  } catch (error: any) {
    console.error('Error obteniendo suscripción:', error)
    return { success: false, error: error.message }
  }
}

export async function sendEmail(
  to: string,
  template: string,
  data: any
) {
  try {

    const { data: response, error } = await supabase.functions.invoke('send-email', {
      body: { to, template, data }
    })

    if (error) {

      console.log('⚠️ Edge Functions no disponible, guardando email para envío posterior')
      await savePendingEmail(to, template, data)
      return { success: true, queued: true, message: 'Email guardado para envío posterior' }
    }

    return response
  } catch (error: any) {

    console.log('⚠️ Error de conexión con Edge Functions, guardando email localmente')
    await savePendingEmail(to, template, data)
    return { success: true, queued: true, message: 'Email guardado para envío posterior' }
  }
}

async function savePendingEmail(to: string, template: string, data: any) {
  try {
    const { error } = await supabase.from('pending_emails').insert({
      to_email: to,
      template: template,
      template_data: data,
      status: 'pending',
      attempts: 0,
      created_at: new Date().toISOString()
    })

    if (error) {
      console.error('Error guardando email pendiente:', error)
    } else {
      console.log('📧 Email guardado en cola para envío posterior:', to)
    }
  } catch (err) {
    console.error('Error en savePendingEmail:', err)
  }
}
