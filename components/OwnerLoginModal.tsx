'use client'

import React, { useState } from 'react'
import { ShieldCheck, AlertCircle } from 'lucide-react'

interface OwnerLoginModalProps {
  onSuccess: () => void
  onClose: () => void
}

export default function OwnerLoginModal({ onSuccess, onClose }: OwnerLoginModalProps) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Authentication failed.')
        setLoading(false)
        return
      }

      onSuccess()
    } catch {
      setError('Connection error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
      <div className="w-full max-w-sm md-card p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#e6f4ea] text-[#1e8e3e] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1f1f1f] text-base">Owner Authentication</h3>
            <p className="text-xs text-[#5f6368]">Server-verified secure login</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Enter Owner PIN"
              autoFocus
              disabled={loading}
              required
              className="w-full px-4 py-3 md-input font-mono tracking-widest"
            />
            {error && (
              <div className="flex items-start gap-1.5 mt-2.5 p-2.5 rounded-xl bg-[#fce8e6] text-[#d93025] text-xs border border-[#f5c6cb]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 md-btn-text text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !pin.trim()}
              className="px-5 py-2 md-btn-filled text-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Authenticate'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
