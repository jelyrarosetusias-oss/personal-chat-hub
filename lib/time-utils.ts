export function formatOfflineDuration(lastActiveIso?: string | null): string {
  if (!lastActiveIso) return 'Offline'
  try {
    const lastActive = new Date(lastActiveIso).getTime()
    const now = Date.now()
    const diffMs = now - lastActive
    if (diffMs < 0 || isNaN(diffMs)) return 'Offline'

    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    if (diffMinutes < 1) return 'Active just now'
    if (diffMinutes < 60) return `Offline for ${diffMinutes}m`

    const diffHours = Math.floor(diffMinutes / 60)
    const remMinutes = diffMinutes % 60
    if (diffHours < 24) {
      return remMinutes > 0 ? `Offline for ${diffHours}h ${remMinutes}m` : `Offline for ${diffHours}h`
    }

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Offline for 1 day'
    if (diffDays < 30) return `Offline for ${diffDays} days`

    return `Last seen ${new Date(lastActiveIso).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
  } catch {
    return 'Offline'
  }
}
