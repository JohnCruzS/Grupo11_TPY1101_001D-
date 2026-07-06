import { create } from 'zustand'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

interface NotificationStore {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
}

export const useNotifications = create<NotificationStore>((set, get) => ({
  notifications: [],
  addNotification: (notification) => {
    const id = Date.now().toString()
    const notif = { ...notification, id }
    set((state) => ({
      notifications: [...state.notifications, notif],
    }))
    if (notif.duration !== 0) {
      setTimeout(() => {
        get().removeNotification(id)
      }, notif.duration || 5000)
    }
  },
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }))
  },
}))