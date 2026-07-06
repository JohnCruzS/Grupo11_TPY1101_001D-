######### npm run dev ###########

# SotLoy Conecta - Plataforma SaaS Multi-tenant

Sistema de gestión documental laboral con Inteligencia Artificial (RAG) para Pymes chilenas. Incluye trazabilidad forense, auditoría inmutable y cumplimiento normativo.

## Instalación

### Requisitos previos

- **Node.js** v18.0.0 o superior ([Descargar](https://nodejs.org/))
- **npm** v9.0.0 o superior (viene con Node.js)
- **Git** ([Descargar](https://git-scm.com/))
- Cuenta en [Supabase](https://supabase.com) (gratuita)

### Instalar dependencias

npm install

Esto instalará todas las librerías necesarias:

- React + Vite
- Supabase Client
- Radix UI Components
- Tailwind CSS
- html2pdf.js (para exportar PDF)
- Y más dependencias listadas en `package.json`

# Supabase Configuration (REQUERIDO)

VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui

# LOY AI Configuration

LOY_LLM_PROVIDER=github
GITHUB_MODELS_API_KEY=tu-token-de-github-models-aqui
GITHUB_MODELS_BASE_URL=https://models.inference.ai.azure.com
GITHUB_MODELS_MODEL=gpt-4o-mini

# Alternativas compatibles
OPENAI_API_KEY=tu-openai-api-key-aqui
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
GROQ_API_KEY=tu-groq-api-key-aqui
GROQ_MODEL=llama3-8b-8192

# Flow Payment Gateway (para pagos en producción)

VITE_FLOW_API_KEY=tu-flow-api-key-aqui
VITE_FLOW_SECRET_KEY=tu-flow-secret-aqui
VITE_FLOW_BASE_URL=https://www.flow.cl/api

### Iniciar el servidor de desarrollo

```bash
npm run dev
```
## Comandos Disponibles

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (http://localhost:5173)
npm run dev

# Build de producción
npm run build

# Vista previa del build
npm run preview

# Linting
npm run lint
```
rm -rf node_modules
npm install

```

---

## 📚 Documentación Adicional

- [Supabase Docs](https://supabase.com/docs)
- [React Router](https://reactrouter.com/en/main)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [OpenAI API](https://platform.openai.com/docs) (para asistente LOY)
- [Flow Payments](https://www.flow.cl/docs) (para pagos)
- [pgvector](https://github.com/pgvector/pgvector) (para RAG)
