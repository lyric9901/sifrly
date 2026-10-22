'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Flame,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { ChatMessage } from '@/lib/types';

interface MessageBubbleProps {
  message: ChatMessage;
  onBurn?: (id: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onBurn }) => {
  const [copied, setCopied] = useState(false);
  const [isMasked, setIsMasked] = useState(() => {
    // Detect if message is a secret or token
    const text = message.text.trim();
    return (
      text.startsWith('sk-') ||
      text.startsWith('ghp_') ||
      text.startsWith('AKIA') ||
      text.startsWith('-----BEGIN') ||
      text.includes('Bearer ') ||
      (text.length > 28 && !text.includes(' '))
    );
  });
  const [remaskCountdown, setRemaskCountdown] = useState<number | null>(null);

  // Self destruct timer (e.g. 60 seconds if set)
  const initialTTL = message.ttlSeconds || 60;
  const [timeLeft, setTimeLeft] = useState(initialTTL);
  const [isBurningOut, setIsBurningOut] = useState(false);

  const remaskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remaskIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!onBurn) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsBurningOut(true);
          setTimeout(() => {
            onBurn(message.id);
          }, 400);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [message.id, onBurn]);

  // Shoulder-surfing auto re-mask after 8 seconds
  useEffect(() => {
    if (!isMasked && remaskCountdown !== null) {
      remaskIntervalRef.current = setInterval(() => {
        setRemaskCountdown((c) => {
          if (c === null || c <= 1) return null;
          return c - 1;
        });
      }, 1000);

      remaskTimerRef.current = setTimeout(() => {
        setIsMasked(true);
        setRemaskCountdown(null);
      }, 8000);
    } else {
      if (remaskTimerRef.current) clearTimeout(remaskTimerRef.current);
      if (remaskIntervalRef.current) clearInterval(remaskIntervalRef.current);
    }

    return () => {
      if (remaskTimerRef.current) clearTimeout(remaskTimerRef.current);
      if (remaskIntervalRef.current) clearInterval(remaskIntervalRef.current);
    };
  }, [isMasked, remaskCountdown]);

  const handleToggleMask = () => {
    setIsMasked((prev) => {
      const next = !prev;
      setRemaskCountdown(!next ? 8 : null);
      return next;
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskedDisplay = message.text.length > 12
    ? `${message.text.slice(0, 6)}••••••••••••••••${message.text.slice(-4)}`
    : message.text.replace(/./g, '•');

  const isOutgoing = message.isOutgoing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{
        opacity: isBurningOut ? 0 : 1,
        scale: isBurningOut ? 0.9 : 1,
        filter: isBurningOut ? 'blur(6px)' : 'none',
      }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} mb-3 group`}
    >
      <div className="flex items-center gap-1.5 max-w-[85%] sm:max-w-[75%]">
        {/* If outgoing, actions appear on left */}
        {isOutgoing && (
          <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 pr-1 text-zinc-500">
            <button
              onClick={handleCopy}
              className="p-1 hover:text-white rounded transition"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {onBurn && (
              <button
                onClick={() => onBurn(message.id)}
                className="p-1 hover:text-rose-400 rounded transition"
                title="Burn"
              >
                <Flame className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Chat Bubble */}
        <div
          className={`relative px-4 py-2.5 break-words text-sm shadow-md transition ${
            isOutgoing
              ? 'bg-[#3797f0] text-white rounded-3xl rounded-br-sm'
              : 'bg-[#262626] text-zinc-100 rounded-3xl rounded-bl-sm border border-zinc-700/40'
          }`}
        >
          {/* Obfuscation pill header if masked */}
          {remaskCountdown !== null && (
            <div className="flex items-center gap-1 text-[10px] font-mono opacity-80 mb-1">
              <span>Auto-masking in {remaskCountdown}s</span>
            </div>
          )}

          {/* Text content */}
          <div className="font-sans leading-relaxed whitespace-pre-wrap select-text">
            {isMasked ? (
              <span className="font-mono tracking-wider opacity-90">{maskedDisplay}</span>
            ) : (
              message.text
            )}
          </div>

          {/* Mask toggle button inside bubble for secrets */}
          {(message.text.startsWith('sk-') ||
            message.text.startsWith('ghp_') ||
            message.text.startsWith('-----BEGIN') ||
            message.text.length > 28) && (
            <div className="mt-1 flex items-center justify-end gap-2 pt-1 border-t border-white/10 text-[10px]">
              <button
                type="button"
                onClick={handleToggleMask}
                className="flex items-center gap-1 opacity-80 hover:opacity-100 transition"
              >
                {isMasked ? (
                  <>
                    <Eye className="w-3 h-3" />
                    <span>Reveal</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3" />
                    <span>Mask</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* If incoming, actions appear on right */}
        {!isOutgoing && (
          <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 pl-1 text-zinc-500">
            <button
              onClick={handleCopy}
              className="p-1 hover:text-white rounded transition"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {onBurn && (
              <button
                onClick={() => onBurn(message.id)}
                className="p-1 hover:text-rose-400 rounded transition"
                title="Burn now"
              >
                <Flame className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Timestamp & Ephemeral Countdown */}
      <div
        className={`flex items-center gap-2 mt-1 px-2 text-[10px] font-mono text-zinc-500 ${
          isOutgoing ? 'justify-end' : 'justify-start'
        }`}
      >
        <span>{message.timestamp}</span>
        {onBurn && (
          <span className="flex items-center gap-0.5 text-zinc-600">
            <Clock className="w-2.5 h-2.5" />
            <span>{timeLeft}s</span>
          </span>
        )}
        <span title="E2EE Encrypted">
          <ShieldCheck className="w-2.5 h-2.5 text-emerald-500/80" />
        </span>
      </div>
    </motion.div>
  );
};
