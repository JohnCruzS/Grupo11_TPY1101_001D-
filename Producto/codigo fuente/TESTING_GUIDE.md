# Guía de Pruebas — SotLoy Conecta

> Documento de referencia para verificar manualmente los flujos críticos de la plataforma.
> URL dev: `http://localhost:5173` | Supabase: `qpttobsxyvmaxtmzcver.supabase.co`

---

## Credenciales de Prueba

> Crear estas cuentas en Supabase Auth → Users antes de iniciar las pruebas.

| Rol | Email sugerido | Notas |
|---|---|---|
| `superadmin` | superadmin@sotloy.cl | Control total, Gatekeeper LOY |
| `admin` | admin@sotloy.cl | Gestión de empresas y documentos |
| `empresa` | empresa@pyme-a.cl | Pyme A — buzón de insumos |
| `empresa` | empresa@pyme-b.cl | Pyme B — para probar aislamiento |
| `usuario` | trabajador@pyme-a.cl | Solo lectura de sus documentos |

---

## Flujo 1 — Autenticación y Sesión

### Pasos

1. Ir a `http://localhost:5173/conecta`
2. Intentar acceder sin login → debe redirigir al formulario de login
3. Ingresar credenciales incorrectas → debe mostrar error sin revelar detalles internos
4. Ingresar credenciales correctas como `admin` → debe cargar el dashboard de admin
5. Esperar 8 horas sin actividad (o verificar en Supabase Dashboard → Auth → JWT expiry = 28800 seg)
6. Cerrar sesión → verificar que redirige al login y limpia el estado

### Qué verificar

- [ ] Redireccion correcta por rol (superadmin, admin, empresa, usuario → vistas distintas)
- [ ] El JWT expira en máximo 8 horas (configurar en Supabase Dashboard → Auth Settings)
- [ ] El logout elimina la sesión completamente (sin token en localStorage residual)
- [ ] Usuarios de empresa suspendida ven mensaje "Acceso suspendido por mora"

---

## Flujo 2 — Aislamiento Multi-tenant (Seguridad Crítica)

### Pasos

1. Iniciar sesión como `empresa@pyme-a.cl`
2. Navegar a la sección de documentos → anotar los IDs de documentos visibles
3. Cerrar sesión e iniciar como `empresa@pyme-b.cl`
4. Intentar acceder directamente via URL a un documento de Pyme A
5. Usando las DevTools del navegador, intentar hacer una petición a Supabase alterando `enterprise_id`

### Qué verificar

- [ ] Pyme B NO ve documentos de Pyme A en la UI
- [ ] Petición directa a Supabase con enterprise_id ajeno retorna array vacío (no error 500)
- [ ] El Storage no entrega URL firmada para archivos de otro tenant

---

## Flujo 3 — Gestión de Documentos (Admin)

### Pasos

1. Iniciar sesión como `admin`
2. Ir a la sección de carga de documentos
3. Subir un PDF de prueba asignado a una empresa y trabajador específico
4. Verificar en Supabase SQL Editor:
   ```sql
   SELECT id, original_name, file_type, enterprise_id, uploaded_at
   FROM documents ORDER BY uploaded_at DESC LIMIT 5;
   ```
5. Intentar subir el mismo archivo nuevamente (mismo nombre + tipo + empresa + usuario)
6. Verificar que el sistema retorna error 409 con mensaje de duplicado
7. Intentar subir con la opción "Nueva Versión" → debe proceder

### Qué verificar

- [ ] El documento aparece en la tabla `documents` con los metadatos correctos
- [ ] El archivo existe en Supabase Storage bajo `enterprises/{id}/`
- [ ] Segunda carga del mismo archivo retorna error de duplicado (HTTP 409)
- [ ] El audit log registra `DOCUMENT_UPLOAD` con IP y user-agent

---

## Flujo 4 — Descarga Segura (Usuario Trabajador)

### Pasos

1. Iniciar sesión como `trabajador@pyme-a.cl`
2. Ir a la sección "Mis Documentos"
3. Hacer click en descargar un documento propio
4. Copiar la URL firmada generada
5. Esperar 61 minutos y pegar la URL en el navegador

### Qué verificar

- [ ] La URL de descarga expira exactamente a los 60 minutos (3600 seg)
- [ ] Después de 60 min, la URL retorna error 400/403 de Supabase Storage
- [ ] La descarga registra entrada en `audit_logs` con acción `DOCUMENT_DOWNLOAD`
- [ ] La entrada `document_views` se crea con viewer_id, IP y user-agent

---

## Flujo 5 — LOY Asistente Legal (IA)

### Pasos

1. Iniciar sesión como `admin` o `empresa`
2. Ir al módulo LOY / Chat
3. Verificar que aparece el timestamp "Base legal actualizada al: DD/MM/AAAA" en el header
4. Enviar la consulta: *"¿Cuántos días de vacaciones corresponden por ley?"*
5. Esperar respuesta
6. Enviar una pregunta fuera de alcance: *"¿Cuánto cuesta un kilo de pan?"*

### Qué verificar

- [ ] El header muestra la fecha de última actualización de la base legal
- [ ] La respuesta incluye el disclaimer: *"Esta respuesta es solo orientativa..."*
- [ ] La respuesta incluye una sección de fuentes (nombre de ley o dictamen)
- [ ] Para pregunta fuera de alcance: responde *"No tengo información suficiente en mi base de conocimientos..."*
- [ ] El historial de conversación se guarda en `loy_messages` (verificar en Supabase)

---

## Flujo 6 — Gatekeeper LOY (Solo SuperAdmin)

> **Nota:** El Spider actualmente inserta documentos en estado `pending` (corregido). El Gatekeeper es el paso que los aprueba.

### Pasos

1. Iniciar sesión como `superadmin`
2. Ir al panel Gatekeeper (sección LOY → Gestión de Conocimiento)
3. Verificar que existen documentos con `status = 'pending'`
4. Aprobar un documento → verificar que cambia a `status = 'approved'`
5. Rechazar un documento → verificar que se elimina o queda en `status = 'rejected'`
6. Iniciar sesión como `admin` → verificar que NO tiene acceso al Gatekeeper

### Qué verificar

- [ ] Solo `superadmin` ve el panel Gatekeeper
- [ ] Los documentos spider aparecen en `pending` (no auto-aprobados)
- [ ] Tras aprobar, el documento queda disponible para respuestas de LOY
- [ ] La aprobación queda registrada en `audit_logs`

---

## Flujo 7 — Pagos Flow Chile

### Pasos (usar entorno Sandbox de Flow)

1. Configurar `VITE_FLOW_BASE_URL=https://sandbox.flow.cl/api` en `.env`
2. Iniciar sesión como `admin` → ir a Pagos
3. Iniciar un pago → anotar el `commerceOrder` generado
4. Completar el pago en el entorno Sandbox de Flow
5. Esperar el webhook (máximo 30 segundos)
6. Verificar en Supabase SQL Editor:
   ```sql
   SELECT estado, flow_order_id, confirmed_by_webhook, fecha_pago
   FROM payments WHERE flow_order_id = '<commerceOrder>';

   SELECT estado FROM subscriptions WHERE empresa_id = '<empresa_id>';

   SELECT subscription_status FROM enterprises WHERE id = '<empresa_id>';
   ```

### Qué verificar

- [ ] El pago cambia a `estado = 'completed'` tras recibir webhook con `flowStatusCode = 2`
- [ ] La suscripción cambia a `estado = 'active'`
- [ ] La empresa cambia a `subscription_status = 'active'`
- [ ] El webhook se procesa en menos de 30 segundos
- [ ] El `audit_logs` registra `SUBSCRIPTION_UPDATE`
- [ ] La firma HMAC-SHA256 del webhook es verificada (si la firma es incorrecta, debe rechazarse)

---

## Flujo 8 — Spider y Base de Conocimientos LOY

### Pasos

1. En Supabase Dashboard → Edge Functions, invocar `web-spider-dt` manualmente
2. Verificar los logs de la ejecución en Supabase Dashboard
3. Verificar en SQL Editor:
   ```sql
   -- Nuevos documentos deben estar en pending
   SELECT id, title, status, created_at
   FROM loy_knowledge_documents
   WHERE status = 'pending'
   ORDER BY created_at DESC LIMIT 10;

   -- Log de ejecución del spider
   SELECT * FROM loy_spider_logs ORDER BY created_at DESC LIMIT 5;
   ```

### Qué verificar

- [ ] Los nuevos documentos insertados tienen `status = 'pending'` (NO `approved`)
- [ ] `loy_spider_logs` registra la ejecución con `status = 'success'`, `items_found` e `items_processed`
- [ ] No se insertan duplicados (verificar por URL y hash SHA-256 del contenido)
- [ ] El spider respeta el delay de 1200ms entre peticiones

---

## Flujo 9 — Audit Log (Inmutabilidad)

### Pasos

1. Iniciar sesión como `superadmin`
2. Ejecutar cualquier acción auditada (login, descarga, etc.)
3. En Supabase SQL Editor, verificar la entrada creada:
   ```sql
   SELECT action, user_id, ip_address, user_agent, timestamp, success
   FROM audit_logs ORDER BY timestamp DESC LIMIT 5;
   ```
4. Intentar borrar o modificar una entrada del audit log:
   ```sql
   -- Debe fallar con "audit_logs es append-only"
   DELETE FROM audit_logs WHERE id = '<id>';
   UPDATE audit_logs SET action = 'HACK' WHERE id = '<id>';
   ```

### Qué verificar

- [ ] Cada acción registra IP, user-agent, timestamp del servidor y user_id
- [ ] El intento de DELETE retorna excepción `audit_logs es append-only`
- [ ] El intento de UPDATE retorna excepción `audit_logs es append-only`
- [ ] Solo `superadmin` puede ver el audit log global desde la UI

---

## Flujo 10 — Accesibilidad (WCAG 2.1 AA)

### Pasos

1. Instalar extensión axe DevTools en Chrome o Firefox
2. Navegar a `http://localhost:5173/conecta` (login) y ejecutar el análisis
3. Navegar al dashboard de cada rol y ejecutar el análisis
4. Probar navegación solo con teclado (Tab, Enter, Esc, flechas)
5. Verificar contraste de colores con DevTools → Accessibility

### Qué verificar

- [ ] Zero errores críticos de WCAG 2.1 AA en axe DevTools
- [ ] Todos los botones y inputs tienen `aria-label` o texto visible
- [ ] El formulario de login es navegable completamente con teclado
- [ ] El contraste de texto sobre fondos cumple ratio mínimo 4.5:1
- [ ] Los modales atrapan el foco (focus trap) y se cierran con Esc

---

## Sanity Checks de Base de Datos

Ejecutar en Supabase SQL Editor para verificar integridad del sistema:

```sql
-- 1. Base vectorial activa
SELECT COUNT(*) AS total_docs, 
       COUNT(*) FILTER (WHERE status = 'approved') AS aprobados,
       COUNT(*) FILTER (WHERE status = 'pending') AS pendientes
FROM loy_knowledge_documents;
-- Esperado: total >= 1507, aprobados >= 1507 (datos previos al fix del spider)

-- 2. Integridad relacional LOY
SELECT COUNT(*) FROM loy_messages m
  JOIN loy_conversations c ON m.conversation_id = c.id;
-- No debe lanzar error

-- 3. Semilla de categorías
SELECT COUNT(*) FROM document_legal_categories;
-- Esperado: 55

-- 4. Sanity check post-restauración
SELECT COUNT(*) FROM loy_conversations;
-- Esperado: 14

-- 5. RLS activado en tablas LOY
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('loy_messages','loy_conversations','documents','audit_logs','payments','subscriptions','enterprises');
-- rowsecurity debe ser 't' (true) para todas

-- 6. Trigger append-only existe
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_audit_logs_no_update';
-- Debe retornar 1 fila
```

---

## Checklist de Despliegue a Producción

Antes de hacer deploy, verificar:

- [ ] Ejecutar `sql/security_rls_and_flow.sql` completo en Supabase SQL Editor (incluye nuevo RLS de LOY)
- [ ] Verificar variables de entorno en Supabase Dashboard → Edge Functions → Secrets
- [ ] Confirmar `LOY_USE_VECTOR_SEARCH=true` en los secrets de Edge Functions
- [ ] Confirmar que el bucket `documents` está en modo privado (`public = false`)
- [ ] JWT expiry configurado en 28800 segundos (8 horas) en Supabase Auth Settings
- [ ] Ejecutar los sanity checks de BD después del deploy
- [ ] Correr `npm run build` y verificar que no hay errores de TypeScript
- [ ] Ejecutar `npm run test:run` y confirmar que todos los tests pasan

---

*Guía generada: 25 Mayo 2026 | Versión del código auditado: branch main*
