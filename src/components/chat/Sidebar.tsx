'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Plus,
  Flame,
  AlertCircle,
  UserPlus,
  Copy,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Conversation } from '@/lib/types';

interface SidebarProps {
  currentUsername: string;
  activeContact: string | null;
  conversations: Conversation[];
  onSelectContact: (contact: string, contactDhKey?: string) => void;
  onNukeVault: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUsername,
  activeContact,
  conversations,
  onSelectContact,
  onNukeVault,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showNukeConfirm, setShowNukeConfirm] = useState(false);

  const handleStartChatWithSearched = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = searchInput.trim().toLowerCase();
    if (!handle) return;
    if (handle === currentUsername.toLowerCase()) {
      setSearchError("Cannot start chat with your own handle.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const { data, error } = await supabase
        .from('identities')
        .select('dh_public_key')
        .eq('username', handle)
        .single();

      if (error || !data?.dh_public_key) {
        setSearchError(`User "${handle}" not registered on relay.`);
      } else {
        onSelectContact(handle, data.dh_public_key);
        setSearchInput('');
      }
    } catch {
      setSearchError('Error looking up handle.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyShareLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}?to=${encodeURIComponent(currentUsername)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredConversations = conversations.filter((c) =>
    c.contactHandle.toLowerCase().includes(searchInput.toLowerCase())
  );

  return (
    <aside className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-black border-r border-[#262626] select-none">
      {/* Top Bar: Profile Header */}
      <div className="p-4 border-b border-[#262626] flex items-center justify-between gap-3 bg-[#0a0a0a]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-zinc-800 flex items-center justify-center text-white font-bold text-sm border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              {currentUsername.slice(0, 2).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-zinc-100 truncate">
                {currentUsername}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[9px] uppercase font-mono tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <ShieldCheck className="w-2.5 h-2.5" />
                Sealed
              </span>
            </div>
            <button
              onClick={handleCopyShareLink}
              type="button"
              className="text-[11px] font-mono text-zinc-500 hover:text-emerald-400 flex items-center gap-1 transition"
              title="Copy your direct chat link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-zinc-500" />
                  <span>Share Handle</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNukeConfirm(true)}
            type="button"
            className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
            title="Panic Nuke: Obliterate all local keys"
          >
            <Flame className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search / Direct Chat Input */}
      <div className="p-3 border-b border-[#262626] bg-[#0c0c0c]">
        <form onSubmit={handleStartChatWithSearched} className="relative">
          <input
            type="text"
            placeholder="Search or message handle..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
              if (searchError) setSearchError(null);
            }}
            className="w-full bg-[#161616] border border-[#262626] focus:border-[#3797f0] pl-9 pr-8 py-2 rounded-xl text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />

          {searchInput.trim() && (
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#3797f0] hover:bg-zinc-800 transition"
              title="Start Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </form>

        {searchError && (
          <div className="mt-2 text-[11px] font-mono text-rose-400 flex items-center gap-1 px-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Conversations Stream */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#181818]">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-zinc-600">
            <div className="w-12 h-12 rounded-full bg-[#121212] border border-[#262626] flex items-center justify-center mb-3 text-zinc-500">
              <UserPlus className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-zinc-400 mb-1">No Active Threads</p>
            <p className="text-[11px] text-zinc-600 font-mono max-w-xs leading-relaxed">
              Type any registered handle in the search bar above to begin zero-knowledge E2EE messaging.
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = activeContact?.toLowerCase() === conv.contactHandle.toLowerCase();

            return (
              <button
                key={conv.contactHandle}
                type="button"
                onClick={() => onSelectContact(conv.contactHandle, conv.contactDhKey)}
                className={`w-full p-3.5 flex items-center gap-3 text-left transition ${
                  isActive
                    ? 'bg-[#1a1a1a] border-l-2 border-[#3797f0]'
                    : 'hover:bg-[#121212]'
                }`}
              >
                {/* Avatar with initial */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center text-zinc-200 font-bold text-sm border border-zinc-700">
                    {conv.contactHandle.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black" />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-sm truncate font-medium ${
                        isActive ? 'text-white font-semibold' : 'text-zinc-200'
                      }`}
                    >
                      {conv.contactHandle}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                      {conv.lastTimestamp || ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-zinc-500 truncate font-mono">
                      {conv.lastMessage || 'E2EE thread initialized'}
                    </p>

                    {conv.unreadCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-[#3797f0] shrink-0" />
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Confirmation Modal for Nuke */}
      {showNukeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-950 border border-rose-900/60 rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center gap-2.5 text-rose-400">
              <Flame className="w-5 h-5 text-rose-500" />
              <h3 className="text-sm font-semibold text-white">Nuke Cryptographic Vault?</h3>
            </div>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              This completely wipes all private keys and conversation history from your browser.
              Incoming unread secrets will become permanently undecryptable.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowNukeConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNukeConfirm(false);
                  onNukeVault();
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold text-white bg-rose-600 hover:bg-rose-500 transition"
              >
                Nuke Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
