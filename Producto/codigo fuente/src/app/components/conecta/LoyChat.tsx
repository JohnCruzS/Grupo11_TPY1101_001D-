import { useState, useRef, useEffect } from 'react';
import { getSupabase } from '../../context/AuthContext';
import {
  Send,
  Bot,
  User,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    title: string;
    source_name: string;
    source_url?: string;
    similarity: number;
  }>;
  created_at: string;
}

interface LoyChatProps {
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
}

export function LoyChat({
  conversationId,
  onConversationCreated,
}: LoyChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(conversationId || null);
  const [showSources, setShowSources] = useState<Record<string, boolean>>({});
  const [tokensUsed, setTokensUsed] = useState(0);
  const [lastKnowledgeUpdate, setLastKnowledgeUpdate] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const supabase = getSupabase();

  const suggestions = [
    '¿Cuántos días de vacaciones me corresponden por año trabajado?',
    '¿Qué debe incluir un finiquito en Chile?',
    '¿Cuál es la diferencia entre contrato a plazo fijo e indefinido?',
    '¿Cómo se calculan las horas extras?',
  ];

  useEffect(() => {
    supabase
      .from('loy_knowledge_documents')
      .select('created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.created_at) {
          const d = new Date(data.created_at);
          setLastKnowledgeUpdate(
            d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
          );
        }
      });
  }, []);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('loy_messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(
        data?.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources_used,
          created_at: m.created_at,
        })) || []
      );
    } catch (err) {
      console.error('Error cargando conversación:', err);
    }
  };

  const createConversation = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const { data, error } = await supabase
        .from('loy_conversations')
        .insert({
          user_id: userData.user.id,
          title: 'Nueva consulta',
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentConversationId(data.id);
      onConversationCreated?.(data.id);
      return data.id;
    } catch (err) {
      console.error('Error creando conversación:', err);
      return null;
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    setLoading(true);
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);
    setInput('');

    try {

      let convId = currentConversationId;
      if (!convId) {
        convId = await createConversation();
      }

      const { data, error } = await supabase.functions.invoke('rag-query', {
        body: {
          query: content,
          conversation_id: convId,
          similarity_threshold: 0.7,
          max_results: 5,
        },
      });

      if (error) {
        throw new Error(error.message || 'Error en la consulta');
      }

      const assistantMessage: Message = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content:
          data?.response || data?.answer || 'Lo siento, no pude generar una respuesta.',
        sources: data?.sources,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMessage.id),
        { ...tempUserMessage, id: `user-${Date.now()}` },
        assistantMessage,
      ]);

      setTokensUsed((prev) => prev + (data?.tokens_used || 0));
    } catch (err) {
      toast.error('Error: ' + (err as Error).message);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const toggleSources = (messageId: string) => {
    setShowSources((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden">

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg">LOY Asistente Legal</h2>
            <p className="text-sm text-blue-100">Consultoría laboral 24/7</p>
            {lastKnowledgeUpdate && (
              <p className="text-xs text-blue-200 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Base legal actualizada al: {lastKnowledgeUpdate}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border-b border-yellow-200 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-yellow-800">
            <strong>Importante:</strong> LOY proporciona información orientativa
            basada en normativa vigente. No reemplaza la asesoría legal
            profesional. Verifica siempre con un abogado laboralista.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¡Hola! Soy LOY, tu asistente legal
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Puedo responder tus consultas sobre normativa laboral chilena,
              contratos, liquidaciones, vacaciones y más.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(suggestion)}
                  className="text-left p-3 text-sm bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 rounded-lg transition-colors border border-gray-200 hover:border-blue-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-indigo-100 text-indigo-600'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-5 h-5" />
                ) : (
                  <Bot className="w-5 h-5" />
                )}
              </div>

              <div
                className={`flex-1 max-w-[80%] ${
                  message.role === 'user' ? 'text-right' : ''
                }`}
              >
                <div
                  className={`inline-block text-left rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>

                {message.role === 'assistant' &&
                  message.sources &&
                  message.sources.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleSources(message.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <BookOpen className="w-3 h-3" />
                        {showSources[message.id]
                          ? 'Ocultar fuentes'
                          : `Ver ${message.sources.length} fuentes`}
                        {showSources[message.id] ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {showSources[message.id] && (
                        <div className="mt-2 bg-blue-50 rounded-lg p-3 text-sm">
                          <p className="font-medium text-gray-700 mb-2">
                            Fuentes consultadas:
                          </p>
                          <ul className="space-y-2">
                            {message.sources.map((source, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-blue-500">•</span>
                                <div>
                                  <span className="font-medium">
                                    {source.title}
                                  </span>
                                  <span className="text-gray-500">
                                    {' '}
                                    ({source.source_name})
                                  </span>
                                  {source.source_url && (
                                    <a
                                      href={source.source_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Ver
                                    </a>
                                  )}
                                  <span className="ml-2 text-xs text-gray-400">
                                    ({(source.similarity * 100).toFixed(0)}%
                                    match)
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                <div className="text-xs text-gray-400 mt-1">
                  {new Date(message.created_at).toLocaleTimeString('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 inline-block">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu consulta sobre normativa laboral..."
            className="flex-1 p-3 border rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>Presiona Enter para enviar, Shift+Enter para nueva línea</span>
          {tokensUsed > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />~{tokensUsed} tokens usados
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
