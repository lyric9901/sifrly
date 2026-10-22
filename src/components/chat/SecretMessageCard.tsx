'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Flame,
  Clock,
  KeyRound,
  FileKey,
  Braces,
  Terminal,
  FileText,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export interface DecryptedSecret {
  id: string;
  sender: string;
  plaintext: string;
  timestamp: string;
  purgedFromRelay: boolean;
  ttlSeconds?: number;
}

interface SecretMessageCardProps {
  secret: DecryptedSecret;
  onBurn: (id: string) => void;
}

export const SecretMessageCard: React.FC<SecretMessageCardProps> = ({ secret, onBurn }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [remaskCountdown, setRemaskCountdown] = useState<number | null>(null);

  // 60-second read-timer progress for Ephemeral Self-Destruct
  const initialTTL = secret.ttlSeconds || 60;
  const [timeLeft, setTimeLeft] = useState(initialTTL);
  const [isBurningOut, setIsBurningOut] = useState(false);

  // References for intervals/timeouts
  const remaskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remaskCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Self-destruct timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsBurningOut(true);
          setTimeout(() => {
            onBurn(secret.id);
          }, 400);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secret.id, onBurn]);

  const handleToggleReveal = () => {
    setIsRevealed((prev) => {
      const next = !prev;
      setRemaskCountdown(next ? 8 : null);
      return next;
    });
  };

  // Shoulder-surfing defense: 8-second auto-remask after peek
  useEffect(() => {
    if (!isRevealed) {
      if (remaskTimerRef.current) clearTimeout(remaskTimerRef.current);
      if (remaskCountdownIntervalRef.current) clearInterval(remaskCountdownIntervalRef.current);
      return;
    }

    remaskCountdownIntervalRef.current = setInterval(() => {
      setRemaskCountdown((c) => {
        if (c === null || c <= 1) {
          return null;
        }
        return c - 1;
      });
    }, 1000);

    remaskTimerRef.current = setTimeout(() => {
      setIsRevealed(false);
      setRemaskCountdown(null);
    }, 8000);

    return () => {
      if (remaskTimerRef.current) clearTimeout(remaskTimerRef.current);
      if (remaskCountdownIntervalRef.current) clearInterval(remaskCountdownIntervalRef.current);
    };
  }, [isRevealed]);

  // Format classification chip based on non-persistent regex inspection
  const classification = useMemo(() => {
    const val = secret.plaintext.trim();
    if (!val) return { label: 'Secret Payload', icon: FileText, color: 'text-zinc-400 border-zinc-700/60' };

    if (val.startsWith('-----BEGIN')) {
      return { label: 'Private Key Detected', icon: FileKey, color: 'text-amber-400 border-amber-800/60' };
    }
    if (/^sk-proj-[A-Za-z0-9_-]{20,}/.test(val)) {
      return { label: 'OpenAI Secret Key', icon: KeyRound, color: 'text-emerald-400 border-emerald-800/60' };
    }
    if (/^sk-ant-api03-[A-Za-z0-9_-]{20,}/.test(val)) {
      return { label: 'Anthropic Secret Key', icon: KeyRound, color: 'text-emerald-400 border-emerald-800/60' };
    }
    if (/^(ey[A-Za-z0-9_-]+\.){2}[A-Za-z0-9_-]+/.test(val)) {
      return { label: 'JWT Token Detected', icon: ShieldCheck, color: 'text-cyan-400 border-cyan-800/60' };
    }
    if (/^(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/.test(val)) {
      return { label: 'GitHub Personal Token', icon: KeyRound, color: 'text-emerald-400 border-emerald-800/60' };
    }
    if (/AKIA[0-9A-Z]{16}/.test(val)) {
      return { label: 'AWS Access Key ID', icon: KeyRound, color: 'text-orange-400 border-orange-800/60' };
    }
    try {
      JSON.parse(val);
      return { label: 'JSON Configuration', icon: Braces, color: 'text-blue-400 border-blue-800/60' };
    } catch {
      // not JSON
    }
    if (val.includes('=') && val.split('\n').some((l) => l.includes('='))) {
      return { label: 'Environment Block', icon: Terminal, color: 'text-purple-400 border-purple-800/60' };
    }

    return { label: 'Confidential Secret', icon: FileText, color: 'text-zinc-400 border-zinc-700/60' };
  }, [secret.plaintext]);

  // Masked bullet pattern representation
  const maskedText = useMemo(() => {
    const val = secret.plaintext;
    if (val.startsWith('-----BEGIN')) {
      const lines = val.split('\n');
      const header = lines[0] || '-----BEGIN CERTIFICATE-----';
      const footer = lines[lines.length - 1] || '-----END CERTIFICATE-----';
      return `${header}\n••••••••••••••••••••••••••••••••••••••••\n••••••••••••••••••••••••••••••••••••••••\n${footer}`;
    }

    // For single line keys like sk-proj-12345
    if (val.length > 12) {
      const head = val.slice(0, 8);
      const tail = val.slice(-4);
      return `${head}••••••••••••••••••••${tail}`;
    }

    return val.replace(/./g, '•');
  }, [secret.plaintext]);

  const handleCopy = () => {
    navigator.clipboard.writeText(secret.plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ttlPercent = Math.max(0, (timeLeft / initialTTL) * 100);

  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{
          opacity: isBurningOut ? 0 : 1,
          scale: isBurningOut ? 0.92 : 1,
          filter: isBurningOut ? 'blur(8px)' : 'none',
        }}
        exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5 backdrop-blur-xl flex flex-col gap-3 relative shadow-xl overflow-hidden group"
      >
        {/* Reactive Ephemeral Self-Destruct Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-950">
          <div
            className={`h-full transition-all duration-1000 ${
              timeLeft < 15
                ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
                : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
            }`}
            style={{ width: `${ttlPercent}%` }}
          />
        </div>

        {/* Card Header & Metadata */}
        <div className="flex items-center justify-between gap-2 pt-1 border-b border-zinc-800/80 pb-2.5 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-200 font-semibold">{secret.sender}</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-500 text-[11px]">{secret.timestamp}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Format chip */}
            <span
              className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-950 border ${classification.color}`}
            >
              <classification.icon className="w-3 h-3" />
              <span>{classification.label}</span>
            </span>

            {/* Purge status badge */}
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-900/60">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Purged from DB
            </span>
          </div>
        </div>

        {/* Terminal Box Payload */}
        <div className="relative rounded-xl bg-black/80 border border-zinc-800/90 p-4 font-mono text-xs overflow-x-auto shadow-inner">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-2 border-b border-zinc-800/50 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Terminal Payload</span>
              {remaskCountdown !== null && (
                <span className="text-amber-400 text-[10px] animate-pulse">
                  (Auto-masking in {remaskCountdown}s)
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-zinc-500">
              <Clock className="w-3 h-3 text-zinc-400" />
              <span>Burn in {timeLeft}s</span>
            </div>
          </div>

          <pre
            className={`whitespace-pre-wrap break-all transition-all duration-200 leading-relaxed ${
              isRevealed ? 'text-emerald-300 font-semibold select-all' : 'text-zinc-500 select-none'
            }`}
          >
            {isRevealed ? secret.plaintext : maskedText}
          </pre>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            {/* Reveal / Mask Peek Toggle */}
            <button
              type="button"
              onClick={handleToggleReveal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-zinc-300 hover:text-white bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition"
            >
              {isRevealed ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Mask</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Peek Secret</span>
                </>
              )}
            </button>

            {/* Safe Copy */}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-zinc-300 hover:text-white bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition"
              title="Copy secret to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Safe Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Burn Now action with Crimson accent */}
          <button
            type="button"
            onClick={() => onBurn(secret.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/50 hover:border-rose-500/60 transition"
            title="Immediately purge from volatile client memory"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Burn Now</span>
          </button>
        </div>

        {/* Copy toast guardrail banner */}
        {copied && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2.5 py-1 rounded-lg">
            <AlertCircle className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Secret copied to clipboard &bull; Clear clipboard after pasting</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
