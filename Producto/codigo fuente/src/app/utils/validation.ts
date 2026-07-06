import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const registerSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
  companyName: z.string().min(2, 'Nombre de empresa requerido'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

export const documentUploadSchema = z.object({
  title: z.string().min(1, 'Título requerido'),
  category: z.string().min(1, 'Categoría requerida'),
  description: z.string().optional(),
})

export type LoginForm = z.infer<typeof loginSchema>
export type RegisterForm = z.infer<typeof registerSchema>
export type DocumentUploadForm = z.infer<typeof documentUploadSchema>

export function formatRut(value: string): string {

  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9)
  if (clean.length === 0) return ''
  if (clean.length === 1) return clean

  const body = clean.slice(0, -1).replace(/\D/g, '')
  const dv = clean.slice(-1)

  const bodyFormatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${bodyFormatted}-${dv}`
}

export function validateRut(value: string): boolean {
  if (!value) return false
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return false
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  if (!/^\d+$/.test(body)) return false

  if (parseInt(body, 10) < 1_000_000) return false

  let sum = 0
  let factor = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const res = 11 - (sum % 11)
  const expected = res === 11 ? '0' : res === 10 ? 'K' : String(res)
  return expected === dv
}