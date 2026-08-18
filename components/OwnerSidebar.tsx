'use client'

import React, { useState } from 'react'
import { ConversationSummary } from '@/lib/mock-store'
import { Search, Users, Inbox } from 'lucide-react'

interface OwnerSidebarProps {
  conversations: ConversationSummary[]
  selectedVisitor: string | 'ALL'
  onSelectVisitor: (name: string | 'ALL') => void
  totalMessagesCount: number
}

export default function OwnerSidebar({
  conversations,
  selectedVisitor,
  onSelectVisitor,
  totalMessagesCount
}: OwnerSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredConversations = conversations.filter((c) =>
    c.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      const now = new Date()
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <aside className="w-full md:w-72 md-card-flat p-4 flex flex-col gap-3 shrink-0 h-full overflow-hidden">
      {/* Title */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2 text-[#3c4043] font-semibold text-sm">
          <Users className="w-4 h-4 text-[#1a73e8]" />
          Conversations
        </div>
        <span className="md-chip-primary md-chip text-[10px]">{conversations.length}</span>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search people..."
          className="w-full px-3.5 py-2 pl-9 md-input text-xs"
        />
        <Search className="absolute left-3 top-[9px] w-3.5 h-3.5 text-[#9aa0a6]" />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
        {/* All Messages */}
        <button
          onClick={() => onSelectVisitor('ALL')}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
            selectedVisitor === 'ALL'
              ? 'bg-[#d3e3fd] text-[#1a73e8] font-semibold'
              : 'hover:bg-[#f1f4f8] text-[#3c4043]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              selectedVisitor === 'ALL' ? 'bg-[#1a73e8] text-white' : 'bg-[#e8eaed] text-[#5f6368]'
            }`}>
              <Inbox className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="font-medium">All Messages</p>
              <p className="text-[10px] text-[#9aa0a6]">Combined feed</p>
            </div>
          </div>
          <span className="md-chip text-[10px]">{totalMessagesCount}</span>
        </button>

        <div className="h-px bg-[#e8eaed] my-2 mx-1" />

        {/* Visitor Threads */}
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#9aa0a6]">No conversations yet</div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedVisitor === conv.visitorName
            return (
              <button
                key={conv.visitorName}
                onClick={() => onSelectVisitor(conv.visitorName)}
                className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-xs transition-all ${
                  isSelected
                    ? 'bg-[#d3e3fd] text-[#1a73e8] font-semibold'
                    : 'hover:bg-[#f1f4f8] text-[#3c4043]'
                }`}
              >
                <img
                  src={conv.avatarUrl}
                  alt={conv.visitorName}
                  className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-[#e8eaed]"
                />
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`font-medium truncate ${isSelected ? 'text-[#1a73e8]' : 'text-[#1f1f1f]'}`}>
                      {conv.visitorName}
                    </span>
                    <span className="text-[10px] text-[#9aa0a6] shrink-0">{formatTime(conv.lastTimestamp)}</span>
                  </div>
                  <p className="text-[11px] text-[#5f6368] truncate mt-0.5">{conv.lastMessage}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}
