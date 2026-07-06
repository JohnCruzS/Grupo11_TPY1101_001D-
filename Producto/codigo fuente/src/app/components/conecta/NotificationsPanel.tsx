import { useState } from 'react';
import {
  Bell,
  X,
  FileText,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Info,
} from 'lucide-react';
import { useNotificaciones } from '../../hooks/useNotificaciones';
import type { Notificacion } from '../../types/database';

interface Props {
  userId: string;
  userRol: string;
}

export function NotificationsPanel({ userId, userRol }: Props) {
  const [showPanel, setShowPanel] = useState(false);
  const {
    notificaciones,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotificacion,
  } = useNotificaciones(userId);

  const getIcon = (tipo: Notificacion['tipo']) => {
    switch (tipo) {
      case 'success':
        return <CheckCircle2 size={16} color="#10b981" />;
      case 'error':
        return <AlertCircle size={16} color="#ef4444" />;
      case 'warning':
        return <AlertCircle size={16} color="#f59e0b" />;
      case 'info':
      default:
        return <Info size={16} color="#3b82f6" />;
    }
  };

  const getIconBg = (tipo: Notificacion['tipo']) => {
    switch (tipo) {
      case 'success':
        return '#f0fdf4';
      case 'error':
        return '#fef2f2';
      case 'warning':
        return '#fffbeb';
      case 'info':
      default:
        return '#eff6ff';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} horas`;
    return date.toLocaleDateString('es-CL');
  };

  return (
    <div className="relative">

      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <Bell size={20} color="#6b7280" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
            style={{
              backgroundColor: '#ef4444',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div
          className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          style={{ maxHeight: '500px' }}
        >

          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#091f34',
              }}
            >
              🔔 Notificaciones
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    markAllAsRead();
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Marcar todo leído
                </button>
              )}
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 rounded hover:bg-gray-100"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <X size={16} color="#6b7280" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#9ca3af',
                  }}
                >
                  Cargando...
                </p>
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={32} color="#d1d5db" className="mx-auto mb-2" />
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#9ca3af',
                  }}
                >
                  No tienes notificaciones
                </p>
              </div>
            ) : (
              notificaciones.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors group ${
                    !notif.leida ? 'bg-blue-50/30' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notif.id);
                    if (notif.link) window.open(notif.link, '_blank');
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: getIconBg(notif.tipo) }}
                    >
                      {getIcon(notif.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '0.85rem',
                            fontWeight: notif.leida ? 500 : 600,
                            color: notif.leida ? '#374151' : '#091f34',
                          }}
                        >
                          {notif.titulo}
                        </p>
                        {!notif.leida && (
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: '#3b82f6' }}
                          />
                        )}
                      </div>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.8rem',
                          color: '#6b7280',
                        }}
                        className="mt-1"
                      >
                        {notif.mensaje}
                      </p>
                      {notif.link && (
                        <p className="mt-1 text-xs text-blue-600">
                          {notif.link_text || 'Ver más'}
                        </p>
                      )}
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.7rem',
                          color: '#9ca3af',
                        }}
                        className="mt-2"
                      >
                        {formatTime(notif.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotificacion(notif.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={14} color="#9ca3af" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {notificaciones.length > 0 && (
            <div className="p-3 border-t border-gray-100 text-center">
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                }}
              >
                {unreadCount} sin leer de {notificaciones.length} total
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
