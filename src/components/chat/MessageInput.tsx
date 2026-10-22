'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Lock, Smile, Sparkles } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (text: string) => Promise<void>;
  disabled?: boolean;
  recipientHandle: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  recipientHandle,
}) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus input when recipient changes
  useEffect(() => {
    textareaRef.current?.focus();
  }, [recipientHandle]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || disabled) return;

    setIsSending(true);
    try {
      setText('');
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      await onSendMessage(trimmed);
    } finally {
      setIsSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-grow height up to 120px
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const hasText = text.trim().length > 0;

  return (
    <div className="p-3 sm:p-4 bg-black border-t border-[#262626]">
      <div className="max-w-4xl mx-auto flex items-end gap-2.5 bg-[#121212] border border-zinc-800 focus-within:border-zinc-700 rounded-3xl px-4 py-2 transition shadow-lg">
        {/* Lock indicator */}
        <div className="pb-1 text-emerald-400/80" title="E2EE Active">
          <Lock className="w-4 h-4" />
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={`Message ${recipientHandle}...`}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSending}
          className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-100 placeholder:text-zinc-600 resize-none font-sans leading-relaxed py-1 max-h-28 overflow-y-auto"
        />

        {/* Send Button */}
        {hasText ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || disabled}
            className="w-8 h-8 rounded-full bg-[#3797f0] hover:bg-blue-500 text-white flex items-center justify-center shrink-0 transition disabled:opacity-40 shadow-[0_0_12px_rgba(55,151,240,0.4)]"
            title="Send Message"
          >
            {isSending ? (
              <Sparkles className="w-4 h-4 animate-spin text-white" />
            ) : (
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        ) : (
          <div className="pb-1 text-zinc-600">
            <Smile className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
};
