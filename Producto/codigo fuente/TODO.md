# TODO — SotLoy Conecta

> Bitácora de pendientes y hallazgos.

## 📝 Pendientes

- [ ] Sección de pagos completa desde usuario Pyme
- [ ] Reforzar seguridad del cambio de contraseña en **UsuarioView.tsx** (vista del trabajador / rol "usuario", sección Perfil → Seguridad):
      - Falta campo "Contraseña Actual" y validarla antes del cambio (hoy `handleChangePassword` llama `updateUser` directo sin verificar la actual).
      - Aplicar reglas de complejidad (longitud mínima, mayúscula, número, carácter especial).
      - Protección contra intentos maliciosos.
      - Nota: `PerfilPage.tsx` SÍ valida la contraseña actual → unificar criterio entre ambas.
- [ ] **Responsividad móvil — "Documentos enviados"** (Módulo de empresas): la sección no se adapta a pantallas pequeñas. Componentes candidatos: `EnterpriseDocumentView.tsx`, `AdminView.tsx`, `SuperAdminView.tsx` (la tarjeta "Documentos (N)").
- [ ] **Auditoría general de responsividad móvil**: este tipo de problema es recurrente (ya pasó en la Home). Hacer una pasada por todas las vistas en ancho móvil (~360–390px) y tablet (~768px) y corregir overflows/cortes. Patrón de fix usado: grids con `minmax(min(100%, Xpx), 1fr)` en vez de anchos/columnas fijas.
- [ ] **Filtros de "Gestión Documental de la Empresa"** (componentes: `EnterpriseDocumentView.tsx`, `AdminView.tsx`):
      - El filtro por rango de fechas (Fecha desde / Fecha hasta) no ejecuta ninguna acción — no filtra los resultados.
      - Revisar TODOS los filtros (Categoría, Usuario, Buscar, Estado, fechas) y confirmar que cada uno filtra correctamente y que "Limpiar filtros" los resetea.
- [ ] **Validación de campos al crear/editar empresas y usuarios** (Panel Super Admin → `SuperAdminView.tsx`, formularios `companyForm` y `userForm`):
      - Correo electrónico con formato válido.
      - Teléfono con formato correcto (chileno).
      - RUT/identificación válido (dígito verificador) y no duplicado → ver RF-1.01 del ERS ("RUT inválido o ya registrado"). Hoy acepta cosas como "1111111111".
      - Campos obligatorios no vacíos, con mensajes claros por campo.
      - Revisar/usar `src/app/utils/validation.ts` (puede que ya tenga validadores) y aplicarlos en TODOS los formularios (crear y editar).
      - Nota: ya tocamos estos flujos hoy (contraseña por correo, manejo de email duplicado), pero falta la validación de formato de los campos.
- [ ] **Eliminación de cuentas falla a medias** (INVESTIGADO — causa raíz encontrada). Componentes: `delete-user/index.ts`, `SuperAdminView.tsx` (`handleDeleteUser`).
      - Síntoma: toast de error al eliminar, pero al recargar la cuenta "ya no está". Consola: `Database error deleting user`.
      - Causa: `delete-user` borra en orden (1) `user_enterprises`, (2) perfil KV Store, (3) `auth.admin.deleteUser`. El paso 3 FALLA pero los pasos 1-2 ya se ejecutaron → el perfil se borra (desaparece de la lista) pero **el usuario de Auth queda huérfano**. El HTTP 400 es correcto (sí falló), por eso el toast de error.
      - El `deleteUser` de Auth falla por restricciones FK hacia `auth.users`. Sospechoso principal: `audit_logs` es append-only (trigger `prevent_audit_log_mutation` bloquea DELETE) → al borrar el usuario la BD intenta tocar `audit_logs.user_id` y el trigger lo bloquea. Otros candidatos: `documents`, `loy_conversations`, `loy_messages`.
      - **ESTA ES LA MISMA CAUSA RAÍZ** del bug de "correo ya registrado" (el usuario de Auth nunca se borra → el correo queda ocupado).
      - Fixes a evaluar: (a) configurar `ON DELETE` adecuado en las FK hacia `auth.users` (CASCADE o SET NULL), tratando `audit_logs` con cuidado para conservar la trazabilidad sin bloquear; (b) en `delete-user`, intentar el borrado de Auth ANTES de borrar el perfil, y si falla no borrar nada (evitar estado parcial); (c) mejorar el mensaje al usuario.
- [ ] **Seguridad en eliminación de usuarios** (`delete-user/index.ts`, `SuperAdminView.tsx`). Estado actual y qué falta:
      - Confirmación de eliminación: ✅ existe `confirm()` en `handleDeleteUser`.
      - Verificación de permisos: ✅ la función valida `callerRole === 'superadmin'` + protege cuentas demo.
      - Registro de auditoría (logs): ⚠️ **HALLAZGO** — el `insertAuditLog(USER_DELETE)` está DESPUÉS del borrado de Auth, pero como ese borrado falla, la función hace `return` antes y **el log NUNCA se escribe**. → Por eso, al revisar `audit_logs`, la eliminación probablemente NO aparece. Mover el registro de auditoría para que también capture intentos/fallos, no solo éxitos.
      - Protección contra eliminaciones accidentales/no autorizadas: parcial (confirm + cuentas demo). Evaluar reforzar.
- [ ] **Revisión general de logs**: revisar `audit_logs` (¿se registran todas las acciones esperadas?) y los logs de las Edge Functions. Confirmar específicamente si las eliminaciones de usuario quedan registradas (según el hallazgo de arriba, probablemente no).

---

## 🤝 Checklist para la reunión con el cliente (dominio + producción)

**Averiguar / decidir con el cliente:**
- [ ] ¿Cuál es el dominio oficial? `sotloy.cl` vs `sotloyasesorias.cl` (hoy hay desajuste: sitio usa uno, correos otro).
- [ ] ¿Dónde está alojado hoy el DNS del dominio? (registrador / hosting / ¿ya Cloudflare?).
- [ ] ¿Quién tiene acceso para cambiar nameservers / registros DNS?
- [ ] ¿El dominio ya tiene sitio web y correos activos? (para migrarlos antes de tocar nameservers).
- [ ] Presupuestos de producción: OpenAI (hoy $1 de prueba) y Resend (plan según volumen).
- [ ] ¿Aprobación manual de normativa (Gatekeeper) será obligatoria? (decisión de negocio).

**Plan dominio → Cloudflare → Resend (cuando el cliente defina):**
- [ ] Crear/usar cuenta Cloudflare y agregar el dominio.
- [ ] Migrar TODOS los registros DNS existentes (web, correos, etc.) a Cloudflare ANTES de cambiar nameservers (para no caer nada).
- [ ] Cambiar nameservers del dominio a Cloudflare (propagación hasta 24–48h).
- [ ] Agregar los registros de verificación de Resend (SPF, DKIM, DMARC) en Cloudflare.
- [ ] Verificar el dominio en Resend.
- [ ] Cambiar secret `RESEND_FROM_EMAIL` a `SotLoy Conecta <noreply@dominio-oficial>`.
- [ ] Borrar secret `EMAIL_TEST_REDIRECT` (desactiva la redirección de pruebas).
- [ ] Probar que los correos llegan a destinatarios reales (no solo a sotocrinose@gmail.com).
- [ ] Beneficio extra de Cloudflare: activar protección (WAF/DDoS), SSL y CDN para la app.
