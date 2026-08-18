'use client'

import React, { useState } from 'react'
import { UserCheck, Send } from 'lucide-react'

interface VisitorNameModalProps {
  onSaveName: (name: string) => void
  onCancel: () => void
}

export default function VisitorNameModal({ onSaveName, onCancel }: VisitorNameModalProps) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSaveName(name.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
      <div className="w-full max-w-sm md-card p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#d3e3fd] text-[#1a73e8] flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1f1f1f] text-base">Your Name</h3>
            <p className="text-xs text-[#5f6368]">Let me know who is reaching out!</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex, Sam (High School)..."
            maxLength={30}
            required
            autoFocus
            className="w-full px-4 py-3 md-input"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onCancel} className="px-4 py-2 md-btn-text text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 md-btn-filled text-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              Continue & Send <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
