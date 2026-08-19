'use client'

import React, { useState, useEffect } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetcher } from '@/lib/swr-fetcher'
import { AppNotification, DEFAULT_AVATAR } from '@/lib/types'
import {
  Bell,
  Heart,
  MessageCircle,
  Repeat,
  CornerDownRight,
  MessageSquare,
  CheckCheck,
  Volume2,
  VolumeX,
  Smartphone,
  Check,
  X
} from 'lucide-react'
import {
  playNotificationSound,
  requestNotificationPermission,
  showDeviceNotification
} from '@/lib/sound-notifications'

interface NotificationBellProps {
  currentUserId: string
}

export default function NotificationBell({ currentUserId }: NotificationBellProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default')

  // SWR: Notifications
  const { data, mutate } = useSWR('/api/notifications', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 3000
  })

  const notifications: AppNotification[] = data?.notifications || []
  const unreadCount: number = data?.unread_count || 0

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('notification_sound_enabled')
      setSoundEnabled(stored !== 'false')
      if ('Notification' in window) {
        setPushPermission(Notification.permission)
      }
    }
  }, [])

  const handleToggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    localStorage.setItem('notification_sound_enabled', next ? 'true' : 'false')
    if (next) {
      playNotificationSound()
    }
  }

  const handleRequestPush = async () => {
    const perm = await requestNotificationPermission()
    setPushPermission(perm)
    if (perm === 'granted') {
      playNotificationSound()
      showDeviceNotification('Notifications Activated! 🔔', {
        body: 'You will receive popups when users like, comment, or message you.'
      })
    }
  }

  const handleMarkAllRead = async () => {
    mutate(
      (curr: any) => ({
        ...curr,
        unread_count: 0,
        notifications: (curr?.notifications || []).map((n: AppNotification) => ({ ...n, is_read: true }))
      }),
      false
    )

    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true })
      })
    } catch {}
  }

  const handleNotificationClick = async (notif: AppNotification) => {
    // Mark as read
    if (!notif.is_read) {
      mutate(
        (curr: any) => ({
          ...curr,
          unread_count: Math.max(0, (curr?.unread_count || 1) - 1),
          notifications: (curr?.notifications || []).map((n: AppNotification) =>
            n.id === notif.id ? { ...n, is_read: true } : n
          )
        }),
        false
      )

      fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notif.id })
      }).catch(() => {})
    }

    setIsOpen(false)

    // Navigate to author profile or post
    if (notif.actor_id) {
      router.push(`/profile/${notif.actor_id}`)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    try {
      const now = Date.now()
      const diffSecs = Math.floor((now - new Date(dateString).getTime()) / 1000)
      if (diffSecs < 60) return 'Just now'
      const diffMins = Math.floor(diffSecs / 60)
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      const diffDays = Math.floor(diffHours / 24)
      if (diffDays < 7) return `${diffDays}d ago`
      return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  const renderTypeIcon = (type: string) => {
    switch (type) {
      case 'like':
        return (
          <span className="w-5 h-5 rounded-full bg-[#fce8e6] text-[#d93025] flex items-center justify-center shrink-0">
            <Heart className="w-3 h-3 fill-[#d93025]" />
          </span>
        )
      case 'comment':
        return (
          <span className="w-5 h-5 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
            <MessageCircle className="w-3 h-3" />
          </span>
        )
      case 'reply':
        return (
          <span className="w-5 h-5 rounded-full bg-[#e6f4ea] text-[#137333] flex items-center justify-center shrink-0">
            <CornerDownRight className="w-3 h-3" />
          </span>
        )
      case 'repost':
        return (
          <span className="w-5 h-5 rounded-full bg-[#fef7e0] text-[#b06000] flex items-center justify-center shrink-0">
            <Repeat className="w-3 h-3" />
          </span>
        )
      case 'message':
      default:
        return (
          <span className="w-5 h-5 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
            <MessageSquare className="w-3 h-3" />
          </span>
        )
    }
  }

  const renderActionText = (notif: AppNotification) => {
    switch (notif.type) {
      case 'like':
        return 'liked your post'
      case 'comment':
        return 'commented on your post'
      case 'reply':
        return 'replied to your comment'
      case 'repost':
        return 'reposted your post'
      case 'message':
        return 'sent you a message'
      default:
        return 'interacted with you'
    }
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-[#f1f4f8] text-[#5f6368] hover:text-[#1f1f1f] transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#d93025] text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="fixed sm:absolute top-14 sm:top-full sm:mt-2 left-2 right-2 sm:left-auto sm:right-0 sm:w-96 bg-white rounded-3xl shadow-2xl border border-[#e8eaed] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[80vh] sm:max-h-[85vh]">
            {/* Header */}
            <div className="p-3.5 px-4 border-b border-[#f1f4f8] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1f1f1f]">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#fce8e6] text-[#d93025] text-[10px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Sound Toggle */}
                <button
                  onClick={handleToggleSound}
                  className={`p-1.5 rounded-xl text-xs transition-colors ${
                    soundEnabled ? 'text-[#1a73e8] bg-[#e8f0fe]' : 'text-[#9aa0a6] hover:bg-[#f1f4f8]'
                  }`}
                  title={soundEnabled ? 'Notification Sound ON' : 'Notification Sound OFF'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                {/* Mark all as read */}
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="p-1.5 rounded-xl hover:bg-[#f1f4f8] text-[#5f6368] hover:text-[#1a73e8] text-xs transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Device Push Permission Banner (if not yet granted) */}
            {pushPermission === 'default' && (
              <div className="p-2.5 px-3.5 bg-gradient-to-r from-[#e8f0fe] to-[#f1f4f8] border-b border-[#dadce0] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Smartphone className="w-4 h-4 text-[#1a73e8] shrink-0" />
                  <p className="text-[11px] text-[#1f1f1f] leading-tight truncate">
                    Enable Mobile / Desktop Popups
                  </p>
                </div>
                <button
                  onClick={handleRequestPush}
                  className="px-2.5 py-1 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-[10px] font-bold shrink-0 transition-colors shadow-xs"
                >
                  Allow
                </button>
              </div>
            )}

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#f8fafb]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#f1f4f8] text-[#9aa0a6] flex items-center justify-center mx-auto">
                    <Bell className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-[#1f1f1f]">No notifications yet</p>
                  <p className="text-[11px] text-[#5f6368]">
                    When people like, comment, or repost your content, you'll see it here!
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 px-4 flex items-start gap-3 hover:bg-[#f8fafb] transition-colors cursor-pointer relative group ${
                      !notif.is_read ? 'bg-[#f0f7ff]/70' : ''
                    }`}
                  >
                    {/* Actor Avatar with Action Icon Badge */}
                    <div className="relative shrink-0">
                      <img
                        src={notif.actor?.avatar_url || DEFAULT_AVATAR}
                        alt={notif.actor?.display_name || 'User'}
                        className="w-10 h-10 rounded-full bg-[#f1f4f8] object-cover ring-1 ring-[#e8eaed]"
                      />
                      <div className="absolute -bottom-1 -right-1">
                        {renderTypeIcon(notif.type)}
                      </div>
                    </div>

                    {/* Text Body */}
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="text-[#1f1f1f] leading-snug">
                        <strong className="font-bold">{notif.actor?.display_name || 'Someone'}</strong>{' '}
                        <span className="text-[#3c4043]">{renderActionText(notif)}</span>
                      </p>

                      {notif.content_preview && (
                        <p className="text-[11px] text-[#5f6368] italic truncate mt-0.5 bg-black/5 p-1 rounded-md px-1.5">
                          "{notif.content_preview}"
                        </p>
                      )}

                      <span className="text-[10px] text-[#9aa0a6] mt-0.5 block">
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>

                    {/* Unread Blue Dot Indicator */}
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#1a73e8] shrink-0 mt-2" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
