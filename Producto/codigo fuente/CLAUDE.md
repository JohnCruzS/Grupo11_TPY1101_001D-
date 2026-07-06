# CLAUDE.md — SotLoy Conecta
## Guía Técnica Completa para Revisión de Código

> **Propósito:** Este documento es la fuente de verdad técnica para que el agente de Claude en VS Code revise el código del proyecto con pleno contexto arquitectónico, de negocio y de requerimientos. Cualquier corrección de código debe ser consistente con lo aquí definido.
>
> **Versión:** 1.5 — Sesión post-v1.29: contenido editable, Blog/SEO y hardening de pagos (24–25 Junio 2026, commits `visuales`/`cosas`/`arreglos`). Ver **sección 20** para todo lo de esta pasada (subsistema de contenido editable vía kv_store, Blog público + SEO, sistema de carpetas documentales, avisos segmentados/indicadores/notas de empresa, idempotencia y no-degradación en pagos de Flow, y varias correcciones). La **sección 19** (19 Junio, features y hardening de acceso) y la **18** (16 Junio, auditoría de seguridad) siguen siendo válidas como base previa.

---

## 1. IDENTIDAD Y CONTEXTO DEL PROYECTO

| Campo | Detalle |
|---|---|
| **Nombre** | SotLoy Conecta |
| **Tipo** | Plataforma SaaS Multi-tenant B2B |
| **Cliente** | SotLoy Asesorías |
| **Asignatura** | Taller Aplicado de Programación (TPY1101) |
| **Versión ERS** | 1.5 (26 Marzo 2026) |
| **Estado** | Sprint activo — avance 100% planificación estimada al corte Evaluación 2 |

### Equipo (Squad)

| Integrante | Rol | Responsabilidades clave |
|---|---|---|
| **Cristian Soto** | Lead Backend & Data Architect | PostgreSQL/RLS, API REST, JWT, infraestructura Cloud, encriptación AES-256, Audit Log, integración Flow |
| **John Cruz** | Full-Stack & AI Specialist | Frontend React/Vite, Motor RAG (LOY), Web Spider, embeddings vectoriales, UX/UI responsive |

---

## 2. STACK TECNOLÓGICO DEFINITIVO

> **CRÍTICO:** No sugerir cambios de stack. Estas decisiones están congeladas en el ERS v1.5.

### Frontend

- **Framework:** React 18 (NO Next.js — el proyecto usa Vite como bundler)
- **Build tool:** Vite 6.3.5
- **Routing:** React Router v7 (`createBrowserRouter`)
- **Estilos:** Tailwind CSS v4.1.12 (via `@tailwindcss/vite`, mobile-first, WCAG 2.1 nivel AA)
- **Lenguaje:** TypeScript
- **UI Components:** Radix UI (28 componentes) + Lucide React (iconos)
- **Forms:** React Hook Form v7 + Zod v4 + @hookform/resolvers
- **State global:** Zustand v5
- **Gráficos:** Recharts v2
- **Animaciones:** Motion v12 (Framer Motion)
- **Notificaciones/Toasts:** Sonner v2

> **IMPORTANTE:** El CLAUDE.md anterior indicaba Next.js 15 — esto era incorrecto. El proyecto usa React 18 con Vite. No existe `app router`, `server components`, ni archivos `page.tsx`/`layout.tsx` de Next. Las rutas se definen en `src/app/routes.tsx` con React Router.

### Backend / Infraestructura

- **BaaS principal:** Supabase (PostgreSQL 15 + Auth + Storage + Edge Functions + Realtime)
- **Base de datos:** PostgreSQL 15 con extensión `pgvector`
- **Cómputo serverless:** Supabase Edge Functions (Deno/TypeScript)
- **Tareas programadas:** `pg_cron` + `pg_net` (definido en ERS; configuración en servidor remoto)
- **Almacenamiento objetos:** Supabase Storage (bucket `documents`, privado, compatible S3, cifrado AES-256 en reposo)
- **Autenticación:** Supabase Auth con JWT, rotación de tokens, límite absoluto de sesión 1h (enforcement client-side en `AuthContext.tsx`, independiente del auto-refresh de Supabase)
- **Hash contraseñas:** Argon2id (obligatorio — no bcrypt, no SHA-256 para passwords)
- **Cifrado documentos:** AES-256 en reposo
- **Sellado documentos:** SHA-256 (fingerprint/hash del archivo PDF, no de contraseñas)
- **Comunicación:** TLS 1.2+ en tránsito (gestionado por Supabase/hosting)
- **Cloud provider subyacente:** AWS East US (us-east-1), instancia t4g.nano (ARM Graviton 64-bit)

### Inteligencia Artificial (Motor LOY)

- **Arquitectura:** RAG (Retrieval-Augmented Generation)
- **Búsqueda vectorial:** pgvector en PostgreSQL (función `search_loy_knowledge`)
- **Embeddings:** Hash-based determinístico local (función `createEmbedding` en Deno — NO usa Sentence Transformers externos)
  - Genera vectores de 1536 dimensiones a partir de un hash del texto
  - Sin dependencia de API externa para generar embeddings
- **LLM:** Multi-provider configurable vía variable `LOY_LLM_PROVIDER`:
  - `github` — GitHub Models API (gpt-4o-mini, por defecto si hay token)
  - `openai` — OpenAI API (gpt-4o-mini)
  - `groq` — Groq API (llama3-8b-8192)
  - `local` — Fallback sin LLM (respuesta basada solo en chunks recuperados)
- **Dato crítico:** Las consultas de Pymes NO se usan para entrenar modelos de OpenAI (acuerdo Enterprise)

### Automatización

- **Web Spider:** Supabase Edge Function en Deno/TypeScript (`supabase/functions/web-spider-dt/`)
  - No es Python — es TypeScript ejecutado en Deno (Edge Function de Supabase)
  - Apunta a `www.dt.gob.cl/legislacion/1624`
  - Delay por defecto: 1.200ms entre peticiones (`SPIDER_DELAY_MS`, configurable)
  - Límite páginas: 60 por defecto (`SPIDER_MAX_PAGES`, configurable)
  - Estado actual: inserta documentos con `status: 'approved'` directamente (ver nota Gatekeeper)
- **Email:** Resend (servicio externo, Edge Function `send-email`)
- **Pasarela de pagos:** Flow Chile (webhooks procesados via Edge Function `payments-confirm`)

### Repositorio y Control de Versiones

- **VCS:** GitHub con estrategia de branching definida
- **Lenguajes principales:** TypeScript (frontend React y Edge Functions Deno)

---

## 3. VARIABLES DE ENTORNO Y CONEXIÓN

### Variables del Frontend (prefijo `VITE_`)

```env
# Archivo: .env (en la raíz del proyecto — NO commitear .env real)
# Ver .env.example para el template completo

# Supabase (obligatorias para que arranque el frontend)
VITE_SUPABASE_URL=https://qpttobsxyvmaxtmzcver.supabase.co
VITE_SUPABASE_ANON_KEY=<clave_anonima_publica>

# Flow Chile (pagos — producción)
VITE_FLOW_API_KEY=<api_key_flow>
VITE_FLOW_SECRET_KEY=<secret_key_flow>
VITE_FLOW_BASE_URL=https://www.flow.cl/api

# OpenAI (frontend — si aplica)
VITE_OPENAI_API_KEY=<api_key_openai>
```

> **NOTA:** El prefijo es `VITE_` (no `NEXT_PUBLIC_`). Vite solo expone al navegador las variables con prefijo `VITE_`.

### Secrets de Edge Functions (configurados en Supabase Dashboard)

```env
# Supabase Service Role (nunca exponer en frontend)
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# LOY — proveedor LLM
LOY_LLM_PROVIDER=github        # opciones: github | openai | groq

# GitHub Models
GITHUB_MODELS_API_KEY=<token>
GITHUB_MODELS_BASE_URL=https://models.inference.ai.azure.com
GITHUB_MODELS_MODEL=gpt-4o-mini

# OpenAI (alternativo)
OPENAI_API_KEY=<api_key>
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Groq (alternativo)
GROQ_API_KEY=<api_key>
GROQ_MODEL=llama3-8b-8192

# Búsqueda vectorial LOY
LOY_USE_VECTOR_SEARCH=true     # habilitar búsqueda pgvector (además de keyword)

# Flow Chile (Edge Functions)
FLOW_API_KEY=<api_key_flow>
FLOW_SECRET_KEY=<secret_key_flow>
FLOW_API_URL=https://www.flow.cl/api   # o sandbox: https://sandbox.flow.cl/api

# Spider (opcionales, tienen defaults)
SPIDER_MAX_PAGES=60
SPIDER_DELAY_MS=1200

# Resend (email)
RESEND_API_KEY=<api_key_resend>
RESEND_FROM_EMAIL=SotLoy Conecta <noreply@sotloy.cl>
RESEND_FROM_NAME=SotLoy Conecta
```

### Archivo especial: `utils/supabase/info.tsx`

Este archivo es **autogenerado** y contiene el `projectId` y `publicAnonKey` hardcodeados. Es la fuente que usa `AuthContext.tsx`. No editar manualmente.

```typescript
// utils/supabase/info.tsx — AUTOGENERADO
export const projectId = 'qpttobsxyvmaxtmzcver';
export const publicAnonKey = '<anon_key>';
```

### Comandos de Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de entorno (copiar template)
cp .env.example .env
# Editar .env con las claves reales

# 3. Iniciar servidor de desarrollo
npm run dev
# → http://localhost:5173

# 4. Otros comandos útiles
npm run build        # Build de producción
npm run lint         # Linting ESLint
npm run format       # Formateo Prettier
npm run test         # Tests en modo watch (Vitest)
npm run test:run     # Tests una sola vez
```

> **IMPORTANTE:** El frontend se conecta directamente al Supabase remoto (producción). No se usa Supabase local (`supabase start`) en el flujo de desarrollo normal. El proxy de Vite (`/api`) apunta a las Edge Functions del proyecto remoto.

### Backup y Restauración (Base de Datos)

```bash
# Extracción de backup completo (producción)
pg_dump -h aws-0-us-east-1.pooler.supabase.com \
        -U postgres.qpttobsxyvmaxtmzcver \
        -d postgres \
        --clean --if-exists \
        -F p \
        -f backup_sotloy_produccion.sql

# Sanity check post-restauración (valor esperado obligatorio: 14)
# Ejecutar en Supabase SQL Editor:
SELECT COUNT(*) FROM loy_conversations;
```

---

## 4. ESQUEMA DE BASE DE DATOS EN PRODUCCIÓN

### Métricas del Servidor (Producción Actual)

- **Motor:** PostgreSQL 15
- **Total tablas transaccionales:** 20
- **CPU (reposo):** ~5%
- **Disco:** ~23% aprovisionado
- **RAM:** ~52% asignado
- **Conexiones:** 7 activas de 60 máximas (7/60 conns)

### Inventario de Tablas Críticas

| Tabla | Columnas | Registros actuales | Tamaño | Descripción |
|---|---|---|---|---|
| `loy_knowledge_documents` | 20 | 1.507 | 1.094 MB | **BASE VECTORIAL CORE DE IA** — tabla más crítica del sistema |
| `loy_messages` | 8 | 34 | 88 KB | Historial de chats con LOY |
| `loy_conversations` | 6 | 14 | 56 KB | Sesiones de chat (FK hacia loy_messages) |
| `loy_spider_logs` | 10 | 3 | 64 KB | Logs del Web Scraper |
| `documents` | 21 | 0 | 128 KB | Metadatos de archivos laborales |
| `document_legal_categories` | 12 | 55 | 144 KB | Categorías de leyes (55 registros semilla) |
| `document_views` | 15 | 0 | 112 KB | Logs de visualizaciones |
| `document_version` | 11 | 0 | 48 KB | Control de versiones de documentos |
| `enterprises` | 9 | 0 | 48 KB | Empresas clientes (Pymes) |
| `user_enterprises` | 6 | 0 | 80 KB | Asociación Usuario-Empresa |
| `empleados` | 18 | 0 | 56 KB | Nómina general de trabajadores |
| `subscriptions` | 12 | 0 | 32 KB | Planes comerciales activos |
| `payments` | 15 | 0 | 56 KB | Pasarela e historial de pagos |
| `audit_logs` | 16 | 4 | 96 KB | Trazabilidad inmutable de acciones |
| `kv_store_7d36b31f` | 4 | 18 | 48 KB | Persistencia clave-valor (perfiles de usuario) |
| `notificaciones` | — | — | — | Notificaciones internas por usuario |

### Relaciones Críticas (Integridad Referencial)

```sql
-- OBLIGATORIO: loy_messages.conversation_id → loy_conversations.id
-- OBLIGATORIO: documents.enterprise_id → enterprises.id
-- OBLIGATORIO: payments.empresa_id → enterprises.id
-- OBLIGATORIO: subscriptions.empresa_id → enterprises.id (UNIQUE)
-- OBLIGATORIO: empleados.empresa_id → enterprises.id
```

### Políticas RLS (Row Level Security)

> **REGLA DE ORO:** Toda tabla que maneje datos sensibles de un tenant DEBE tener RLS activado. Sin excepción.

**RLS ACTIVADO obligatoriamente en (verificado en producción, 16 jun 2026 — ver sección 18):**

- `documents` — metadatos de archivos laborales
- `audit_logs` — logs de auditoría interna
- `payments` — pasarela de pagos (con política `"Allow all"` pública eliminada)
- `subscriptions` — planes y facturación (con política `"Allow all"` pública eliminada)
- `enterprises` — datos de Pymes (RLS estaba desactivado en producción hasta el 16 jun 2026 por una migración incompleta; ya corregido)
- `document_views` — tracking de visualizaciones (INSERT ahora exige `viewer_id = auth.uid()`)
- `loy_messages` — mensajería privada
- `loy_conversations` — sesiones privadas
- `loy_knowledge_documents` — base vectorial de IA (RLS estaba desactivado en producción hasta el 16 jun 2026; las políticas ya existían pero nunca se activó el flag)
- `pending_emails` — cola de emails (la política original era literalmente "para desarrollo", quedó en prod; ahora solo INSERT autenticado)
- `storage.objects` (bucket `documents`) — archivos en Storage

**Vistas:** `document_view_stats` usa `security_invoker = on` (antes corría como `SECURITY DEFINER`, saltándose el RLS de `document_views`).

**RLS puede estar desactivado (justificado por negocio):**

- `document_legal_categories` — tabla de parametrización base, lectura rápida pública

**Tabla huérfana — NO USAR:** `notifications` (en inglés) existe en producción pero ningún código del repo la usa; la tabla real de notificaciones es `notificaciones` (español, ver fila en el inventario de tablas). No confundirlas.

### Funciones RBAC en Base de Datos

El sistema implementa helpers SQL que leen el perfil del usuario desde `kv_store_7d36b31f`. Todas tienen `search_path` fijado explícitamente a `public` (corregido 16 jun 2026 — antes eran mutables, riesgo de search_path hijacking; ver sección 18). Ninguna es `SECURITY DEFINER` excepto `current_profile()`:

```sql
-- Retorna el perfil completo del usuario autenticado (desde kv_store)
-- SECURITY DEFINER, keyed por auth.uid(). Ejecutable por authenticated y
-- service_role; el grant implícito a PUBLIC (que cubría a "anon") fue
-- revocado el 16 jun 2026 (no tenía caso de uso legítimo para anon).
public.current_profile()         -- RETURNS jsonb

-- Retorna el rol del usuario ('usuario', 'empresa', 'admin', 'superadmin')
public.current_app_role()        -- RETURNS text

-- Retorna el UUID de la empresa asociada al usuario
public.current_empresa_id()      -- RETURNS uuid

-- Retorna true si el usuario es admin o superadmin
public.is_sotloy_admin()         -- RETURNS boolean

-- Convierte texto a UUID de forma segura (sin excepción)
public.safe_uuid(value text)     -- RETURNS uuid
```

**Regla de aislamiento Multi-tenant (patrón real en el código):**

```sql
-- Patrón usado en las policies RLS actuales
CREATE POLICY "tenant_isolation" ON tabla_ejemplo
  FOR SELECT TO authenticated
  USING (
    public.is_sotloy_admin()                    -- admins ven todo
    OR enterprise_id = public.current_empresa_id()  -- tenants ven sus datos
    OR user_id = auth.uid()                     -- o sus propios registros
  );
```

### Restricciones Inmutables en audit_logs

```sql
-- La tabla audit_logs es APPEND-ONLY
-- Implementado via trigger en BD:
CREATE TRIGGER trg_audit_logs_no_update
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();
-- → RAISE EXCEPTION 'audit_logs es append-only'
```

---

## 5. SUITE DE PRUEBAS

### Tests Unitarios (Vitest)

```bash
# Ejecutar tests
npm run test:run

# Archivos de test actuales:
# src/App.test.tsx                        — test básico del componente root
# src/app/hooks/useNotifications.test.tsx — store Zustand de notificaciones
#   (corregido 16 jun 2026: el import apuntaba a una ruta inexistente y la
#   API simulada no coincidía con el hook real — toda la suite fallaba)
# src/test/setup.ts                       — configuración vitest (jsdom + jest-dom)
```

> **NOTA:** El archivo `src/tests/database_schema.test.sql` mencionado en el ERS v1.5 **no existe en el repositorio actual**. Los tests de integridad de BD deben ejecutarse manualmente en el SQL Editor de Supabase.

### Verificaciones Manuales de BD (Sanity Checks)

Ejecutar en Supabase SQL Editor:

```sql
-- Verificación 1: Base vectorial existe y tiene datos
SELECT COUNT(*) FROM loy_knowledge_documents;
-- Valor esperado: ≥ 1.507

-- Verificación 2: Integridad relacional LOY
SELECT COUNT(*) FROM loy_messages m
  JOIN loy_conversations c ON m.conversation_id = c.id;
-- No debe lanzar error

-- Verificación 3: Semilla de datos
SELECT COUNT(*) FROM document_legal_categories;
-- Valor esperado obligatorio: 55

-- Verificación 4: Sanity check post-restauración
SELECT COUNT(*) FROM loy_conversations;
-- Valor esperado: 14
```

---

## 6. ROLES Y CONTROL DE ACCESO (RBAC)

### Nomenclatura de Roles (Código vs Descripción)

| Nombre en código | Nombre de negocio | Descripción |
|---|---|---|
| `superadmin` | Super Admin | Control total de la plataforma |
| `admin` | Administrador (SotLoy) | Gestiona cartera de empresas |
| `empresa` | Cuenta Empresa (Pyme) | Sube insumos, consulta LOY |
| `usuario` | Trabajador | Solo lectura de sus documentos |

### Matriz de Permisos

| Función | superadmin | admin | empresa | usuario |
|---|---|---|---|---|
| Gestionar Empresas/Pagos | ✅ | ✅ | ❌ | ❌ |
| Publicar Docs Oficiales | ❌ | ✅ | ❌ | ❌ |
| Subir Insumos (Buzón) | ❌ | ❌ | ✅ | ❌ |
| Consultar a LOY (IA) | ✅ | ✅ | ✅ | ❌ |
| Ver/Descargar Propios Docs | ❌ | ❌ | ❌ | ✅ |
| Autorizar Re-indexación IA | ✅ | ❌ | ❌ | ❌ |
| Ver Audit Logs globales | ✅ | ❌ | ❌ | ❌ |

### Descripción de Roles

- **superadmin:** Control total de la plataforma. Es el único que puede ejecutar el "Gatekeeper" (autorizar normativa para LOY). Visualiza logs de auditoría global.
- **admin:** Gestiona cartera de empresas, carga masiva de documentos, asigna registros a Pymes, controla pagos.
- **empresa:** Puede subir insumos al Buzón para que SotLoy los procese, pero NO puede publicar documentos oficiales directamente.
- **usuario:** Solo lectura. Descarga y visualiza sus propios documentos (liquidaciones, finiquitos, contratos).

### Comportamiento de Bloqueo por Mora

```
Al cambiar estado Pyme → "suspended":
- Todo intento de login de usuarios asociados DEBE ser rechazado
- Mensaje obligatorio: "Acceso suspendido por mora"
```

---

## 7. REQUERIMIENTOS FUNCIONALES CRÍTICOS POR MÓDULO

### Módulo 1 — Gestión Multi-tenant y Usuarios

**RF-1.01 — Validación de RUT (Chile)**
- El sistema DEBE rechazar RUTs inválidos o duplicados
- Error obligatorio: `"RUT inválido o ya registrado"`
- Campos obligatorios para crear empresa: Nombre Fantasía, Razón Social, RUT, Giro, Correo Representante

**RF-1.02 — Aislamiento de Datos**
- Un usuario de Empresa A NO PUEDE ver datos de Empresa B, ni por UI ni por API directa
- Implementado via RLS en PostgreSQL con funciones RBAC basadas en `kv_store_7d36b31f`

**RF-1.04 — Integración Pasarela Flow**
- Al recibir Webhook con estado `2` (Aceptado): cambiar suscripción a `active` en **menos de 30 segundos**
- Estados de pago en código: `pending`, `completed`, `failed`, `refunded`, `cancelled`
- El `flow_order_id` (commerceOrder) debe vincularse a la ficha de la empresa para conciliación
- Webhook firmado con HMAC-SHA256 (verificado en `payments-confirm`)

### Módulo 2 — Gestión Documental

**RF-2.01 — Carga de Documentos**
- Campos obligatorios: RUT Trabajador, Tipo (Liquidación/Contrato/Finiquito), Periodo (Mes/Año)
- El sistema DEBE bloquear carga duplicada (mismo RUT + Tipo + Periodo)
- Solo se permite duplicado bajo autorización explícita de "Nueva Versión"

**RF-2.02 — Descarga Segura**
- Las URLs de descarga se generan via Supabase Storage (URLs firmadas)
- **Caducidad obligatoria: 60 minutos** — sin excepción
- Después de 60 min, el acceso queda invalidado automáticamente

**RF-2.03 — Estados de Documentos**
- Estados: `Pendiente` → `Visto` → `Confirmado`
- Cada cambio de estado DEBE registrar Timestamp del servidor

**RF-2.04 — Semáforo de Alertas**
- 🟢 Verde: 100% trabajadores con liquidación y contrato firmado para el periodo actual
- 🟡 Amarillo: Documentos en estado Pendiente/Visto a menos de 5 días del cierre de mes
- 🔴 Rojo: Ausencia de documentos críticos pasada la fecha de vencimiento

**RF-2.05 — Exportación LRE**
- Formato CSV delimitado por punto y coma (`;`)
- Formato XML validado contra esquema XSD oficial de la DT
- Validar campos mandatorios antes de descarga (RUT, montos imponibles, días trabajados)

**RF-2.06 — Buzón de Insumos**
- Capacidad máxima: 20MB por archivo
- Al subir un insumo: notificación inmediata al panel SotLoy + estado inicial "Pendiente de Validación"

**RF-2.07 — Flujo de Validación y Sellado**
- Al "Rechazar": OBLIGATORIO capturar "Motivo de Observación" + notificar a Pyme automáticamente
- Al "Aprobar": generar Hash SHA-256 + mover al repositorio oficial + insertar entrada inmutable en audit_logs

### Módulo 3 — Auditoría e Inmutabilidad

**RF-3.01 — Audit Log**
- Tabla `audit_logs`: APPEND-ONLY mediante trigger de BD (`trg_audit_logs_no_update`)
- Campos obligatorios por cada registro: IP, User-Agent, Timestamp servidor, ID usuario
- NINGÚN perfil de usuario puede editar ni borrar registros del audit log
- Acciones auditadas: LOGIN, LOGOUT, DOCUMENT_UPLOAD, DOCUMENT_DOWNLOAD, DOCUMENT_DELETE, USER_CREATE, USER_UPDATE, USER_DELETE, USER_ASSIGN, MESSAGE_SEND, EMPLOYEE_CREATE, EMPLOYEE_UPDATE, EMPLOYEE_DEACTIVATE, DEPENDENT_CREATE, DEPENDENT_DEACTIVATE, ENTERPRISE_CREATE, ENTERPRISE_UPDATE, ENTERPRISE_DELETE, PAYMENT_CREATE, SUBSCRIPTION_UPDATE

### Módulo 4 — Asistente LOY (IA)

**RF-4.01 — Comportamiento del Chat**
- LOY responde con base en documentos vectorizados en `loy_knowledge_documents` (campo `status = 'approved'`)
- Estrategia de búsqueda: keywords del Código del Trabajo → búsqueda vectorial (si `LOY_USE_VECTOR_SEARCH=true`) → búsqueda por palabras clave → fallback local
- Si la respuesta no está en la base: `"No tengo información suficiente en mi base de conocimientos para responder esa pregunta específica."`
- Disclaimer obligatorio en CADA respuesta: `"Esta respuesta es solo orientativa y no reemplaza la asesoría legal profesional."`

**RF-4.02 — Citación de Fuentes**
- Cada respuesta DEBE incluir sección de fuentes con nombre de ley o dictamen DT

**RF-4.03 — Web Spider Automatizado**
- Implementado como Edge Function Deno/TypeScript: `supabase/functions/web-spider-dt/`
- Apunta exclusivamente a `www.dt.gob.cl/legislacion/1624`
- Delay entre peticiones: `SPIDER_DELAY_MS` (por defecto 1.200ms)
- Páginas máximas por ejecución: `SPIDER_MAX_PAGES` (por defecto 60)
- Solo procesa URLs que coincidan con `/w3-article-\d+\.html` (artículos de contenido real)
- Verifica duplicados por URL y por hash SHA-256 del contenido antes de insertar
- **ESTADO ACTUAL:** inserta documentos con `status: 'approved'` directamente. El Gatekeeper como filtro previo está pendiente de implementar a nivel de Spider.
- **PENDIENTE:** verificación de `robots.txt` no está implementada en el código actual

**RF-4.04 — Gatekeeper**
- Panel exclusivo del `superadmin` en el Dashboard
- Ninguna normativa del Spider debería llegar a LOY sin aprobación del Super Admin
- **VER NOTA RF-4.03:** la implementación actual del Spider aprueba automáticamente

---

## 8. REQUERIMIENTOS NO FUNCIONALES CRÍTICOS

### Seguridad

- **Contraseñas:** Argon2id (NO bcrypt, NO MD5, NO SHA-256)
- **JWT:** Límite absoluto de sesión de 1 hora desde el login real, con rotación de tokens. Supabase auto-refresca el access token indefinidamente por sí solo; `AuthContext.tsx` registra el timestamp de inicio de sesión (`slc_session_started_at` en localStorage) y fuerza `signOut()` al cumplirse 1h, sin importar que el auto-refresh siga activo
- **Documentos en reposo:** AES-256
- **Tránsito:** TLS 1.2 o superior
- **Audit Log:** Inmutable, append-only, trigger en BD
- **Multi-tenancy:** RLS en PostgreSQL + funciones RBAC basadas en kv_store

### Rendimiento

- **Consultas relacionales simples:** < 2 segundos
- **Búsquedas vectoriales (pgvector):** < 5 segundos
- Procesos pesados (Spider, vectorización) en Edge Functions aisladas

### Frontend / UX

- **Diseño:** Mobile-first con React 18 + Vite + Tailwind CSS v4
- **Accesibilidad:** WCAG 2.1 nivel AA (contraste mínimo 4.5:1, ARIA labels, navegación por teclado)
- **Indicador LOY:** Mostrar Timestamp de última actualización: `"Base legal actualizada al: [DD/MM/AAAA]"`
- **Lazy loading:** Todas las páginas/vistas usan `React.lazy + Suspense`

### Ética de IA

- Disclaimer legal en CADA respuesta de LOY (inyección automática en el system prompt)
- Opt-in obligatorio para Pymes reconociendo que LOY es una herramienta de apoyo no vinculante

---

## 9. ARQUITECTURA DE ALTO NIVEL

### Flujo del Asistente LOY (RAG)

```
[Usuario] → [Frontend React/Vite]
                    ↓
            [Edge Function: rag-query]
                    ↓
        [Embedding hash-based local (1536 dims)]
                    ↓
        [loy_knowledge_documents (pgvector)]
         búsqueda: keywords → vectorial → fallback
                    ↓
        [Constructor de contexto]
                    ↓
               [LLM — GitHub Models / OpenAI / Groq]
                    ↓
        [Respuesta con fuentes + disclaimer]
                    ↓
        [loy_messages + loy_conversations (historial)]
```

### Flujo de Gestión Documental

```
[Admin SotLoy sube PDF]
        ↓
[Validación RUT + Tipo + Periodo]
        ↓
[Hash SHA-256 del archivo]
        ↓
[Supabase Storage bucket 'documents' — AES-256]
        ↓
[Metadatos en tabla documents]
        ↓
[Audit Log inmutable — trigger Edge Function audit-log]
        ↓
[Trabajador accede → URL firmada 60 min]
        ↓
[Trigger audit_logs: IP + User-Agent + Timestamp]
```

### Flujo de Pagos (Flow Chile)

```
[Frontend inicia pago] → [Edge Function: payments-initiate]
        ↓
[Flow API → URL de pago]
        ↓
[Usuario paga en Flow]
        ↓
[Flow Webhook POST /payments-confirm]
        ↓
[Verificar firma HMAC-SHA256]
        ↓
[Flow API getStatus → status == 2 (Aceptado)]
        ↓
[payments: estado → 'completed']
        ↓
[subscriptions: estado → 'active']
        ↓
[enterprises: subscription_status → 'active']
        ↓
[notificaciones: insertar notif a usuarios de la empresa]
        ↓
[audit_logs: SUBSCRIPTION_UPDATE]
```

---

## 10. ÉPICAS Y CRITERIOS DE ÉXITO

### Épica 1 — Centralización Documental B2B
**Criterio de éxito:** Un administrador puede subir un lote de liquidaciones y el sistema las asigna automáticamente a la carpeta digital de la Pyme correspondiente.

### Épica 2 — Trazabilidad Forense y Auditoría
**Criterio de éxito:** El sistema puede generar un reporte demostrando qué trabajador, desde qué IP y a qué hora exacta descargó su contrato, sin posibilidad de alteración manual.

### Épica 3 — Automatización Normativa Inteligente
**Criterio de éxito:** El bot detecta una nueva normativa, la extrae, la vectoriza y LOY puede responder preguntas sobre ella (post-aprobación Gatekeeper cuando esté implementado).

### Épica 4 — Seguridad Multi-tenant
**Criterio de éxito:** Es técnicamente imposible (por bloqueo a nivel de BD) que un usuario de "Pyme A" intercepte o consulte mediante la API los documentos de "Pyme B".

---

## 11. CASOS DE PRUEBA FUNCIONALES (QA)

| ID | Módulo | Escenario | Output Esperado | Estado |
|---|---|---|---|---|
| TC-DOC-01 | Centralización | Admin sube lote de PDFs de "Pyme Alfa" | Hash SHA-256 calculado, archivo en Storage, metadatos en `documents`, acceso restringido por tenant | ✅ Aprobado |
| TC-DOC-02 | Centralización | Cliente Pyme Alfa descarga documento | URL firmada de Supabase Storage con expiración 60 min | ✅ Aprobado |
| TC-AUD-01 | Trazabilidad | Trabajador visualiza/descarga Contrato | Inserción append-only en `audit_logs` con Timestamp servidor, ID usuario, acción e IP | ✅ Aprobado |
| TC-AUD-02 | Trazabilidad | Dueño Pyme exporta reporte LRE | Archivo CSV o XML compatible con normas DT | ✅ Aprobado |
| TC-IA-01 | Automatización | Ejecución del Spider | Datos en `loy_spider_logs`, documentos insertados en `loy_knowledge_documents` | ✅ Aprobado |
| TC-IA-02 | IA (LOY) | Pregunta: "¿Cuál es el plazo legal para pagar un finiquito?" | Respuesta con contexto de pgvector + LLM configurado + sección de fuentes + disclaimer | ✅ Aprobado |
| TC-SEC-01 | Seguridad | Usuario Pyme A intenta leer datos de Pyme B via Postman (alterando enterprise_id) | PostgreSQL RLS intercepta → arreglo vacío o error 403. Sin fuga de datos | ✅ Aprobado |

---

## 12. RIESGOS TÉCNICOS ACTIVOS Y MITIGACIONES

| Riesgo | Puntaje (5x5) | Mitigación Implementada |
|---|---|---|
| Alucinaciones de LOY | 15 — Crítico | System prompt restringe respuestas al contexto; disclaimer automático; fallback local sin LLM |
| Spider auto-aprueba sin Gatekeeper | 12 — Importante | **Pendiente:** implementar flujo de pre-aprobación en Spider antes de producción |
| Falla de interoperabilidad del Spider (cambios en DT) | 16 — Crítico | Monitoreo via `loy_spider_logs`; URLs configurables en el código |
| Seguridad de datos / fuga inter-tenant | 10 — Medio/Alto | RLS en PostgreSQL + funciones RBAC + pruebas de penetración multi-tenant |
| Embeddings hash-based (baja calidad semántica) | 8 — Medio | Fallback a búsqueda por keywords; activar `LOY_USE_VECTOR_SEARCH=true` |
| robots.txt no verificado en Spider | 6 — Bajo/Medio | **Pendiente:** implementar verificación de robots.txt en `web-spider-dt` |

---

## 13. FUERA DE ALCANCE (EXCLUSIONES DURAS)

Las siguientes funcionalidades NO deben implementarse en este ciclo de desarrollo:

- Representación legal automatizada ante tribunales laborales
- Carga masiva histórica de documentos físicos anteriores a 2 años
- Módulos de contabilidad (balances, pago de impuestos en SII)
- Módulo de nómina/payroll automático
- Integración con sistemas distintos a Flow como pasarela de pagos

---

## 14. REGLAS DE REVISIÓN DE CÓDIGO — CHECKLIST PARA EL AGENTE VS CODE

Al revisar cualquier archivo de código, verificar sistemáticamente los siguientes puntos:

### Seguridad (Prioridad MÁXIMA)

- [ ] ¿Se usa **Argon2id** para hashear contraseñas? (No bcrypt, no SHA-256)
- [ ] ¿La sesión tiene un límite absoluto de **1 hora** desde el login real (enforcement en `AuthContext.tsx`, no solo el auto-refresh de Supabase) y rotación configurada?
- [ ] ¿Los documentos en Supabase Storage usan **AES-256**?
- [ ] ¿Las URLs firmadas tienen caducidad de **exactamente 60 minutos**?
- [ ] ¿Las tablas sensibles tienen **RLS activado**?
- [ ] ¿El `audit_logs` es realmente **append-only** (trigger `trg_audit_logs_no_update`)?
- [ ] ¿Las variables de entorno del frontend tienen prefijo `VITE_` (no `NEXT_PUBLIC_`)?
- [ ] ¿Ninguna clave secreta (`SERVICE_ROLE_KEY`, `FLOW_SECRET_KEY`) está en el frontend?

### Multi-tenancy

- [ ] ¿Toda query filtra usando `public.current_empresa_id()` o `public.is_sotloy_admin()`?
- [ ] ¿Existe alguna query que pueda retornar datos de otro tenant? (bug crítico)
- [ ] ¿Las policies RLS usan las funciones RBAC del sistema (`is_sotloy_admin`, `current_empresa_id`)?

### Módulo LOY (IA)

- [ ] ¿Toda respuesta de LOY incluye el **disclaimer legal** automáticamente?
- [ ] ¿LOY tiene lógica de fallback cuando no encuentra contexto? (responde con mensaje estándar)
- [ ] ¿Cada respuesta incluye la sección de **fuentes consultadas**?
- [ ] ¿El Spider guarda logs en `loy_spider_logs` correctamente?
- [ ] ¿La variable `LOY_USE_VECTOR_SEARCH` está configurada en Edge Functions si se quiere búsqueda pgvector?

### Gestión Documental

- [ ] ¿Se calcula el **Hash SHA-256** del PDF antes de almacenarlo?
- [ ] ¿Se valida RUT chileno en la creación de empresas?
- [ ] ¿Se bloquea carga duplicada (mismo RUT + Tipo + Periodo)?
- [ ] ¿El semáforo cambia correctamente entre Verde/Amarillo/Rojo?
- [ ] ¿Los archivos subidos al Buzón quedan en estado "Pendiente de Validación"?

### Pasarela Flow

- [ ] ¿El webhook verifica la firma **HMAC-SHA256** antes de procesar?
- [ ] ¿El código de estado Flow `2` (Aceptado) cambia el pago a `completed`?
- [ ] ¿La suscripción y empresa se actualizan a `active` tras pago confirmado?
- [ ] ¿El tiempo de procesamiento del webhook es < 30 segundos?

### Frontend / UX

- [ ] ¿El diseño es **mobile-first**?
- [ ] ¿Se cumple **WCAG 2.1 AA** (contraste 4.5:1, ARIA labels, navegación teclado)?
- [ ] ¿Las páginas/vistas usan `React.lazy + Suspense` para code splitting?
- [ ] ¿El indicador de LOY muestra la última actualización en formato `DD/MM/AAAA`?

### Base de Datos

- [ ] ¿La FK `loy_messages.conversation_id → loy_conversations.id` existe y es válida?
- [ ] ¿`document_legal_categories` tiene exactamente 55 registros semilla?
- [ ] ¿`loy_conversations` tiene exactamente 14 registros (verificación post-restauración)?
- [ ] ¿Las migraciones SQL en `sql/` están versionadas y documentadas?

---

## 15. CONVENCIONES DE CÓDIGO ESPERADAS

### Naming en Base de Datos

```sql
-- Tablas: snake_case con prefijo del módulo cuando aplica
loy_knowledge_documents  -- módulo IA
loy_messages             -- módulo IA
loy_conversations        -- módulo IA
document_legal_categories -- módulo documental
audit_logs               -- módulo auditoría
kv_store_7d36b31f        -- persistencia de perfiles (nombre generado)

-- Columnas: snake_case
enterprise_id, conversation_id, created_at, updated_at, empresa_id
```

### Estructura de Proyecto (Real)

```
/
├── src/
│   ├── main.tsx              # Punto de entrada (ReactDOM.createRoot)
│   ├── App.test.tsx          # Tests básicos
│   ├── app/
│   │   ├── routes.tsx        # React Router v7 (createBrowserRouter)
│   │   ├── App.tsx           # Root con providers
│   │   ├── components/       # Componentes React reutilizables
│   │   │   ├── ui/           # 48 componentes Radix UI wrapper
│   │   │   ├── AdminView.tsx
│   │   │   ├── SuperAdminView.tsx
│   │   │   ├── LoyChat.tsx
│   │   │   ├── AuditLogViewer.tsx
│   │   │   └── ... (29 componentes Conecta)
│   │   ├── context/
│   │   │   └── AuthContext.tsx  # Auth + API helpers
│   │   ├── hooks/            # 13 custom hooks
│   │   │   ├── useAuditLogs.ts
│   │   │   ├── useDocumentTracking.ts
│   │   │   ├── useEmpleados.ts
│   │   │   ├── useSecureDownload.ts
│   │   │   ├── useSubscriptions.ts
│   │   │   └── ...
│   │   ├── pages/            # Vistas/páginas
│   │   │   ├── Home.tsx
│   │   │   ├── Planes.tsx
│   │   │   ├── Contacto.tsx
│   │   │   └── conecta/
│   │   │       ├── ConectaLogin.tsx
│   │   │       ├── ConectaDashboard.tsx
│   │   │       ├── DocumentacionPage.tsx
│   │   │       ├── EmpresaPage.tsx
│   │   │       ├── PerfilPage.tsx
│   │   │       └── PagosPage.tsx
│   │   ├── services/
│   │   │   └── paymentService.ts  # Flow payment gateway
│   │   ├── types/
│   │   │   └── database.ts    # Interfaces TypeScript (Empleado, Document, etc.)
│   │   └── utils/
│   │       ├── api.ts
│   │       ├── storage.ts
│   │       └── validation.ts
│   ├── styles/               # CSS global, Tailwind, tema, fuentes
│   └── test/
│       └── setup.ts          # Vitest + jest-dom setup
├── supabase/
│   └── functions/            # 13 Edge Functions (Deno/TypeScript)
│       ├── _shared/          # cors.ts, audit.ts
│       ├── audit-log/
│       ├── calculate-hash/
│       ├── create-user/
│       ├── delete-user/              # guards anti-auto-borrado/último-superadmin + preserva documentos (sección 19)
│       ├── delete-enterprise/        # soft-delete (archived) de empresa, service role (NUEVO, sección 19)
│       ├── documents/              # upload — control de acceso por rol (sección 18); ahora 'usuario' puede subir a SU empresa (sección 19)
│       ├── ingest-doc/
│       ├── payments-confirm/
│       ├── payments-initiate/
│       ├── rag-query/
│       ├── reset-password/
│       ├── secure-document-url/    # URLs firmadas — control de acceso por rol corregido 16 jun 2026 (ver sección 18)
│       ├── send-email/
│       └── web-spider-dt/    # Spider Deno (NO Python)
├── sql/                      # Scripts SQL de migraciones
│   ├── security_rls_and_flow.sql              # RLS policies + RBAC functions
│   ├── create_pending_emails_table.sql        # ⚠️ política original "para desarrollo", corregida en el script de abajo
│   ├── fix_security_advisor_2026-06-16.sql          # Fix CRITICAL: RLS enterprises/loy_knowledge_documents + vista document_view_stats
│   └── fix_security_advisor_warnings_2026-06-16.sql # Fix WARN: políticas "Allow all", search_path mutable, current_profile
├── scripts/                  # Scripts de utilidad
│   ├── migrate.js
│   ├── migrate.bat
│   └── ingest_codigo_trabajo.js
├── utils/
│   └── supabase/
│       └── info.tsx          # projectId y publicAnonKey (AUTOGENERADO)
├── .github/workflows/        # CI/CD GitHub Actions
│   ├── ci.yml
│   └── deploy.yml
├── .env.example              # Template de variables de entorno
├── .env                      # Variables locales (NO commitear)
├── index.html                # HTML template (Vite entry)
├── vite.config.ts            # Config Vite (alias @, proxy /api, test jsdom)
├── package.json
└── CLAUDE.md                 # Este documento
```

### Manejo de Errores Esperado

```typescript
// Patrón para Supabase client
const { data, error } = await supabase.from('tabla').select('*');
if (error) {
  console.error('Error de BD:', error);
  throw new Error('Error al obtener datos');
  // NO exponer detalles internos al usuario final
}
```

```typescript
// Patrón para Edge Functions (Deno)
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    // lógica principal
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

---

## 16. INFORMACIÓN DE PRODUCCIÓN Y REFERENCIAS

| Item | Valor |
|---|---|
| URL de producción Supabase | `https://qpttobsxyvmaxtmzcver.supabase.co` |
| Project Ref | `qpttobsxyvmaxtmzcver` |
| Región AWS | `us-east-1` (North Virginia) |
| Instancia | `t4g.nano` (ARM Graviton) |
| Motor BD | PostgreSQL 15 |
| Host pg_dump | `aws-0-us-east-1.pooler.supabase.com` |
| Usuario pg_dump | `postgres.qpttobsxyvmaxtmzcver` |
| Base de datos | `postgres` |
| Dev local | `http://localhost:5173` (Vite) |

---

## 17. NOTAS FINALES PARA EL AGENTE DE VS CODE

1. **No proponer cambios de stack.** Las decisiones tecnológicas están congeladas en el ERS v1.5.

2. **El framework frontend es React + Vite, NO Next.js.** No sugerir `getServerSideProps`, `app router`, `server components`, ni ningún patrón de Next. Las rutas son React Router v7.

3. **La tabla `loy_knowledge_documents` es sagrada.** Tiene más de 1GB de datos vectoriales. Cualquier migración que la afecte requiere backup previo.

4. **El conteo de `loy_conversations` debe ser 14.** Es el sanity check post-restauración. Si el entorno muestra otro número, el backup no se restauró correctamente.

5. **El Gatekeeper es un requerimiento de negocio.** Actualmente el Spider auto-aprueba documentos. Cualquier mejora debe implementar un flujo donde los documentos queden en `status: 'pending'` hasta aprobación del superadmin.

6. **Argon2id es inamovible.** El ERS especifica explícitamente Argon2id para contraseñas. No sugerir bcrypt ni ninguna alternativa.

7. **El audit_log es legalmente comprometido.** Las Pymes dependen de él para fiscalizaciones de la Dirección del Trabajo. Cualquier vulnerabilidad en su inmutabilidad es un bug crítico de negocio.

8. **Flow webhook < 30 segundos.** El requerimiento de tiempo de respuesta para el webhook de pago es un criterio de aceptación formal del cliente.

9. **WCAG 2.1 AA es un requerimiento, no una recomendación.** Los trabajadores (usuarios finales) pueden acceder desde dispositivos móviles básicos en contextos laborales.

10. **Las variables de entorno del frontend usan prefijo `VITE_`.** No usar `NEXT_PUBLIC_`, `REACT_APP_`, ni ningún otro prefijo.

11. **El Spider es Deno/TypeScript.** No hay Python en el repositorio. Cualquier tarea relacionada con el Spider debe hacerse en TypeScript compatible con Deno.

12. **No asumir que el repo y la producción coinciden.** El 16 jun 2026 se encontró drift real entre `sql/security_rls_and_flow.sql` y el estado de RLS en producción (`enterprises` tenía RLS desactivado a pesar de que el script dice lo contrario). Antes de asumir que una migración "ya está aplicada", verificar contra producción (`supabase db query --linked` / `supabase db advisors --linked`) en vez de confiar solo en el contenido de `sql/`. Ver sección 18.

13. **En Edge Functions con `SUPABASE_SERVICE_ROLE_KEY`, el chequeo de rol en código ES la única barrera de seguridad** — RLS no aplica porque el service role la bypassa por completo. Cualquier `canAccess`/`canUpload` que compare solo `enterprise_id` sin filtrar por rol es un bug de privilege escalation intra-tenant (ver sección 18.1: `secure-document-url` y `documents` tenían exactamente este bug).

---

## 18. AUDITORÍA DE SEGURIDAD Y CALIDAD — 16 JUNIO 2026

> Resultado de una revisión completa de código (Edge Functions, frontend, tests) + el Security Advisor de Supabase contra producción. **Todo lo listado abajo como "corregido" ya está aplicado en producción y/o en el repo.** Esta sección documenta el estado real encontrado, no solo el deseado — para que el agente no asuma que algo está bien solo porque está descrito en otra sección de este documento.

### 18.1 Bugs de control de acceso en Edge Functions (corregidos)

- **`secure-document-url`** ([supabase/functions/secure-document-url/index.ts](supabase/functions/secure-document-url/index.ts)): el chequeo `canAccess` daba acceso a *cualquier* documento de la empresa a *cualquier* rol con el mismo `enterprise_id`, sin filtrar por rol. Esto contradice la Matriz de Permisos (sección 6): el rol `usuario` solo debe ver/descargar **sus propios** documentos, no los de toda la Pyme. Como esta función usa `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS), este chequeo en código era la **única** barrera — el bug era explotable directo via API (escenario tipo TC-SEC-01 pero *intra*-tenant). Corregido: el acceso "toda la empresa" ahora solo aplica a `role === 'empresa'`.
- **`documents`** (upload, [supabase/functions/documents/index.ts](supabase/functions/documents/index.ts)): mismo patrón en `canUpload` — cualquier rol con `enterprise_id` coincidente podía subir documentos, saltándose el flujo de Buzón (RF-2.06) reservado a `empresa`/`admin`/`superadmin`. Corregido.

### 18.2 Bugs de frontend (corregidos)

- **`PerfilPage.tsx`** y **`PagosPage.tsx`**: hooks (`useState`/`useEffect`) declarados *después* de un `return` condicional de protección de ruta — viola las Rules of Hooks de React. Riesgo real de crash en producción ("Rendered fewer hooks than expected") si el render inicial cae en la rama del `return`. Reordenado: todos los hooks ahora se llaman antes de cualquier guard de ruta.
- **`useNotifications.test.tsx`**: el import apuntaba a `../app/hooks/useNotifications` (ruta inexistente desde un archivo que ya está en `src/app/hooks/`) — rompía la carga de **toda** la suite de Vitest. Además la API que el test simulaba (`unreadCount`, `markAsRead`, `addNotification({id, timestamp})`) no correspondía al hook real (store Zustand con solo `notifications`/`addNotification`/`removeNotification`). Reescrito y alineado con el hook real; `npm run test:run` pasa limpio.

### 18.3 Hallazgos del Security Advisor de Supabase

**CRITICAL — resueltos** (script: `sql/fix_security_advisor_2026-06-16.sql`):

| Hallazgo | Detalle | Fix |
|---|---|---|
| RLS disabled en `enterprises` | El repo (`sql/security_rls_and_flow.sql`) define `ENABLE ROW LEVEL SECURITY` + 4 políticas para esta tabla, pero en producción solo existían 2 de las 4 (faltaban `enterprises_select_tenant` y `enterprises_update_admin`) y el flag de RLS nunca se activó — drift entre repo y BD real, probablemente una migración aplicada a medias. | RLS activado + las 2 políticas faltantes recreadas. |
| RLS disabled en `loy_knowledge_documents` | Tenía 2 políticas correctas ya creadas (fuera del repo, vía Dashboard) pero el flag de RLS nunca se activó. Sin esto, **cualquiera con la anon key pública** podía leer/modificar el estado de la base de conocimiento de LOY directo desde el navegador (`LoyGatekeeper.tsx` la consulta sin pasar por Edge Function), saltándose el Gatekeeper por completo. | RLS activado. |
| Security Definer View en `document_view_stats` | La vista corría con permisos del creador, saltándose el RLS de `document_views`. | `security_invoker = on`. |

**WARN — resueltos** (script: `sql/fix_security_advisor_warnings_2026-06-16.sql`):

- `payments`, `subscriptions`, `pending_emails`, `notifications` (tabla huérfana en inglés — el código real usa `notificaciones`): las 4 tenían una política `"Allow all"` (`USING true` / `WITH CHECK true`, rol `public` = incluye **no autenticados**) que anulaba por completo las políticas tenant-correctas que ya existían en `payments`/`subscriptions` (las políticas son PERMISSIVE y se OR'ean — basta una con `true` para anular el resto). En `pending_emails` la política decía literalmente *"Política permisiva para desarrollo (cambiar en producción)"* ([sql/create_pending_emails_table.sql](sql/create_pending_emails_table.sql)) y nunca se cambió. Impacto real: pagos y suscripciones de **todas** las Pymes eran legibles/editables por cualquiera, sin login. Eliminadas las 4 políticas; `pending_emails` quedó con INSERT permitido solo a `authenticated` (el resto de operaciones, sin política → default deny, solo `service_role`).
- `document_views`: política de INSERT con `WITH CHECK true` — cualquier autenticado podía insertar un registro de "vista" atribuido a cualquier otra persona, contaminando la trazabilidad forense (Épica 2). Corregida a `WITH CHECK (viewer_id = auth.uid())` (coincide con cómo el código real ya inserta, `useDocumentTracking.ts` — no rompe nada).
- `current_profile()`: ejecutable por `anon` vía el **grant implícito a `PUBLIC`** (no por un grant directo a `anon` — por eso un primer intento de `REVOKE ... FROM anon` no tuvo efecto). Revocado de `PUBLIC`; `authenticated` y `service_role` mantienen su grant explícito intacto.
- 17 funciones con `search_path` mutable (`is_sotloy_admin`, `current_app_role`, `current_empresa_id`, `safe_uuid`, `search_loy_knowledge`, triggers de `audit_logs` y de `loy_*`, etc.) — todas con `search_path` fijado a `public`.

**WARN aceptados a propósito (revisados, no son bugs):**

- `pending_emails_insert_authenticated` sigue marcado por el linter porque el `WITH CHECK` es `true` literal — la tabla no tiene columna de "dueño" contra la que comparar `auth.uid()`, y ya está restringida a `authenticated` (antes era pública). El linter no distingue "solo puede insertar, no puede leer" de "acceso total".
- `current_profile()` sigue siendo ejecutable por `authenticated` — es necesario: `is_sotloy_admin()` / `current_app_role()` / `current_empresa_id()` **no** son `SECURITY DEFINER` (corren como el rol que las llama) y dependen de poder invocar `current_profile()` como `authenticated`. Revocarlo rompería el RBAC de todo el sistema.
- **Leaked Password Protection** (HaveIBeenPwned): requiere plan **Pro** de Supabase o superior — la Management API lo rechazó (`"available on Pro Plans and up"`). El proyecto actual no tiene ese plan. Pendiente si se actualiza.

### 18.4 Pendiente — no tocado en esta auditoría

- El Gatekeeper del Spider sigue auto-aprobando (`status: 'approved'` directo) — ver RF-4.03/RF-4.04 y el riesgo "Spider auto-aprueba sin Gatekeeper" en la sección 12. Sigue siendo deuda de negocio conocida, no se tocó en esta pasada.
- `robots.txt` no verificado en el Spider — mismo estado que antes.
- 182 warnings/errores de ESLint preexistentes (variables sin usar, tipos `any`) — no son bugs funcionales, no bloquean el build de Netlify (`npm run lint` no es parte de `npm run build`). Limpieza pendiente, candidata a `/simplify` en otra sesión.

---

## 19. SESIÓN DE FEATURES Y HARDENING DE ACCESO — 19 JUNIO 2026

> Estado actual del proyecto tras una sesión larga de desarrollo. **Todo lo de abajo está en el código (working tree + commits, app desplegada en Netlify ≈ v1.17.x).** Build limpio (`npm run build`), tests `4/4` (`npm run test:run`). Lo marcado **[DEPLOY]** requiere `supabase functions deploy <fn>` para que aplique en producción (el frontend va por build+Netlify).

### 19.1 Bloqueo de acceso por mora / eliminación (suspended + archived)

- **`AuthContext.tsx`**: el helper `getAccountBlockStatus(userId)` (antes `isAccountSuspendedByMora`) devuelve `'suspended' | 'archived' | null`. Bloquea a la **empresa dueña Y a sus trabajadores asociados** (resuelve empresas vía `profile.empresaId` + `user_enterprises`). Admin/superadmin nunca se bloquean. Fail-open ante error de lectura.
- Se aplica en **3 puntos**: `login()` (rechaza con `BLOCK_MESSAGES[status]`), bootstrap `getSession`, y el intervalo de 60s (expulsa sesión activa).
- Constantes exportadas: `SESSION_BLOCKED_FLAG` (guarda el mensaje), `BLOCK_MESSAGES` (`suspended` → "Acceso suspondido por mora"; `archived` → "Tu empresa ya no se encuentra activa…").
- **`ConectaLogin.tsx`**: muestra el mensaje de bloqueo y **NO** lo cuenta para el lockout por intentos (las credenciales son válidas).
- Mensaje obligatorio de mora (CLAUDE.md §6) ya implementado de verdad (antes el login no verificaba nada).

### 19.2 Borrado de empresa y de usuario (revisión + fixes)

- **`supabase/functions/delete-enterprise/index.ts` (NUEVO) [DEPLOY]**: soft-delete vía service role; valida superadmin; marca `enterprises.subscription_status='archived'` + cancela suscripción + audita `ENTERPRISE_DELETE`. **No borra perfiles** (el acceso se deniega por el estado `archived`, así es reversible y no deja cuentas "zombie"). `handleDeleteCompany` (SuperAdminView) ahora solo invoca esta función — ya **no** hace mutaciones privilegiadas client-side (cerraba el riesgo de RLS-frágil/partial-failure).
- **`supabase/functions/delete-user/index.ts` [DEPLOY]**: se mantiene **hard delete**, pero con: (a) guard anti-auto-borrado (`user_id === actorId`), (b) guard "último superadmin", (c) **preservación de documentos** — antes de borrar Auth se desvincula al usuario (`documents.user_id → NULL`, `uploaded_by → actorId`) manteniendo `enterprise_id`, así los documentos sobreviven y quedan ligados a la empresa, (d) orden corregido: se borra Auth **primero** (si falla, no quedan perfiles huérfanos).

### 19.3 PlanGate — bloqueo de Documentos/Mensajes por plan (NUEVO)

- **`components/conecta/PlanGate.tsx` (NUEVO)**: envuelve secciones y bloquea si la empresa **no pagó el plan O está suspendida/archivada**. Lógica: `permitido = (primer_mes_pagado || subscription_status==='active') Y status ∉ {suspended, archived}`. Admin/superadmin nunca se bloquean. (Corrige el matiz del gating de LOY, que dejaba pasar a una empresa pagada-pero-suspendida.)
- Aplicado en **`EmpresaView.tsx`**: secciones `documentos`, `mensajes`, `upload` (subir doc a trabajador) y las dos vistas de **perfil de trabajador** (cerraba el bypass "Mis trabajadores → click empleado → subir/ver documentos").
- Aplicado en **`UsuarioView.tsx`**: `documentos` y `mensajes` del trabajador.
- **La sección `suscripcion` NUNCA se gatea** (si no, no se podría pagar). Bug corregido: el catch-all `if (selectedWorker)` se quedaba mostrando el perfil del trabajador (con su PlanGate de Documentos) en cualquier sección — bloqueaba "Mi Suscripción". Fix: el `useEffect` limpia `selectedWorker` al salir de `trabajadores`/`upload`, y el catch-all está acotado a esas secciones.
- LOY ya estaba gateado en `ChatbotIA.tsx` (`primer_mes_pagado || subscription_status==='active'`).

### 19.4 Suscripción / pagos

- **Candado de cambio de plan (`SubscriptionManager.tsx`)**: con plan activo dentro del periodo pagado (`estado==='active'` y `fecha_fin` futura), no se puede cambiar de plan → evita doble cobro en el mismo mes. Exento para admin. `planChangeLocked` + guarda en `handleProceedToPayment`.
- **Pago combinado auditoría + plan (`SubscriptionManager.tsx`)**: además del flujo separado (pagar auditoría → luego plan), ahora hay opción de pagar **ambos juntos**. Implementación: no requiere estado nuevo — si hay plan seleccionado y la auditoría no está pagada, es combinado (`monto = AUDITORIA_PRECIO + precioPrimerMes`, `tipo:'plan'`). `applyPayment.ts` rama `'plan'` ya marca `auditoria_pagada=true` + activa el plan, así un solo pago cubre todo. Sirve para Flow y transferencia.
- **Creación de empresa SIN plan (`SuperAdminView.tsx`)**: las empresas nuevas nacen en **auditoría pendiente** (`subscription_status:'trial'`, `plan:null`, `auditoria_pagada:false`, `primer_mes_pagado:false`). Los selectores de plan/precio/estado solo aparecen al **editar** una empresa existente. Modal post-creación renombrado a "Empresa creada" con texto acorde.
- **Suspensión: aviso al cliente (`AdminView.tsx` `changeSubscriptionStatus`)**: al suspender/reactivar se envía correo a la empresa (vía `send-email` con `subject+html`) + notificación in-app (`notificaciones`) a sus trabajadores. Best-effort.

### 19.5 Trabajador (rol `usuario`) — nuevas capacidades, acotadas a su empresa

- **Sección Mensajes (NUEVA)**: agregada al menú `usuario` en `ConectaDashboard.tsx`. En `UsuarioView.tsx` se renderiza `MessageCenter` con `allowedRoles={['empresa']}` + `empresaId={user.empresaId}` → el trabajador **solo puede contactar a SU empresa asignada**.
- **Fix en `MessageCenter.tsx`**: el filtro `empresaId` antes solo restringía contactos `'usuario'`, dejando ver todas las cuentas `'empresa'`. Ahora restringe también las `'empresa'` (por `user_enterprises` o por el `empresaId` del perfil del contacto).
- **Subir documentos (NUEVO)**: botón "Enviar Documento" en `UsuarioView`, con `DocumentUpload empresaId={user.empresaId}`. Edge Function **`documents` [DEPLOY]**: `canUpload` ampliado para permitir `role==='usuario'` **solo si** `profileEnterpriseId === enterpriseId` (su propia empresa).

### 19.6 UX / correcciones varias

- **RUT auto-formateado `xx.xxx.xxx-x` mientras se escribe**: helper `formatRut()` en `utils/validation.ts`, aplicado en el form de empresa (`SuperAdminView`) y de empleado (`EmpleadosManager`).
- **Hora de auditoría en hora de Chile**: los timestamps de `audit_logs` se guardan en **UTC** (`new Date().toISOString()`); el visor los mostraba sin convertir (parecían +4h y, en 12h, un salto de 12h se veía como "minutos"). Fix: `parseAuditDate()` en `useAuditLogs.ts` (trata el valor como UTC si no trae zona) + `toLocaleString('es-CL', { timeZone: 'America/Santiago', hour12: false })` en `AuditLogViewer.tsx` y el reporte PDF. **El dato en BD nunca estuvo mal, era solo display.**
- **No auto-login al setear/cambiar contraseña (`ResetPassword.tsx`)**: tras `updateUser({password})` se hace `signOut()` y se redirige al login (el `verifyOtp` de recuperación abría sesión). El cambio de contraseña *desde el perfil ya logueado* (`AuthContext.changePassword`) **sí** mantiene sesión, a propósito.

### 19.7 Pendiente / notas operativas

- **Deploys requeridos** para que 19.2 y 19.5 apliquen en prod: `supabase functions deploy delete-enterprise delete-user documents` (uno por uno).
- El **token de Supabase no se usa desde el chat**: un `sbp_…` es la llave de toda la cuenta; si se filtra en un chat, revocar en https://supabase.com/dashboard/account/tokens y deployar con `supabase login` local.
- Sigue pendiente de §18.4: Gatekeeper del Spider (auto-aprueba), `robots.txt`, y la limpieza de ESLint.
- El mensaje de PlanGate para el rol `usuario` dice "Ve a Mi Suscripción" (los trabajadores no pagan) — wording menor a pulir.
- `subscription_status` se guarda inconsistente según el origen: el alta de empresa usa valores en inglés (`trial`/`active`), pero edición antigua llegó a guardar `activo`/`inactivo` (español). PlanGate compara contra `'active'` (inglés). Tenerlo en cuenta para empresas viejas. **(Mitigado parcialmente en §20.6: PlanGate ahora normaliza a minúsculas y acepta español + inglés.)**

---

## 20. SESIÓN POST-v1.29 — CONTENIDO EDITABLE, BLOG/SEO Y HARDENING DE PAGOS (24–25 JUNIO 2026)

> Resultado de la revisión de los tres commits **sin número de versión** posteriores a `v1.29`: `visuales` (3ea35be, 24 jun), `cosas` (42757a5, 24 jun) y `arreglos` (6b5ada3, 25 jun). Todo lo de abajo está en el working tree + commits (rama `main`). Build limpio, tests `4/4` (`npm run test:run`). Lo marcado **[DEPLOY]** requiere `supabase functions deploy <fn>`; el resto es frontend (build+Netlify) o assets estáticos.

### 20.1 Hardening de pagos Flow (commit `arreglos`) — [DEPLOY]

- **Idempotencia del webhook (`payments-confirm/index.ts`)**: antes de procesar, busca el pago por `flow_order_id` y corta si (a) no existe (responde `200 OK` para que Flow no reintente — el pago no es nuestro o llegó antes del INSERT) o (b) ya está `confirmed_by_webhook && estado === 'completed'` (webhook duplicado ignorado). Cierra el riesgo de **doble-activación** por reintentos de Flow. Sigue cumpliendo el RF-1.04 (< 30 s).
- **No degradar suscripción activa (`payments-initiate/index.ts`)**: el `upsert(onConflict: 'empresa_id')` se reemplazó por `select` + `insert` **solo si no existe** suscripción. Antes, iniciar un pago hacía upsert a `estado: 'trial'`, lo que **degradaba una suscripción `active`** antes de confirmar el nuevo pago. Ahora una activa nunca se toca hasta que el pago se confirma.
- **`applyPayment.ts` ahora propaga errores (`throw`) en vez de solo `console.error`**: en `upsertSubscriptionManual` y en los updates de `enterprises` (auditoría y plan). Un fallo de BD durante la aplicación del pago ya no se traga silenciosamente — el webhook/llamador se entera. Además `resolvePaymentTipo` reconoce el concepto **`combinado`** (auditoría+plan) y lo resuelve como `'plan'` (la rama `'plan'` ya marca `auditoria_pagada=true`, así un solo pago cubre ambos — alinea con §19.4).
- **`SubscriptionManager.tsx`**: `handleProceedToPayment` hace **re-fetch** del `estado`/`fecha_fin` de la suscripción justo antes de calcular `esRenovacion`, para no decidir con un estado obsoleto cargado en el montaje (evitaba cobrar mal renovación vs. primer pago).

### 20.2 Subsistema de contenido editable vía kv_store (`src/app/utils/siteSettings.ts`, NUEVO)

Para no requerir migraciones, **todo el contenido editable nuevo se guarda en `kv_store_7d36b31f`** (PK `key`, `value` jsonb), igual que perfiles/planes. Helpers genéricos `readSetting<T>(key)` (degrada a `null` ante error/ausencia) y `writeSetting(key, value)` (upsert `onConflict: 'key'`). Claves y tipos definidos:

| Clave kv_store | Quién edita | Contenido |
|---|---|---|
| `site_settings:landing_hero` | superadmin | Banner hero de la portada pública (`LandingHero`) |
| `site_settings:dashboard_panels` | superadmin | Banner de 3 paneles en el inicio de todos los roles (`DashboardPanels`) |
| `site_settings:indicadores` | superadmin | Indicadores previsionales UF/UTM/AFP/dólar… (`Indicadores`, carga manual) |
| `site_settings:avisos` | super/admin | Avisos segmentados (`Aviso[]`, scope `all`/`empresas`/`trabajadores`) |
| `empresa_notes:{empresaId}` | empresa | Avisos/notas que la empresa muestra a SUS trabajadores (`EmpresaAviso[]`, con `targetIds` y `expiresAt`) |
| `site_articles` | super/admin | Artículos de blog (`ArticlesData = { articles: Article[] }`) |
| `slc_folders:{empresaId}` | empresa | Carpetas documentales personalizadas + asignaciones (ver §20.4) |

> **⚠️ A VERIFICAR (posible exposición de datos):** el **Blog público y los banners se leen con la anon key directamente desde el navegador** (visitante anónimo). Para que eso funcione, `kv_store_7d36b31f` debe permitir `SELECT` a `anon` sobre esas claves. Pero esa misma tabla guarda **perfiles de usuario** (datos sensibles). No existe ninguna política RLS de `kv_store` en `sql/` (solo se usa como fuente de los helpers RBAC). **Hay que confirmar contra producción** (`supabase db query --linked`) que el RLS de `kv_store` no deje a un anónimo leer perfiles al exponer `site_articles`/`site_settings:*`. Si está abierto, lo correcto es mover el contenido público a su propia tabla con RLS de solo-lectura pública, o una vista/Edge Function que filtre por prefijo de clave. Pendiente de auditar — no se tocó en esta pasada.

### 20.3 Blog público + SEO (commit `cosas`)

- **Rutas nuevas (`routes.tsx`)**: `/blog` (`Blog.tsx`) y `/blog/:slug` (`BlogArticle.tsx`), lazy + `wrap()`. Públicas (dentro del layout público).
- **`Blog.tsx`** lista solo artículos con `publicado === true` desde `site_articles`. **`BlogArticle.tsx`** renderiza un artículo por `slug`, con TOC, tiempo de lectura y tarjeta de autor.
- **Admin: `ArticlesManager.tsx` (NUEVO)** — sección "Blog / Artículos" en el menú de `admin` y `superadmin` (`ConectaDashboard.tsx`, `SuperAdminView.tsx`). CRUD de artículos (slug auto desde título, publicar/despublicar, keywords) guardado en `site_articles`. Integra **`seoAnalyzer.ts`** (score 0–100: longitud de título/descripción, densidad de keyword, headings H2/H3, calidad de slug).
- **SEO on-page**: `pageSeo.ts` (`setPageMeta` — title, description, canonical, Open Graph, Twitter Card) aplicado en las páginas públicas (Home, Servicios, Planes, Contacto, QuienesSomos, Blog). Estáticos nuevos en `public/`: **`robots.txt`** (`Allow: /` + sitemap) y **`sitemap.xml`** (portada + páginas públicas + `/blog`).
- ⚠️ **OJO — el `robots.txt` de §18.4/§12 era del Spider** (verificación de robots.txt *de la DT* al hacer scraping, todavía pendiente). Este `public/robots.txt` es el del **sitio propio** para crawlers de buscadores — **no** salda esa deuda del Spider, son cosas distintas.
- **Hallazgo de revisión (XSS almacenado, severidad baja):** `BlogArticle.tsx` renderiza el contenido con `dangerouslySetInnerHTML={{ __html: renderContent(article.contenido) }}`. `renderContent` es un mini-markdown→HTML casero que **no escapa HTML crudo** del texto fuente. Como `contenido` solo lo escribe `admin`/`superadmin` vía `ArticlesManager`, el vector requiere una cuenta admin maliciosa/comprometida, pero el blog es **público** (un `<script>` correría para todos los visitantes). Mitigación recomendada: escapar `<`/`>` antes de aplicar el markdown, o usar un sanitizador. No corregido en esta pasada.

### 20.4 Sistema de carpetas documentales (commit `cosas`)

- **`EnterpriseDocumentView.tsx`** (reescrito, ~957 líneas tocadas) y **`UsuarioView.tsx`** pasaron de un filtro plano de categoría a una **vista de carpetas tipo grid**: **carpetas fijas** (`contract`, `payroll`, `termination`, `annex`, `legal`, `other` — mapean a `file_category`/`tipo` existentes, con color) + **carpetas personalizadas** por empresa, persistidas en `slc_folders:{empresaId}` (lista de carpetas + asignaciones `docId → folderId`).
- **`DocumentUpload.tsx`**: nuevos props `preSelectedCategory` (categoría según la carpeta activa) y `extraCategories` (carpetas personalizadas, en un `<optgroup>`). **`maxFileSize` default bajado de 50 → 20 MB** (alinea con el RF-2.06: 20 MB por archivo). Mejor extracción del mensaje de error real de la Edge Function (`typeof ctx.json === 'function'`).

### 20.5 Avisos segmentados, indicadores y notas de empresa (commit `cosas`)

- **Avisos del super/admin (`AvisosManager.tsx`, `AvisosBanner.tsx`)**: publican avisos con `scope: 'all' | 'empresas' | 'trabajadores'` y `targetIds`, con `expiresAt` (se ocultan solos al vencer). Reemplazan al banner de indicadores en el inicio del dashboard.
- **Indicadores previsionales (`IndicadoresManager.tsx`, `IndicadoresBanner.tsx`)**: UF, UTM, renta mínima, tope AFP, SIS, asignación familiar, dólar — carga manual del superadmin en `site_settings:indicadores` con `updatedAt` ("actualizado al…"). *Nota:* el `IndicadoresBanner` se quitó del inicio del dashboard (`ConectaDashboard.tsx`) en esta pasada; el manager sigue.
- **Notas de empresa → avisos de empresa (`EmpresaNotesEditor.tsx`, `EmpresaNotesBanner.tsx`)**: la empresa publica **varios** avisos a sus trabajadores (antes era una sola nota), con `targetIds` ([] = todos) y `expiresAt`. `EmpresaNotesBanner` ahora recibe `userId` para filtrar avisos dirigidos a ese trabajador.

### 20.6 Correcciones varias (commits `arreglos` / `cosas`)

- **`AuthContext.tsx`**: guard `mounted` en el `useEffect` de bootstrap — todos los `setUser`/`setIsLoading`/`forceBlockedSession` se condicionan a `mounted` y el cleanup pone `mounted = false`. Evita updates de estado tras desmontar (warnings/race en logout rápido o navegación).
- **`PlanGate.tsx`**: (a) **fail-open tras 8 s** sin respuesta (`setTimeout` → `'allowed'`) para no dejar la sección colgada si la consulta no vuelve; (b) **normaliza `subscription_status` a minúsculas y acepta español + inglés** (`active/activo/activa`, `suspended/suspendido`, `archived/archivado`) — mitiga la inconsistencia de §19.7; (c) mensaje específico para el rol `usuario` ("Contacta a tu empleador…") en vez de "Ve a Mi Suscripción" (pulía el wording de §19.7).
- **`LoyGatekeeper.tsx`**: cachea `validatorId` con un solo `supabase.auth.getUser()` (antes lo llamaba 2–3 veces). El update masivo de documentos pendientes ahora agrupa por **`source_url`** (antes `title`), que es el identificador real del lote del Spider.
- **`validation.ts`**: `validateRut` rechaza cuerpos `< 1.000.000` (RUTs reales mínimos) además del dígito verificador módulo 11.
- **`ResetPassword.tsx`**: ya no filtra `error.message` crudo de Supabase al usuario (mensaje genérico "Intenta solicitar un nuevo enlace"); quita toasts redundantes de validación de formulario.
- **`ConectaLayout.tsx`**: logout ya no espera el delay artificial de 800 ms (`Promise.all([logout(), setTimeout 800])` → solo `await logout()`).
- **Assets / build**: imágenes de servicios en `src/assets/services/*` añadidas como **PNG** (`visuales`) y luego convertidas a **WebP** (`cosas`) vía `scripts/convert-webp.mjs` (usa `sharp`, redimensiona a 900px, calidad 82) y `scripts/use-webp.cjs`. Ajustes en `fonts.css`/`theme.css` y rediseño de `Footer`, `Header`, `Home`, `Planes`.

### 20.7 Pendiente / notas operativas

- **Deploy requerido** para 20.1: `supabase functions deploy payments-confirm payments-initiate` (uno por uno). `applyPayment.ts` es código `_shared` que se empaqueta con quien lo importe (`payments-confirm` y el confirmador manual) — redeployar esas funciones.
- **A auditar (lo más importante de esta revisión):** el RLS de `kv_store_7d36b31f` frente a la lectura anónima del Blog/banners (ver el aviso en §20.2). Es el único hallazgo con posible impacto de fuga de datos.
- **XSS almacenado de bajo riesgo** en `BlogArticle.tsx` (§20.3) — escapar/sanitizar el HTML del contenido.
- Sigue pendiente lo de §18.4/§19.7: Gatekeeper del Spider (auto-aprueba), verificación de `robots.txt` **en el Spider** (≠ el `public/robots.txt` nuevo), limpieza de ESLint, y la inconsistencia histórica de `subscription_status` en español/inglés (ya mitigada en PlanGate, no en el resto del código).

---

*Documento generado a partir del análisis completo de: ERS v1.5, Documento de Squad, Configuración del Servidor, Justificación Cloud, Épicas e Historias de Usuario, Plan de Pruebas Funcionales, Informe Final (Estado de Avance N°2), Documento de Registro y Definición, Diagrama de Arquitectura IA LOY, Visión del Proyecto (4 Pilares), Mapa Mental, Mapa de Actores y Diagrama Ishikawa.*

*Revisado contra código real del repositorio: package.json, vite.config.ts, src/app/routes.tsx, src/app/context/AuthContext.tsx, src/app/types/database.ts, supabase/functions/rag-query/index.ts, supabase/functions/web-spider-dt/index.ts, supabase/functions/payments-confirm/index.ts, supabase/functions/documents/index.ts, supabase/functions/secure-document-url/index.ts, sql/security_rls_and_flow.sql, sql/create_pending_emails_table.sql, .env.example, utils/supabase/info.tsx — y contra el estado real de producción vía `supabase db query --linked` / `supabase db advisors --linked` (pg_policies, pg_proc, pg_class de `qpttobsxyvmaxtmzcver`).*

*Versión: 1.3 | Fecha revisión: 16 de Junio de 2026 — auditoría de seguridad y calidad completa: bugs de control de acceso en Edge Functions (`secure-document-url`, `documents`), bugs de Rules of Hooks en frontend (`PerfilPage.tsx`, `PagosPage.tsx`), suite de tests rota (`useNotifications.test.tsx`), y todos los hallazgos CRITICAL/WARN del Security Advisor de Supabase corregidos en producción. Detalle completo en sección 18.*

*Versión: 1.4 | Fecha: 19 de Junio de 2026 — sesión de features y hardening de acceso (ver **sección 19**): bloqueo por mora/eliminación (suspended+archived) en login/sesión, gating de Documentos/Mensajes/perfil-de-trabajador por plan vía `PlanGate` (+ fix del bug que bloqueaba "Mi Suscripción"), `delete-enterprise` (soft-delete) y endurecimiento de `delete-user` (preserva documentos), candado de cambio de plan y pago combinado auditoría+plan, alta de empresa sin plan (auditoría pendiente), mensajería y subida de documentos del trabajador acotadas a su empresa, formato de RUT, hora de auditoría en hora de Chile (24h), y no auto-login al setear/cambiar contraseña. Build limpio + tests 4/4. Edge Functions a desplegar: `delete-enterprise`, `delete-user`, `documents`.*

*Versión: 1.5 | Fecha: 25 de Junio de 2026 — revisión de los commits sin número de versión posteriores a v1.29 (`visuales`/`cosas`/`arreglos`); detalle en **sección 20**: hardening de pagos Flow (idempotencia del webhook, no-degradar suscripción activa, `applyPayment` propaga errores), subsistema de contenido editable vía kv_store (`siteSettings.ts`), Blog público + SEO (`/blog`, `pageSeo`, `seoAnalyzer`, `robots.txt`, `sitemap.xml`), sistema de carpetas documentales (fijas + personalizadas en `slc_folders:{empresaId}`), avisos segmentados/indicadores/notas de empresa, y correcciones (PlanGate fail-open + normalización de estado, guard `mounted` en AuthContext, validateRut, etc.). Tests 4/4. **Hallazgos abiertos:** RLS de `kv_store` frente a lectura anónima del Blog (a auditar — posible fuga de perfiles) y XSS almacenado de bajo riesgo en `BlogArticle.tsx`. Edge Functions a desplegar: `payments-confirm`, `payments-initiate`.*
