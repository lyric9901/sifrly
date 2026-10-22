'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ShieldCheck,
  Flame,
  KeyRound,
  Lock,
} from 'lucide-react';
import { ChatMessage } from '@/lib/types';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { SafetyNumberModal } from './SafetyNumberModal';

interface ChatWindowProps {
  currentUsername: string;
  currentDhKey: string;
  contactHandle: string;
  contactDhKey: string;
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onBurnMessage: (id: string) => void;
  onClearThread: () => void;
  onBackToContacts: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  currentUsername,
  currentDhKey,
  contactHandle,
  contactDhKey,
  messages,
  onSendMessage,
  onBurnMessage,
  onClearThread,
  onBackToContacts,
}) => {
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full bg-black relative overflow-hidden">
      {/* Top Chat Header */}
      <div className="h-16 px-4 border-b border-[#262626] flex items-center justify-between bg-[#0a0a0a] z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            type="button"
            onClick={onBackToContacts}
            className="md:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white transition"
            title="Back to contacts"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Contact Avatar */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center text-white font-bold text-sm border border-zinc-700 shadow-md">
              {contactHandle.slice(0, 2).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black" />
          </div>

          {/* Contact Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-zinc-100 truncate">
                {contactHandle}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Online via Relay</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Safety Number Button */}
          <button
            type="button"
            onClick={() => setShowSafetyModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-400 hover:text-emerald-400 bg-[#161616] hover:bg-[#202020] border border-[#262626] transition"
            title="Verify E2EE Safety Number"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Safety Number</span>
          </button>

          {/* Clear Thread */}
          <button
            type="button"
            onClick={onClearThread}
            className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
            title="Clear conversation from memory"
          >
            <Flame className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-start">
        {messages.length === 0 ? (
          <div className="m-auto text-center flex flex-col items-center justify-center text-zinc-500 p-8">
            <div className="w-16 h-16 rounded-full bg-[#121212] border border-[#262626] flex items-center justify-center mb-3 text-emerald-400">
              <Lock className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-zinc-300 mb-1">End-to-End Encrypted</p>
            <p className="text-xs text-zinc-500 font-mono max-w-sm leading-relaxed">
              Messages and calls are secured with X25519 & AES-GCM-256. Not even Sifrly relay can read them. Decrypted messages vanish upon read.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onBurn={onBurnMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input Bar */}
      <MessageInput
        onSendMessage={onSendMessage}
        recipientHandle={contactHandle}
      />

      {/* Safety Number Modal */}
      <SafetyNumberModal
        isOpen={showSafetyModal}
        onClose={() => setShowSafetyModal(false)}
        myHandle={currentUsername}
        myDhKey={currentDhKey}
        contactHandle={contactHandle}
        contactDhKey={contactDhKey}
      />
    </div>
  );
};
