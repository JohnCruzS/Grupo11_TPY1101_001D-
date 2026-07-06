import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  Send,
  Bot,
  User,
  RotateCcw,
  BookOpen,
  Sparkles,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { User as AuthUser, getSupabase } from '../../context/AuthContext';

interface Message {
  id: string;
  role: 'bot' | 'user';
  text: string;
  sources?: string[];
  time: string;
}

interface LoyResponse {
  response: string;
  sources: Array<{
    title: string;
    source_name: string;
    similarity: number;
  }>;
  conversation_id: string;
}

function now() {
  return new Date().toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderText(text: string | undefined) {
  if (!text) return null;
  return text.split(/(\*\*[^*]+\*\*|\n)/g).map((part, i) => {
    if (/^\*\*(.+)\*\*$/.test(part))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part === '\n') return <br key={i} />;
    return <span key={i}>{part}</span>;
  });
}

const SUGGESTIONS = [
  '¿Qué dice la ley sobre el plazo fijo?',
  '¿Cómo se calcula el finiquito?',
  '¿Cuántos días de vacaciones tengo?',
  '¿Cuáles son las causales de despido?',
  '¿Cómo funcionan las cotizaciones?',
  '¿Qué es el acoso laboral?',
];

interface Props {
  user: AuthUser;
}

export function ChatbotIA({ user }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: `Hola **${user.nombre}**, soy el **Asistente Legal IA** de SotLoy Conecta.\n\nEstoy entrenado con el Código del Trabajo chileno y documentación laboral actualizada. Puedes preguntarme sobre contratos, remuneraciones, despidos, vacaciones y más.\n\n¿En qué te puedo ayudar hoy?`,
      sources: [],
      time: now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    let cancelled = false;
    const checkAccess = async () => {
      const rol = user.rol || user.role;
      if (rol === 'admin' || rol === 'superadmin') {
        if (!cancelled) setAccessAllowed(true);
        return;
      }

      if ((rol === 'empresa' || rol === 'usuario') && user.empresaId) {
        const { data } = await getSupabase()
          .from('enterprises')
          .select('primer_mes_pagado, subscription_status')
          .eq('id', user.empresaId)
          .maybeSingle();
        const ok =
          data?.primer_mes_pagado === true ||
          data?.subscription_status === 'active';
        if (!cancelled) setAccessAllowed(!!ok);
        return;
      }
      if (!cancelled) setAccessAllowed(false);
    };
    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [user.rol, user.role, user.empresaId]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;

    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text: trimmed, time: now() },
    ]);
    setInput('');
    setTyping(true);

    try {

      const { data, error: functionError } =
        await getSupabase().functions.invoke('rag-query', {
          body: {
            query: trimmed,
            conversation_id: conversationId,
            max_results: 10,
          },
        });

      if (functionError) {

        try {
          const ctx = (functionError as { context?: { json?: () => Promise<unknown> } }).context;
          if (ctx && typeof ctx.json === 'function') {
            const bodyErr = (await ctx.json()) as { code?: string };
            if (bodyErr?.code === 'PLAN_REQUIRED') {
              setAccessAllowed(false);
              return;
            }
          }
        } catch {

        }
        throw new Error(functionError.message);
      }

      console.log('LOY Response:', data);

      const loyResponse = data as LoyResponse;

      if (!loyResponse || !loyResponse.response) {
        console.error('Respuesta inválida:', loyResponse);
        throw new Error('Respuesta inválida del asistente');
      }

      if (loyResponse.conversation_id) {
        setConversationId(loyResponse.conversation_id);
      }

      const sources = Array.from(
        new Set(
          loyResponse.sources
            ?.map((s) => s.title?.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim() || s.source_name)
            .filter(Boolean) || []
        )
      );

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'bot',
          text:
            loyResponse.response || 'Lo siento, no pude generar una respuesta.',
          sources,
          time: now(),
        },
      ]);
    } catch (err) {
      console.error('Error en LOY:', err);
      setError('Error al conectar con el asistente. Inténtalo de nuevo.');
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'bot',
          text: 'Lo siento, estoy teniendo problemas para conectar con mi base de conocimientos. Por favor, intenta de nuevo en unos momentos.',
          sources: [],
          time: now(),
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const reset = () => {
    setMessages([
      {
        id: 'welcome2',
        role: 'bot',
        text: `Hola **${user.nombre}**, soy **LOY**, tu Asistente Legal IA de SotLoy Conecta.\n\nEstoy conectado a la base de conocimientos legal. Puedes preguntarme sobre contratos, remuneraciones, despidos, vacaciones y más.\n\n¿En qué te puedo ayudar hoy?`,
        sources: [],
        time: now(),
      },
    ]);
    setInput('');
    setConversationId(null);
    setError(null);
  };

  if (accessAllowed === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center" style={{ backgroundColor: '#f8fafc' }}>
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: '#091f3410' }}>
          <Lock className="w-9 h-9" style={{ color: '#091f34' }} />
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: '#091f34' }}>
          Asistente LOY bloqueado
        </h2>
        <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">
          El Asistente Legal IA está disponible solo para empresas con un <strong>plan activo</strong>.
          Completa el pago de tu primer mes para desbloquear consultas ilimitadas con LOY.
        </p>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Ve a "Mi Suscripción" para activar tu plan.
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: '#f8fafc' }}
    >
      <style>{`
        @keyframes dotBounce {
          0%,80%,100%{transform:scale(0.8);opacity:0.3}
          40%{transform:scale(1.1);opacity:1}
        }
      `}</style>

      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ backgroundColor: '#fff', borderColor: '#e5e7eb' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#091f34' }}
          >
            <Sparkles size={16} color="#fff" />
          </div>
          <div>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.85rem',
                color: '#091f34',
                fontWeight: 600,
              }}
            >
              Asistente Legal IA
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.7rem',
                color: '#9ca3af',
              }}
            >
              {typing
                ? 'Analizando consulta...'
                : 'Especializado en Derecho Laboral Chileno'}
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs"
          style={{
            backgroundColor: '#f3f4f6',
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            color: '#6b7280',
          }}
        >
          <RotateCcw size={12} /> Limpiar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >

            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: msg.role === 'bot' ? '#091f34' : '#e5e7eb',
              }}
            >
              {msg.role === 'bot' ? (
                <Bot size={15} color="#fff" />
              ) : (
                <User size={15} color="#6b7280" />
              )}
            </div>
            <div
              className={`max-w-[80%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : ''}`}
            >
              <div
                className="px-4 py-3 rounded-lg"
                style={{
                  backgroundColor: msg.role === 'user' ? '#091f34' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#1a1a2e',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.82rem',
                  lineHeight: 1.7,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  borderRadius:
                    msg.role === 'user'
                      ? '12px 12px 4px 12px'
                      : '12px 12px 12px 4px',
                }}
              >
                {renderText(msg.text)}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <BookOpen size={10} color="#9ca3af" />
                  {msg.sources.map((s, idx) => (
                    <span
                      key={`${s}-${idx}`}
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#3b82f6',
                        border: '1px solid #bfdbfe',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.65rem',
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.62rem',
                  color: '#c4c9d4',
                }}
              >
                {msg.time}
              </span>
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#091f34' }}
            >
              <Bot size={15} color="#fff" />
            </div>
            <div
              className="px-4 py-3 flex gap-1.5 items-center rounded-xl"
              style={{
                backgroundColor: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: '#9ca3af',
                    display: 'inline-block',
                    animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="flex-shrink-0 px-3 py-1.5 text-xs rounded-full border transition-all"
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              fontFamily: "'Inter', sans-serif",
              color: '#4b5563',
              cursor: 'pointer',
              fontSize: '0.72rem',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                '#091f34';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                '#fff';
              (e.currentTarget as HTMLButtonElement).style.color = '#4b5563';
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="px-4 pb-4 flex gap-2 items-center">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Escribe tu consulta legal laboral..."
          className="flex-1 px-4 py-3 rounded-full border outline-none text-sm"
          style={{
            borderColor: '#e5e7eb',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.83rem',
            backgroundColor: '#fff',
            color: '#1a1a2e',
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || typing}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: input.trim() && !typing ? '#091f34' : '#e5e7eb',
            border: 'none',
            cursor: input.trim() && !typing ? 'pointer' : 'default',
          }}
        >
          <Send size={16} color="#fff" />
        </button>
      </div>
    </div>
  );
}
