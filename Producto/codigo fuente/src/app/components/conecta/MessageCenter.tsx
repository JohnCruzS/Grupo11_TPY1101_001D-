import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Send,
  X,
  MessageSquare,
  Check,
  CheckCheck,
  ChevronLeft,
  Search,
} from 'lucide-react';
import { getSupabase } from '../../context/AuthContext';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender_name?: string;
  sender_role?: string;
}

interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_role: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  avatar_initials: string;
}

interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
  empresaId?: string;
}

interface Props {
  currentUserId: string;
  currentUserRole: string;
  currentUserName: string;
  allowedRoles: string[];
  empresaId?: string;
}

export function MessageCenter({
  currentUserId,
  currentUserRole,
  currentUserName,
  allowedRoles,
  empresaId,
}: Props) {
  const supabase = getSupabase();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContactList, setShowContactList] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const subscriptionRef = useRef<any>(null);

  interface KVStorePayload {
    key: string;
    value: {
      content: string;
      read: boolean;
      created_at: string;
      sender_name?: string;
      sender_role?: string;
    };
    new?: KVStorePayload['value'];
  }

  const loadConversations = useCallback(async () => {

    const { data: profiles } = await supabase
      .from('kv_store_7d36b31f')
      .select('key, value')
      .like('key', 'slc_user:%');

    const userMap = new Map();

    profiles?.forEach((p: { key: string; value: any }) => {
      const userId = p.key.replace('slc_user:', '');
      userMap.set(userId, {
        id: userId,
        name: `${p.value.nombre} ${p.value.apellido}`,
        role: p.value.rol,
        email: p.value.email,
      });
    });

    const { data: allMessages } = await supabase
      .from('kv_store_7d36b31f')
      .select('key, value')
      .like('key', 'msg:%');

    if (!allMessages) return;

    const convMap = new Map<
      string,
      {
        participant_id: string;
        last_message: string;
        last_message_time: string;
        unread_count: number;
      }
    >();

    allMessages.forEach((msg: { key: string; value: KVStorePayload['value'] }) => {
      const parts = msg.key.split(':');
      if (parts.length < 4) return;

      const senderId = parts[1];
      const receiverId = parts[2];

      if (senderId !== currentUserId && receiverId !== currentUserId) return;

      const participantId = senderId === currentUserId ? receiverId : senderId;
      const isReceived = receiverId === currentUserId;

      const existing = convMap.get(participantId);
      const msgTime = new Date(msg.value.created_at).getTime();

      if (
        !existing ||
        msgTime > new Date(existing.last_message_time).getTime()
      ) {
        convMap.set(participantId, {
          participant_id: participantId,
          last_message: msg.value.content,
          last_message_time: msg.value.created_at,
          unread_count:
            (existing?.unread_count || 0) +
            (isReceived && !msg.value.read ? 1 : 0),
        });
      } else if (isReceived && !msg.value.read) {
        convMap.set(participantId, {
          ...existing,
          unread_count: existing.unread_count + 1,
        });
      }
    });

    const conversationsArray: Conversation[] = Array.from(convMap.values()).map(
      (conv) => {
        const contact = userMap.get(conv.participant_id);

        const lastMsg = allMessages
          .filter((m: { key: string; value: KVStorePayload['value'] }) => {
            const parts = m.key.split(':');
            const senderId = parts[1];
            const receiverId = parts[2];
            return (
              (senderId === conv.participant_id ||
                receiverId === conv.participant_id) &&
              (senderId === currentUserId || receiverId === currentUserId)
            );
          })
          .sort(

            (a: any, b: any) =>
              new Date(b.value.created_at).getTime() -
              new Date(a.value.created_at).getTime()
          )[0];

        const senderNameFromMsg = lastMsg?.value?.sender_name;
        const senderRoleFromMsg = lastMsg?.value?.sender_role;
        const participantName =
          contact?.name || senderNameFromMsg || 'Usuario desconocido';
        const participantRole = contact?.role || senderRoleFromMsg || 'usuario';

        return {
          id: conv.participant_id,
          participant_id: conv.participant_id,
          participant_name: participantName,
          participant_role: participantRole,
          last_message: conv.last_message,
          last_message_time: conv.last_message_time,
          unread_count: conv.unread_count,
          avatar_initials: participantName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase(),
        };
      }
    );

    conversationsArray.sort(
      (a, b) =>
        new Date(b.last_message_time).getTime() -
        new Date(a.last_message_time).getTime()
    );

    setConversations(conversationsArray);
  }, [supabase, currentUserId]);

  const loadAvailableContacts = useCallback(async () => {
    const { data: profiles } = await supabase
      .from('kv_store_7d36b31f')
      .select('key, value')
      .like('key', 'slc_user:%');

    if (!profiles) return;

    let contacts: Contact[] = profiles
      .map((p: { key: string; value: any }) => ({
        id: p.key.replace('slc_user:', ''),
        name: `${p.value.nombre} ${p.value.apellido}`,
        role: p.value.rol,
        email: p.value.email,
        empresaId: p.value.empresaId || p.value.empresa_id,
      }))
      .filter((c) => c.id !== currentUserId && allowedRoles.includes(c.role));

    if (empresaId) {
      const { data: members } = await supabase
        .from('user_enterprises')
        .select('user_id')
        .eq('enterprise_id', empresaId)
        .eq('is_active', true);

      const memberIds = new Set(members?.map((m: { user_id: string }) => m.user_id) ?? []);

      contacts = contacts.filter(
        (c) =>
          ['admin', 'superadmin'].includes(c.role) ||
          memberIds.has(c.id) ||
          c.empresaId === empresaId
      );
    }

    setAvailableContacts(contacts);
  }, [supabase, currentUserId, allowedRoles, empresaId]);

  const loadMessages = useCallback(async (participantId: string) => {

    const { data: participantProfile, error: participantError } = await supabase
      .from('kv_store_7d36b31f')
      .select('value')
      .eq('key', `slc_user:${participantId}`)
      .maybeSingle();

    if (participantError) {
      console.error('Error cargando perfil participante:', participantError);
    }

    const participant = participantProfile?.value;
    const participantName = participant
      ? `${participant.nombre} ${participant.apellido}`
      : 'Usuario desconocido';

    const { data: sentMessages } = await supabase
      .from('kv_store_7d36b31f')
      .select('key, value')
      .like('key', `msg:${currentUserId}:${participantId}:%`);

    const { data: receivedMessages } = await supabase
      .from('kv_store_7d36b31f')
      .select('key, value')
      .like('key', `msg:${participantId}:${currentUserId}:%`);

    const allMessages: Message[] = [];

    const processMessages = (data: { key: string; value: KVStorePayload['value'] }[]) => {
      data?.forEach((msg) => {
        const parts = msg.key.split(':');
        const senderId = parts[1];
        const isMe = senderId === currentUserId;

        const senderName =
          msg.value?.sender_name || (isMe ? currentUserName : participantName);
        const senderRole =
          msg.value?.sender_role ||
          (isMe ? currentUserRole : participant?.rol || 'usuario');

        allMessages.push({
          id: msg.key,
          sender_id: senderId,
          receiver_id: parts[2],
          content: msg.value.content,
          created_at: msg.value.created_at,
          read: msg.value.read,
          sender_name: senderName,
          sender_role: senderRole,
        });
      });
    };

    processMessages(sentMessages || []);
    processMessages(receivedMessages || []);

    allMessages.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    setMessages(allMessages);
  }, [supabase, currentUserId, currentUserName, currentUserRole]);

  const markAsRead = useCallback(async (participantId: string) => {

    const { data: receivedMessages } = await supabase
      .from('kv_store_7d36b31f')
      .select('key, value')
      .like('key', `msg:${participantId}:${currentUserId}:%`);

    for (const msg of receivedMessages || []) {
      if (!msg.value.read) {
        await supabase
          .from('kv_store_7d36b31f')
          .update({
            value: { ...msg.value, read: true },
          })
          .eq('key', msg.key);
      }
    }

    setConversations((prev) =>
      prev.map((c) =>
        c.participant_id === participantId ? { ...c, unread_count: 0 } : c
      )
    );
  }, [supabase, currentUserId]);

  const handleNewMessage = useCallback(async (payload: KVStorePayload) => {

    const parts = payload.key.split(':');
    if (parts.length < 4) return;

    const senderId = parts[1];
    const receiverId = parts[2];

    if (receiverId === currentUserId) {

      let senderName = payload.value?.sender_name;
      let senderRole = payload.value?.sender_role;

      if (!senderName) {
        const { data: senderProfile, error: senderError } = await supabase
          .from('kv_store_7d36b31f')
          .select('value')
          .eq('key', `slc_user:${senderId}`)
          .maybeSingle();

        if (senderError) {
          console.error('Error cargando perfil del remitente:', senderError);
        }

        const sender = senderProfile?.value;
        senderName = sender
          ? `${sender.nombre} ${sender.apellido}`
          : 'Usuario desconocido';
        senderRole = sender?.rol || 'usuario';
      }
      const avatar = senderName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      setConversations((prev) => {
        const existing = prev.find((c) => c.participant_id === senderId);
        let updated: Conversation[];

        if (existing) {
          updated = prev.map((c) =>
            c.participant_id === senderId
              ? {
                  ...c,
                  last_message: payload.value.content,
                  last_message_time: payload.value.created_at,
                  unread_count:
                    selectedConversation?.participant_id === senderId
                      ? 0
                      : c.unread_count + 1,
                }
              : c
          );
        } else {
          const newConversation: Conversation = {
            id: Date.now().toString(),
            participant_id: senderId,
            participant_name: senderName,
            participant_role: senderRole,
            last_message: payload.value.content,
            last_message_time: payload.value.created_at,
            unread_count: 1,
            avatar_initials: avatar,
          };
          updated = [newConversation, ...prev];
        }

        return updated;
      });

      if (selectedConversation?.participant_id === senderId) {
        loadMessages(senderId);
      }
    }
  }, [supabase, currentUserId, loadMessages, selectedConversation]);

  useEffect(() => {
    const init = async () => {
      await loadAvailableContacts();
      await loadConversations();
    };
    init();

    const subscription = supabase
      .channel(`messages-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kv_store_7d36b31f',
        },
        (payload: { new?: { key?: string } }) => {
          if (payload.new?.key?.startsWith('msg:')) {
            handleNewMessage(payload.new as KVStorePayload);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = subscription;

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUserId, supabase, handleNewMessage, loadAvailableContacts, loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.participant_id);
      markAsRead(selectedConversation.participant_id);
    }
  }, [selectedConversation, loadMessages, markAsRead]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setLoading(true);

    if (empresaId && selectedConversation.participant_role === 'usuario') {
      const { data: membership } = await supabase
        .from('user_enterprises')
        .select('user_id')
        .eq('enterprise_id', empresaId)
        .eq('user_id', selectedConversation.participant_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!membership) {
        toast.error('No puedes enviar mensajes a usuarios de otras empresas');
        setLoading(false);
        return;
      }
    }

    const timestamp = Date.now();
    const messageKey = `msg:${currentUserId}:${selectedConversation.participant_id}:${timestamp}`;

    const messageData = {
      content: newMessage.trim(),
      read: false,
      created_at: new Date().toISOString(),
      sender_name: currentUserName,
      sender_role: currentUserRole,
    };

    const { error } = await supabase.from('kv_store_7d36b31f').insert({
      key: messageKey,
      value: messageData,
    });

    if (error) {
      console.error('❌ Error al enviar:', error);
      toast.error('Error al enviar mensaje: ' + error.message);
      setLoading(false);
      return;
    }

    await supabase.functions.invoke('audit-log', {
      body: {
        action: 'MESSAGE_SEND',
        resourceType: 'message',
        resourceId: messageKey,
        success: true,
        metadata: {
          receiver_id: selectedConversation.participant_id,
          content_length: newMessage.trim().length,
        },
      },
    });

    const message: Message = {
      id: messageKey,
      sender_id: currentUserId,
      receiver_id: selectedConversation.participant_id,
      content: newMessage.trim(),
      created_at: messageData.created_at,
      read: false,
      sender_name: currentUserName,
      sender_role: currentUserRole,
    };

    setMessages((prev) => [...prev, message]);

    setConversations((prev) => {
      const existing = prev.find(
        (c) => c.participant_id === selectedConversation.participant_id
      );
      let updated: Conversation[];

      if (existing) {
        updated = prev.map((c) =>
          c.participant_id === selectedConversation.participant_id
            ? {
                ...c,
                last_message: newMessage.trim(),
                last_message_time: messageData.created_at,
              }
            : c
        );
      } else {
        const newConversation: Conversation = {
          id: Date.now().toString(),
          participant_id: selectedConversation.participant_id,
          participant_name: selectedConversation.participant_name,
          participant_role: selectedConversation.participant_role,
          last_message: newMessage.trim(),
          last_message_time: messageData.created_at,
          unread_count: 0,
          avatar_initials: selectedConversation.avatar_initials,
        };
        updated = [newConversation, ...prev];
      }

      updated.sort(
        (a, b) =>
          new Date(b.last_message_time).getTime() -
          new Date(a.last_message_time).getTime()
      );

      return updated;
    });

    setNewMessage('');
    setLoading(false);
    toast.success('Mensaje enviado');
  }, [supabase, currentUserId, currentUserName, currentUserRole, selectedConversation, newMessage]);

  const startConversation = useCallback(async (contact: Contact) => {
    const existing = conversations.find((c) => c.participant_id === contact.id);

    if (existing) {
      setSelectedConversation(existing);
    } else {
      const newConversation: Conversation = {
        id: Date.now().toString(),
        participant_id: contact.id,
        participant_name: contact.name,
        participant_role: contact.role,
        last_message: '',
        last_message_time: new Date().toISOString(),
        unread_count: 0,
        avatar_initials: contact.name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase(),
      };

      setConversations((prev) => [newConversation, ...prev]);
      setSelectedConversation(newConversation);
    }

    setShowContactList(false);
  }, [conversations, setConversations, setSelectedConversation, setShowContactList]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  };

  const filteredContacts = availableContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className="relative h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-100">

      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <MessageSquare size={20} color="#3b82f6" />
          </div>
          <div>
            <h3
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '1rem',
                fontWeight: 600,
                color: '#091f34',
              }}
            >
              Mensajes
            </h3>
            {totalUnread > 0 && (
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: '#3b82f6',
                }}
              >
                {totalUnread} mensaje{totalUnread > 1 ? 's' : ''} sin leer
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowContactList(true)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2"
          style={{
            fontFamily: "'Inter', sans-serif",
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Send size={14} />
          Nuevo
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">

        <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 md:flex-shrink-0 md:border-r border-gray-100 overflow-y-auto`}>
            {conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare
                  size={48}
                  color="#d1d5db"
                  className="mx-auto mb-4"
                />
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem',
                    color: '#6b7280',
                  }}
                >
                  No tienes conversaciones aún
                </p>
                <button
                  onClick={() => setShowContactList(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Iniciar conversación
                </button>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className="p-4 flex items-center gap-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{
                      backgroundColor:
                        conv.participant_role === 'admin'
                          ? '#fffbeb'
                          : conv.participant_role === 'empresa'
                            ? '#f0fdf4'
                            : '#eff6ff',
                      color:
                        conv.participant_role === 'admin'
                          ? '#d97706'
                          : conv.participant_role === 'empresa'
                            ? '#15803d'
                            : '#3b82f6',
                    }}
                  >
                    {conv.avatar_initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: '#091f34',
                        }}
                      >
                        {conv.participant_name}
                      </p>
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.7rem',
                          color: '#9ca3af',
                        }}
                      >
                        {formatTime(conv.last_message_time)}
                      </span>
                    </div>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.8rem',
                        color: '#6b7280',
                      }}
                      className="truncate"
                    >
                      {conv.last_message || 'Sin mensajes'}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

        <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center">
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#9ca3af' }}>
                Selecciona una conversación para empezar
              </p>
            </div>
          ) : (
          <div className="flex-1 flex flex-col">

            <div className="p-3 border-b border-gray-100 flex items-center gap-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="p-1 hover:bg-gray-100 rounded md:hidden"
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={20} color="#6b7280" />
              </button>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor:
                    selectedConversation.participant_role === 'admin'
                      ? '#fffbeb'
                      : selectedConversation.participant_role === 'empresa'
                        ? '#f0fdf4'
                        : '#eff6ff',
                  color:
                    selectedConversation.participant_role === 'admin'
                      ? '#d97706'
                      : selectedConversation.participant_role === 'empresa'
                        ? '#15803d'
                        : '#3b82f6',
                }}
              >
                {selectedConversation.avatar_initials}
              </div>
              <div>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#091f34',
                  }}
                >
                  {selectedConversation.participant_name}
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.7rem',
                    color: '#9ca3af',
                  }}
                >
                  {selectedConversation.participant_role === 'admin'
                    ? '🛡️ Administrador'
                    : selectedConversation.participant_role === 'empresa'
                      ? '🏢 Empresa'
                      : selectedConversation.participant_role === 'superadmin'
                        ? '👑 SuperAdmin'
                        : '👤 Usuario'}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      color: '#9ca3af',
                    }}
                  >
                    No hay mensajes aún. ¡Inicia la conversación!
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender_id === currentUserId;

                  const _showAvatar =
                    idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} rounded-lg p-3`}
                      >
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '0.85rem',
                          }}
                        >
                          {msg.content}
                        </p>
                        <div
                          className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}
                        >
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: '0.65rem',
                              opacity: 0.7,
                            }}
                          >
                            {formatTime(msg.created_at)}
                          </span>
                          {isMe &&
                            (msg.read ? (
                              <CheckCheck size={12} />
                            ) : (
                              <Check size={12} />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || loading}
                  className="p-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                  style={{
                    border: 'none',
                    cursor: newMessage.trim() && !loading ? 'pointer' : 'not-allowed',
                  }}
                  aria-busy={loading}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {showContactList && (
        <div className="absolute inset-0 bg-white z-50 rounded-lg flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '1rem',
                fontWeight: 600,
                color: '#091f34',
              }}
            >
              Nuevo mensaje
            </h3>
            <button
              onClick={() => setShowContactList(false)}
              className="p-1 hover:bg-gray-100 rounded"
              style={{ border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <X size={20} color="#6b7280" />
            </button>
          </div>

          <div className="p-4 flex-1 flex flex-col min-h-0">
            <div className="relative mb-4 flex-shrink-0">
              <Search
                size={16}
                className="absolute left-3 top-2.5 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar contacto..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => startConversation(contact)}
                  className="p-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer rounded-lg"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{
                      backgroundColor:
                        contact.role === 'admin'
                          ? '#fffbeb'
                          : contact.role === 'empresa'
                            ? '#f0fdf4'
                            : contact.role === 'superadmin'
                              ? '#faf5ff'
                              : '#eff6ff',
                      color:
                        contact.role === 'admin'
                          ? '#d97706'
                          : contact.role === 'empresa'
                            ? '#15803d'
                            : contact.role === 'superadmin'
                              ? '#7c3aed'
                              : '#3b82f6',
                    }}
                  >
                    {contact.name
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: '#091f34',
                      }}
                    >
                      {contact.name}
                    </p>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.75rem',
                        color: '#9ca3af',
                      }}
                    >
                      {contact.role === 'admin'
                        ? '🛡️ Admin'
                        : contact.role === 'empresa'
                          ? '🏢 Empresa'
                          : contact.role === 'superadmin'
                            ? '👑 SuperAdmin'
                            : '👤 Usuario'}{' '}
                      · {contact.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
