import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotifications } from './useNotifications'

describe('useNotifications', () => {

  beforeEach(() => {
    useNotifications.setState({ notifications: [] })
  })

  it('should initialize with empty notifications', () => {
    const { result } = renderHook(() => useNotifications())

    expect(result.current.notifications).toEqual([])
  })

  it('should add notification', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'Test',
        message: 'Test message',
        duration: 0,
      })
    })

    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.notifications[0].title).toBe('Test')
    expect(result.current.notifications[0].id).toBeDefined()
  })

  it('should remove notification', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.addNotification({
        type: 'info',
        title: 'Test',
        message: 'Test message',
        duration: 0,
      })
    })

    const id = result.current.notifications[0].id

    act(() => {
      result.current.removeNotification(id)
    })

    expect(result.current.notifications).toHaveLength(0)
  })
})
