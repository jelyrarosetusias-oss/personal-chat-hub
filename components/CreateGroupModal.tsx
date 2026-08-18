'use client'

import React, { useState } from 'react'
import { UserProfile, Conversation } from '@/lib/types'
import { X, Users, RefreshCw, Search, Plus, Check } from 'lucide-react'

interface CreateGroupModalProps {
  currentUser: UserProfile
  onGroupCreated: (group: Conversation) => void
  onClose: () => void
}

export default function CreateGroupModal({ currentUser, onGroupCreated, onClose }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('')
  const [avatarSeed, setAvatarSeed] = useState(() => `group-${Date.now()}`)
  const [searchMemberId, setSearchMemberId] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const groupAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${avatarSeed}`

  const handleRollAvatar = () => {
    setAvatarSeed(`group-${Date.now()}-${Math.floor(Math.random() * 1000)}`)
  }

  const handleSearchMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchMemberId.trim()) return
    setSearching(true)
    setSearchError(null)

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchMemberId.trim())}`)
      const data = await res.json()

      if (res.ok && data.users && data.users.length > 0) {
        const found = data.users[0]
        if (found.id === currentUser.id) {
          setSearchError('You are already included in the group')
        } else if (selectedMembers.some((m) => m.id === found.id)) {
          setSearchError('Member already added')
        } else {
          setSelectedMembers([...selectedMembers, found])
          setSearchMemberId('')
        }
      } else {
        setSearchError('No user found with this Short ID or username')
      }
    } catch (err: any) {
      setSearchError(err.message || 'Search error')
    } finally {
      setSearching(false)
    }
  }

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter((m) => m.id !== userId))
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim(),
          avatar_url: groupAvatar,
          member_ids: selectedMembers.map((m) => m.id)
        })
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create group')
        setLoading(false)
        return
      }

      onGroupCreated(data.conversation)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Network error')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-[#e8eaed] space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-[#1f1f1f]">Create Group Chat</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#f1f4f8] text-[#5f6368] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#fce8e6] text-[#d93025] text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateGroup} className="space-y-4">
          {/* Avatar & Name */}
          <div className="flex items-center gap-3 p-3 bg-[#f8fafb] rounded-2xl border border-[#e8eaed]">
            <img
              src={groupAvatar}
              alt="Group Avatar"
              className="w-12 h-12 rounded-full bg-white object-cover ring-2 ring-[#1a73e8]/30 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <input
                type="text"
                placeholder="Group Name (e.g. Project Team)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] outline-none text-xs font-semibold text-[#1f1f1f] bg-white"
              />
            </div>
            <button
              type="button"
              onClick={handleRollAvatar}
              className="p-2 rounded-xl bg-white border border-[#dadce0] hover:bg-[#f1f4f8] text-[#1a73e8] text-xs font-medium transition-colors"
              title="Roll new icon"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Members by Short ID */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1f1f1f]">Add Members by Short ID</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1.5 px-3 py-1.5 bg-[#f1f4f8] rounded-xl border border-[#dadce0] focus-within:border-[#1a73e8] focus-within:bg-white transition-all">
                <span className="font-mono font-bold text-[#1a73e8] text-xs">#</span>
                <input
                  type="text"
                  placeholder="Friend's Short ID (e.g. A7K2M9)"
                  value={searchMemberId}
                  onChange={(e) => setSearchMemberId(e.target.value.toUpperCase())}
                  className="w-full bg-transparent font-mono uppercase tracking-wider font-bold text-xs text-[#1f1f1f] outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleSearchMember}
                disabled={searching || !searchMemberId.trim()}
                className="px-3 py-2 rounded-xl bg-[#f1f4f8] hover:bg-[#e8eaed] text-[#1a73e8] text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {searchError && (
              <p className="text-[11px] text-[#d93025]">{searchError}</p>
            )}
          </div>

          {/* Added Members List */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-[#5f6368]">
              Members ({selectedMembers.length + 1})
            </p>
            <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-2xl bg-[#f8fafb] border border-[#e8eaed]">
              {/* Current user (Creator) */}
              <div className="flex items-center justify-between p-1.5 rounded-xl bg-white text-xs">
                <div className="flex items-center gap-2 truncate">
                  <img src={currentUser.avatar_url} alt="" className="w-6 h-6 rounded-full bg-[#f1f4f8]" />
                  <span className="font-semibold text-[#1f1f1f] truncate">{currentUser.display_name} (You)</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#e8f0fe] text-[#1a73e8]">Admin</span>
              </div>

              {selectedMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-1.5 rounded-xl bg-white text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <img src={member.avatar_url} alt="" className="w-6 h-6 rounded-full bg-[#f1f4f8]" />
                    <span className="font-medium text-[#1f1f1f] truncate">{member.display_name}</span>
                    <span className="font-mono text-[10px] text-[#5f6368]">#{member.short_id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-1 text-[#d93025] hover:bg-[#fce8e6] rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5f6368] hover:bg-[#f1f4f8] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !groupName.trim()}
              className="px-5 py-2 text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
