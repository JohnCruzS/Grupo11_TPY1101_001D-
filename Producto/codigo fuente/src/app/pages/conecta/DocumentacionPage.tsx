import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  FileText,
  Shield,
  Users,
  Database,
  Bot,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Zap,
  Lock,
  Key,
  Globe,
  Cpu,
  BarChart3,
  TrendingUp,
  Archive,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ConectaLayout, NavItem } from '../../components/conecta/ConectaLayout';
import { LoadingScreen } from '../../components/conecta/LoadingScreen';

const MENU: NavItem[] = [
  { id: 'arquitectura', label: 'Arquitectura', icon: <Database size={15} /> },
  { id: 'componentes', label: 'Componentes', icon: <FileText size={15} /> },
  { id: 'seguridad', label: 'Seguridad', icon: <Shield size={15} /> },
  { id: 'ia', label: 'Asistente LOY', icon: <Bot size={15} /> },
  { id: 'implementacion', label: 'Implementación', icon: <Zap size={15} /> },
];

export default function DocumentacionPage() {
  const { user, isLoading } = useAuth();
  const [section, setSection] = useState('arquitectura');

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/conecta/login" replace />;
  if (user.rol !== 'admin' && user.rol !== 'superadmin')
    return <Navigate to={`/conecta/${user.rol}`} replace />;

  return (
    <ConectaLayout
      menuItems={MENU}
      activeSection={section}
      setActiveSection={setSection}
      accentColor="#8b5cf6"
      accentBg="#f3f0ff"
      roleName="Administración"
      roleIcon={<Shield size={11} />}
    >
      <DocumentationSection activeSection={section} />
    </ConectaLayout>
  );
}

function DocumentationSection({ activeSection }: { activeSection: string }) {
  const renderContent = () => {
    switch (activeSection) {
      case 'arquitectura':
        return <ArquitecturaSection />;
      case 'componentes':
        return <ComponentesSection />;
      case 'seguridad':
        return <SeguridadSection />;
      case 'ia':
        return <IASection />;
      case 'implementacion':
        return <ImplementacionSection />;
      default:
        return <ArquitecturaSection />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '2rem',
            color: '#091f34',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          Documentación del Sistema
        </h1>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1rem',
            color: '#6b7280',
            lineHeight: '1.6',
            maxWidth: '900px',
          }}
        >
          Plataforma SaaS Multi-tenant de gestión documental laboral con
          Inteligencia Artificial (RAG) especializada en derecho laboral
          chileno.
        </p>
      </div>

      {renderContent()}
    </div>
  );
}

function ArquitecturaSection() {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-4 mb-6">
          <Database size={32} className="text-blue-600" />
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '1.3rem',
              color: '#091f34',
              fontWeight: 600,
            }}
          >
            Arquitectura del Sistema
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '1rem',
                color: '#374151',
                fontWeight: 600,
                marginBottom: '16px',
              }}
            >
              🏗️ Infraestructura Base
            </h3>

            <div className="space-y-4">
              <div className="border-l-4 border-blue-600 pl-4">
                <h4
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem',
                    color: '#1a1a2e',
                    fontWeight: 600,
                  }}
                >
                  Supabase (PaaS Principal)
                </h4>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    lineHeight: '1.6',
                  }}
                >
                  <strong>
                    PostgreSQL + Storage + Edge Functions + pgvector
                  </strong>
                  <br />
                  • Base de datos relacional con extensión vectorial
                  <br />
                  • Almacenamiento seguro con URLs firmadas
                  <br />
                  • Funciones serverless para API
                  <br />• Embeddings y búsqueda semántica
                </p>
              </div>

              <div className="border-l-4 border-green-600 pl-4">
                <h4
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem',
                    color: '#1a1a2e',
                    fontWeight: 600,
                  }}
                >
                  Multi-tenant Architecture
                </h4>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    lineHeight: '1.6',
                  }}
                >
                  <strong>Row Level Security (RLS)</strong>
                  <br />
                  • Aislamiento de datos por empresa
                  <br />
                  • Políticas de acceso granular
                  <br />• Escalabilidad horizontal
                </p>
              </div>

              <div className="border-l-4 border-purple-600 pl-4">
                <h4
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem',
                    color: '#1a1a2e',
                    fontWeight: 600,
                  }}
                >
                  Cliente-Servidor
                </h4>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    lineHeight: '1.6',
                  }}
                >
                  <strong>Next.js + Tailwind CSS</strong>
                  <br />
                  • Frontend moderno y responsive
                  <br />
                  • Diseño mobile-first
                  <br />• Accesibilidad WCAG 2.1 AA
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '1rem',
                color: '#374151',
                fontWeight: 600,
                marginBottom: '16px',
              }}
            >
              🤖 Stack Tecnológico
            </h3>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.9rem',
                      color: '#1a1a2e',
                      fontWeight: 600,
                    }}
                  >
                    Frontend
                  </h4>
                  <ul className="space-y-2 mt-3">
                    <li
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        color: '#6b7280',
                      }}
                    >
                      • Next.js 15 + React 18
                    </li>
                    <li
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        color: '#6b7280',
                      }}
                    >
                      • Tailwind CSS + TypeScript
                    </li>
                    <li
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        color: '#6b7280',
                      }}
                    >
                      • Lucide React Icons
                    </li>
                  </ul>
                </div>

                <div>
                  <h4
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.9rem',
                      color: '#1a1a2e',
                      fontWeight: 600,
                    }}
                  >
                    Backend & AI
                  </h4>
                  <ul className="space-y-2 mt-3">
                    <li
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        color: '#6b7280',
                      }}
                    >
                      • Supabase Edge Functions
                    </li>
                    <li
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        color: '#6b7280',
                      }}
                    >
                      • OpenAI GPT-4o mini
                    </li>
                    <li
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        color: '#6b7280',
                      }}
                    >
                      • pgvector + Sentence Transformers
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComponentesSection() {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-4 mb-6">
          <FileText size={32} className="text-blue-600" />
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '1.3rem',
              color: '#091f34',
              fontWeight: 600,
            }}
          >
            Componentes Clave del Sistema
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="border-l-4 border-blue-600 pl-4">
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '1rem',
                  color: '#1a1a2e',
                  fontWeight: 600,
                }}
              >
                📄 Gestión Documental
              </h3>
              <ul className="space-y-2 mt-3">
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b7280',
                  }}
                >
                  <strong>DocumentUpload.tsx</strong> - Subida con drag & drop
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b7280',
                  }}
                >
                  <strong>EnterpriseDocumentView.tsx</strong> - Gestión
                  empresarial
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b7280',
                  }}
                >
                  <strong>UsuarioView.tsx</strong> - Vista de usuarios
                </li>
              </ul>
            </div>

            <div className="border-l-4 border-green-600 pl-4">
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '1rem',
                  color: '#1a1a2e',
                  fontWeight: 600,
                }}
              >
                🔐 Seguridad y Acceso
              </h3>
              <ul className="space-y-2 mt-3">
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b7280',
                  }}
                >
                  <strong>ConectaAuthContext.tsx</strong> - Autenticación
                  multi-rol
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b7280',
                  }}
                >
                  <strong>Row Level Security</strong> - Aislamiento por empresa
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b7280',
                  }}
                >
                  <strong>URLs Firmadas</strong> - Acceso temporal (60 min)
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-l-4 border-purple-600 pl-4">
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '1rem',
                  color: '#1a1a2e',
                  fontWeight: 600,
                }}
              >
                🤖 Inteligencia Artificial
              </h3>
              <ul className="space-y-2 mt-3">
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b7280',
                  }}
                >
                  <strong>ChatbotIA.tsx</strong> - Interfaz conversacional
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b7280',
                  }}
                >
                  <strong>RAG Architecture</strong> - Retrieval-Augmented
                  Generation
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b7280',
                  }}
                >
                  <strong>pgvector</strong> - Búsqueda semántica
                </li>
              </ul>
            </div>

            <div className="border-l-4 border-orange-600 pl-4">
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '1rem',
                  color: '#1a1a2e',
                  fontWeight: 600,
                }}
              >
                🔧 Integraciones
              </h3>
              <ul className="space-y-2 mt-3">
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b7280',
                  }}
                >
                  <strong>Flow Payment Gateway</strong> - Pasarela de pagos
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b7280',
                  }}
                >
                  <strong>Web Spider</strong> - Recolección automatizada
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b7280',
                  }}
                >
                  <strong>Reportes LRE</strong> - Generación CSV/XML
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SeguridadSection() {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-4 mb-6">
          <Shield size={32} className="text-blue-600" />
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '1.3rem',
              color: '#091f34',
              fontWeight: 600,
            }}
          >
            Seguridad y Cumplimiento Normativo
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={24} className="text-red-600" />
                <h3
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '1rem',
                    color: '#dc2626',
                    fontWeight: 600,
                  }}
                >
                  Problemática Detectada
                </h3>
              </div>
              <ul className="space-y-3">
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#7f1d1d',
                  }}
                >
                  <strong>Falta de centralización</strong> de documentos
                  laborales
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#7f1d1d',
                  }}
                >
                  <strong>Uso de medios informales</strong> (WhatsApp, email)
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#7f1d1d',
                  }}
                >
                  <strong>Pérdida de información</strong> y trazabilidad
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#7f1d1d',
                  }}
                >
                  <strong>Riesgo de incumplimiento</strong> legal
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 size={24} className="text-green-600" />
                <h3
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '1rem',
                    color: '#059669',
                    fontWeight: 600,
                  }}
                >
                  Solución Implementada
                </h3>
              </div>
              <ul className="space-y-3">
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#166534',
                  }}
                >
                  <strong>Plataforma web centralizada</strong> con gestión
                  documental
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#166534',
                  }}
                >
                  <strong>Control de accesos</strong> por roles (RBAC)
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#166534',
                  }}
                >
                  <strong>Trazabilidad inmutable</strong> (Audit Log)
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#166534',
                  }}
                >
                  <strong>IA con fuentes validadas</strong> (solo normativa
                  oficial)
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '1rem',
                  color: '#1d4ed8',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                🔐 Características de Seguridad
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Lock size={20} className="text-blue-600" />
                    <h4
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.9rem',
                        color: '#1a1a2e',
                        fontWeight: 600,
                      }}
                    >
                      Aislamiento de Datos
                    </h4>
                  </div>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      color: '#6b7280',
                    }}
                  >
                    <strong>PostgreSQL RLS</strong>
                    <br />
                    • Aislamiento por empresa
                    <br />
                    • Políticas granulares
                    <br />• Sin fuga de datos entre tenants
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Key size={20} className="text-blue-600" />
                    <h4
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.9rem',
                        color: '#1a1a2e',
                        fontWeight: 600,
                      }}
                    >
                      Cifrado y Almacenamiento
                    </h4>
                  </div>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      color: '#6b7280',
                    }}
                  >
                    <strong>AES-256 + URLs Firmadas</strong>
                    <br />
                    • Cifrado de documentos en reposo
                    <br />
                    • URLs con expiración (60 min)
                    <br />• Almacenamiento seguro en Supabase
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} className="text-yellow-600" />
                  <h4
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.9rem',
                      color: '#92400e',
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ Importante: Sin reemplazo de asesoría legal
                  </h4>
                </div>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#92400e',
                  }}
                >
                  El asistente LOY <strong>NO reemplaza</strong> la asesoría
                  legal profesional. Solo proporciona información basada en
                  normativa oficial y citando fuentes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IASection() {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-4 mb-6">
          <Bot size={32} className="text-blue-600" />
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '1.3rem',
              color: '#091f34',
              fontWeight: 600,
            }}
          >
            Asistente LOY - Inteligencia Artificial Especializada
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '1rem',
                  color: '#6b21a8',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                🧠 Arquitectura RAG
              </h3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <h4
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.9rem',
                      color: '#6b21a8',
                      fontWeight: 600,
                    }}
                  >
                    Retrieval-Augmented Generation
                  </h4>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      color: '#6b7280',
                      lineHeight: '1.6',
                    }}
                  >
                    Sistema que <strong>combina búsqueda vectorial</strong> con
                    generación de respuestas basadas en contexto recuperado. A
                    diferencia de modelos genéricos, LOY utiliza exclusivamente
                    la base de conocimientos propia del sistema.
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <h4
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.9rem',
                      color: '#6b21a8',
                      fontWeight: 600,
                    }}
                  >
                    Componentes Clave
                  </h4>
                  <ul className="space-y-2">
                    <li
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        color: '#6b7280',
                      }}
                    >
                      <strong>pgvector</strong> - Almacenamiento vectorial de
                      embeddings
                    </li>
                    <li
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        color: '#6b7280',
                      }}
                    >
                      <strong>Sentence Transformers</strong> - Procesamiento de
                      lenguaje natural
                    </li>
                    <li
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        color: '#6b7280',
                      }}
                    >
                      <strong>OpenAI GPT-4o mini</strong> - Motor de inferencia
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '1rem',
                  color: '#374151',
                  fontWeight: 600,
                }}
              >
                🎯 Ventajas Competitivas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.9rem',
                      color: '#059669',
                      fontWeight: 600,
                    }}
                  >
                    ✅ Respuestas Precisas
                  </h4>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      color: '#166534',
                    }}
                  >
                    Basadas en normativa legal actualizada y validada
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.9rem',
                      color: '#1d4ed8',
                      fontWeight: 600,
                    }}
                  >
                    📚 Fuentes Oficiales
                  </h4>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      color: '#6b7280',
                    }}
                  >
                    Citas directas a DT, SII, y normativa vigente
                  </p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.9rem',
                      color: '#6b21a8',
                      fontWeight: 600,
                    }}
                  >
                    🚀 Sin Alucinaciones
                  </h4>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      color: '#6b7280',
                    }}
                  >
                    Información verificada y sin inventar respuestas
                  </p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.9rem',
                      color: '#ea580c',
                      fontWeight: 600,
                    }}
                  >
                    ⚡ Contexto Relevante
                  </h4>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      color: '#6b7280',
                    }}
                  >
                    Solo documentos de la empresa del usuario
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '1rem',
                  color: '#dc2626',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                ⚠️ Limitaciones Importantes
              </h3>
              <ul className="space-y-2">
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#991b1b',
                  }}
                >
                  <strong>No interpreta documentos</strong> - Solo procesa texto
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#991b1b',
                  }}
                >
                  <strong>No da asesoría legal</strong> - Solo información
                  normativa
                </li>
                <li
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#991b1b',
                  }}
                >
                  <strong>Verifica siempre</strong> con profesionales legales
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImplementacionSection() {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border-gray-100 p-8">
        <div className="flex items-center gap-4 mb-6">
          <Zap size={32} className="text-blue-600" />
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '1.3rem',
              color: '#091f34',
              fontWeight: 600,
            }}
          >
            Implementación y Metodología
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="border-l-4 border-blue-600 pl-4">
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '1rem',
                  color: '#1a1a2e',
                  fontWeight: 600,
                }}
              >
                📋 Metodología Híbrida
              </h3>
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.9rem',
                      color: '#1d4ed8',
                      fontWeight: 600,
                    }}
                  >
                    Fase Inicial (Waterfall)
                  </h4>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      color: '#6b7280',
                    }}
                  >
                    <strong>
                      Definición del problema, ERS, matriz de riesgos
                    </strong>
                    <br />
                    Propósito: Establecer línea base sólida y aprobada
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.9rem',
                      color: '#059669',
                      fontWeight: 600,
                    }}
                  >
                    Desarrollo Iterativo (Scrum)
                  </h4>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      color: '#166534',
                    }}
                  >
                    <strong>Sprints de 1 semana</strong>
                    <br />
                    Planificación, desarrollo, daily stand-up
                    <br />
                    Revisión y retrospectiva continua
                  </p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-green-600 pl-4">
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '1rem',
                  color: '#1a1a2e',
                  fontWeight: 600,
                }}
              >
                👥 Organización del Equipo
              </h3>
              <div className="space-y-3">
                <div>
                  <h4
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.9rem',
                      color: '#1a1a2e',
                      fontWeight: 600,
                    }}
                  >
                    Cristian Alonso Soto Loyola
                  </h4>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      color: '#6b7280',
                    }}
                  >
                    <strong>Lead Backend & Data Architect</strong>
                    <br />
                    • Arquitectura general
                    <br />
                    • Implementación multi-tenant
                    <br />• Motor de auditoría
                  </p>
                </div>

                <div>
                  <h4
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.9rem',
                      color: '#1a1a2e',
                      fontWeight: 600,
                    }}
                  >
                    John Cruz
                  </h4>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      color: '#6b7280',
                    }}
                  >
                    <strong>Full-Stack & AI Specialist</strong>
                    <br />
                    • Frontend (Next.js + Tailwind)
                    <br />
                    • Implementación RAG + Web Spider
                    <br />• Interfaz conversacional
                  </p>
                </div>

                <div>
                  <h4
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.9rem',
                      color: '#1a1a2e',
                      fontWeight: 600,
                    }}
                  >
                    Equipo Cross-functional
                  </h4>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      color: '#6b7280',
                    }}
                  >
                    Colaboración en tareas de desarrollo
                    <br />
                    • Tablero Scrum con reuniones diarias
                    <br />• Revisiones frecuentes con cliente
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-6">
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '1rem',
                  color: '#374151',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                📅 Cronograma de Implementación
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                    <h4
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.9rem',
                        color: '#1a1a2e',
                        fontWeight: 600,
                      }}
                    >
                      Sprints 1-2
                    </h4>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        color: '#6b7280',
                      }}
                    >
                      Planificación y análisis
                    </p>
                  </div>

                  <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                    <h4
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.9rem',
                        color: '#1a1a2e',
                        fontWeight: 600,
                      }}
                    >
                      Sprints 3-4
                    </h4>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        color: '#6b7280',
                      }}
                    >
                      Diseño y arquitectura
                    </p>
                  </div>

                  <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                    <h4
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.9rem',
                        color: '#1a1a2e',
                        fontWeight: 600,
                      }}
                    >
                      Sprints 5-10
                    </h4>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        color: '#6b7280',
                      }}
                    >
                      Desarrollo iterativo
                    </p>
                  </div>

                  <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                    <h4
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.9rem',
                        color: '#1a1a2e',
                        fontWeight: 600,
                      }}
                    >
                      Sprints 11-12
                    </h4>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        color: '#6b7280',
                      }}
                    >
                      Pruebas y despliegue
                    </p>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-4 px-6 py-3 bg-blue-600 text-white rounded-lg">
                    <BarChart3 size={20} />
                    <div>
                      <h4
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.9rem',
                          fontWeight: 600,
                        }}
                      >
                        Entregas Iterativas
                      </h4>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.85rem',
                        }}
                      >
                        Demo funcional cada 2 sprints
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
