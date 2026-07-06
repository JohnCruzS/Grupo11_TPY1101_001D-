import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  RotateCcw,
} from 'lucide-react';
import { getSupabase, useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  role: 'bot' | 'user';
  text: string;
  time: string;
  sources?: Array<{
    title: string;
    source_url?: string;
    source_name?: string;
    similarity?: number;
  }>;
}

export default function ChatBot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bot',
      text: '¡Hola! Soy **LOY**, tu asistente legal especializado en derecho laboral chileno. Puedo ayudarte con consultas sobre legislación laboral, contratos, remuneraciones y cumplimiento normativo. ¿En qué puedo ayudarte hoy?',
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim(),
      time: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const { data, error } = await getSupabase().functions.invoke(
        'rag-query',
        {
          body: {
            query: userMessage.text,
            max_results: 5,
          },
        }
      );

      if (error) throw new Error(error.message);
      if (!data?.response) throw new Error('Respuesta inválida del asistente');

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: data.response,
        time: new Date().toLocaleTimeString(),
        sources: data.sources,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error querying RAG:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: 'Lo siento, tuve un problema al procesar tu consulta. Por favor, intenta de nuevo o contacta a nuestro equipo de soporte.',
        time: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        role: 'bot',
        text: '¡Hola! Soy **LOY**, tu asistente legal especializado en derecho laboral chileno. Puedo ayudarte con consultas sobre legislación laboral, contratos, remuneraciones y cumplimiento normativo. ¿En qué puedo ayudarte hoy?',
        time: new Date().toLocaleTimeString(),
      },
    ]);
  };

  if (!user) {
    return null;
  }

  return (
    <>

      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 z-50"
        aria-label="Abrir chat"
      >
        <MessageCircle size={24} />
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl z-50 flex flex-col">

          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <div>
                <h3 className="font-semibold">LOY - Asistente Legal</h3>
                <p className="text-sm opacity-90">
                  Especialista en derecho laboral
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="hover:bg-blue-700 p-1 rounded transition-colors"
                aria-label="Limpiar chat"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-blue-700 p-1 rounded transition-colors"
                aria-label="Cerrar chat"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">
                    {message.text}
                  </div>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-semibold mb-1">Fuentes:</p>
                      {message.sources.map((source, idx) => (
                        <a
                          key={idx}
                          href={source.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-blue-600 hover:underline truncate"
                        >
                          {source.title}
                          {source.source_name ? ` (${source.source_name})` : ''}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="text-xs opacity-70 mt-1">{message.time}</div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">
                      LOY está escribiendo...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu consulta legal..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isTyping}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors"
                aria-label="Enviar mensaje"
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Recuerda: Esta es información general, no asesoría legal
              personalizada.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
