'use client'

import React, { useState } from 'react'
import { ShieldCheck, KeyRound, ArrowRight, Lock, Sparkles, AlertCircle, Terminal } from 'lucide-react'
import confetti from 'canvas-confetti'

interface InviteFormProps {
  onSuccess: (code: string, inviteData: any) => void
}

const SAMPLE_CODES = ['CODE-ALPHA', 'CODE-BRAVO', 'CODE-CHARLIE', 'CODE-DELTA']

export default function InviteForm({ onSuccess }: InviteFormProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e?: React.FormEvent, overrideCode?: string) => {
    if (e) e.preventDefault()
    const targetCode = (overrideCode || code).trim()

    if (!targetCode) {
      setError('Please enter your unique invite passcode.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/validate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: targetCode }),
      })

      const data = await res.json()

      if (!res.ok || !data.valid) {
        setError(data.error || 'Invalid or expired invite code.')
        setLoading(false)
        return
      }

      // Trigger confetti celebration on valid code entry
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#3b82f6']
      })

      setTimeout(() => {
        onSuccess(targetCode, data)
      }, 500)
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to authentication server.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-panel p-8 rounded-3xl relative overflow-hidden shadow-2xl border border-white/10 glow-box-purple">
        {/* Decorative Top Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
            <Lock className="w-8 h-8 glow-text-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              Private Cipher Chat <Sparkles className="w-4 h-4 text-purple-400" />
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Restricted entry. Enter your 1-of-10 access code to decrypt room access.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Access Key Code
            </label>
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase())
                  if (error) setError(null)
                }}
                placeholder="e.g. CODE-ALPHA"
                className="w-full px-4 py-3.5 rounded-xl glass-input text-lg font-mono font-bold tracking-widest uppercase text-white placeholder:text-slate-600 placeholder:font-normal"
                disabled={loading}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="absolute right-2 top-2 bottom-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-lg shadow-purple-900/40"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Verify <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Quick Test Seeded Codes Helper */}
        <div className="mt-8 pt-6 border-t border-white/5 text-left">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-2.5">
            <Terminal className="w-3.5 h-3.5 text-purple-400" /> Sample Seeded Test Keys:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_CODES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setCode(sample)
                  handleSubmit(undefined, sample)
                }}
                className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/40 border border-white/10 text-[11px] font-mono text-slate-300 hover:text-purple-300 transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
