// Client-side Web Audio API chime synthesizer & HTML5 Device Notification manager

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

// Ensure audio context resumes upon first user touch/click
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume()
    }
    window.removeEventListener('click', unlockAudio)
    window.removeEventListener('touchstart', unlockAudio)
  }
  window.addEventListener('click', unlockAudio, { passive: true })
  window.addEventListener('touchstart', unlockAudio, { passive: true })
}

/**
 * Synthesizes a crisp, gentle chime (C6 -> E6 melodic notes with smooth decay).
 * Requires zero external audio files.
 */
export function playNotificationSound() {
  if (typeof window === 'undefined') return

  // Check user preference (default true)
  const soundPref = localStorage.getItem('notification_sound_enabled')
  if (soundPref === 'false') return

  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Note 1 (587.33 Hz - D5)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now)
    gain1.gain.setValueAtTime(0.18, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.35)

    // Note 2 (880.00 Hz - A5) — creates a classic Messenger/iOS notification chime
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, now + 0.08)
    gain2.gain.setValueAtTime(0.22, now + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.45)
  } catch (err) {
    console.warn('Could not play notification chime:', err)
  }
}

/**
 * Request permission for HTML5 Desktop & Mobile notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }
  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch {
    return 'denied'
  }
}

/**
 * Show a native OS/Mobile device notification popup
 */
export function showDeviceNotification(
  title: string,
  options?: {
    body?: string
    icon?: string
    tag?: string
    onClickUrl?: string
  }
) {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body: options?.body || 'New activity on your post',
        icon: options?.icon || '/favicon.ico',
        tag: options?.tag || 'app-notification',
        badge: '/favicon.ico',
        silent: true // We play our custom Web Audio chime
      })

      notif.onclick = () => {
        window.focus()
        notif.close()
        if (options?.onClickUrl) {
          window.location.href = options.onClickUrl
        }
      }
    } catch (err) {
      console.warn('Native notification failed:', err)
    }
  }
}
