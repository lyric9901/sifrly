'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Send,
  Lock,
  UserCheck,
  UserX,
  AlertCircle,
  Sparkles,
  FileKey,
  Braces,
  Terminal,
  FileText,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { deriveMailboxToken, encryptForwardSecretPayload } from '@/lib/crypto';

interface SecretComposerProps {
  initialRecipient?: string;
  onSecretDispatched: (recipient: string, optimisticPlaintext: string) => void;
}

const TEMPLATES = [
  {
    name: 'OpenAI Key',
    template: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  },
  {
    name: 'Anthropic Key',
    template: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  },
  {
    name: 'Private Key',
    template: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD...\n-----END PRIVATE KEY-----',
  },
  {
    name: 'Env Block',
    template: 'DATABASE_URL=postgres://user:password@host:5432/db\nAPI_SECRET=sec_live_9f812a88e\nREDIS_HOST=127.0.0.1:6379',
  },
  {
    name: 'Password',
    template: 's1fr!P@ss-982#xQz$vLm',
  },
];

export const SecretComposer: React.FC<SecretComposerProps> = ({
  initialRecipient = '',
  onSecretDispatched,
}) => {
  const [recipient, setRecipient] = useState(initialRecipient);
  const [prevInitial, setPrevInitial] = useState(initialRecipient);
  const [secretText, setSecretText] = useState('');
  const [isMasked, setIsMasked] = useState(false);
  const [isVerifyingRecipient, setIsVerifyingRecipient] = useState(false);
  const [recipientDhKey, setRecipientDhKey] = useState<string | null>(null);
  const [recipientStatus, setRecipientStatus] = useState<'idle' | 'found' | 'notFound'>('idle');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync prop changes without cascading re-renders
  if (initialRecipient !== prevInitial) {
    setPrevInitial(initialRecipient);
    setRecipient(initialRecipient);
  }

  // Debounced recipient directory lookup
  useEffect(() => {
    const cleanRecipient = recipient.trim().toLowerCase();
    const timer = setTimeout(async () => {
      if (!cleanRecipient) {
        setRecipientDhKey(null);
        setRecipientStatus('idle');
        return;
      }

      setIsVerifyingRecipient(true);
      try {
        const { data, error } = await supabase
          .from('identities')
          .select('dh_public_key')
          .eq('username', cleanRecipient)
          .single();

        if (error || !data?.dh_public_key) {
          setRecipientDhKey(null);
          setRecipientStatus('notFound');
        } else {
          setRecipientDhKey(data.dh_public_key);
          setRecipientStatus('found');
        }
      } catch {
        setRecipientDhKey(null);
        setRecipientStatus('notFound');
      } finally {
        setIsVerifyingRecipient(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [recipient]);

  // Format detection
  const formatBadge = useMemo(() => {
    const val = secretText.trim();
    if (!val) return null;

    if (val.startsWith('-----BEGIN')) {
      return { label: 'Private Key Detected', icon: FileKey, color: 'text-amber-400 bg-amber-950/40 border-amber-800/40' };
    }
    if (
      val.startsWith('sk-proj-') ||
      val.startsWith('sk-ant-') ||
      val.startsWith('ghp_') ||
      val.startsWith('AKIA') ||
      val.startsWith('ey')
    ) {
      return { label: 'API / Token Detected', icon: Key, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40' };
    }
    try {
      JSON.parse(val);
      return { label: 'JSON Payload Detected', icon: Braces, color: 'text-blue-400 bg-blue-950/40 border-blue-800/40' };
    } catch {
      // Not JSON
    }
    if (val.includes('=') && val.split('\n').every((l) => !l || l.startsWith('#') || l.includes('='))) {
      return { label: 'ENV Block Detected', icon: Terminal, color: 'text-purple-400 bg-purple-950/40 border-purple-800/40' };
    }
    return { label: 'Confidential Text', icon: FileText, color: 'text-zinc-400 bg-zinc-800/40 border-zinc-700/40' };
  }, [secretText]);

  const handleApplyTemplate = (tmpl: string) => {
    setSecretText(tmpl);
  };

  const handleSend = async () => {
    if (!secretText.trim()) return;
    if (!recipientDhKey) {
      setErrorMessage('Recipient public key not resolved. Verify the recipient handle.');
      return;
    }

    setErrorMessage(null);
    setIsSending(true);

    try {
      const plaintext = secretText;

      // 1. Encrypt with Forward Secrecy using fresh Ephemeral X25519 Keypair
      const encrypted = await encryptForwardSecretPayload(recipientDhKey, plaintext);

      // 2. Derive Blinded Mailbox Token
      const mailboxToken = await deriveMailboxToken(recipientDhKey);

      // 3. Post to Supabase Ephemeral Queue
      const { error } = await supabase.from('message_queue').insert({
        recipient_mailbox_token: mailboxToken,
        sender_ephemeral_key: encrypted.senderEphemeralKey,
        nonce: encrypted.nonce,
        ciphertext: encrypted.ciphertext,
        mac: encrypted.mac,
      });

      if (error) {
        throw new Error(`Delivery failed: ${error.message}`);
      }

      // 4. Confetti micro-interaction
      try {
        confetti({
          particleCount: 45,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#10b981', '#34d399', '#059669'],
        });
      } catch {
        // Non-fatal
      }

      // 5. Memory wipe and optimistic UI dispatch
      setSecretText('');
      onSecretDispatched(recipient, plaintext);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Encryption and transmission error';
      setErrorMessage(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 backdrop-blur-xl flex flex-col gap-4 shadow-xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase font-mono">
            Secret Dispatcher
          </h3>
        </div>

        {formatBadge && (
          <div
            className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${formatBadge.color}`}
          >
            <formatBadge.icon className="w-3 h-3" />
            <span>{formatBadge.label}</span>
          </div>
        )}
      </div>

      {/* Recipient Handle Input with Live Lookup */}
      <div>
        <label className="block text-xs font-mono text-zinc-400 mb-1.5">
          Recipient Directory Handle
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Search handle (e.g. shadow_node_8c)"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 px-3.5 py-2.5 rounded-xl text-sm font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-mono">
            {isVerifyingRecipient ? (
              <span className="text-zinc-500 animate-pulse text-[11px]">Querying...</span>
            ) : recipientStatus === 'found' ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                <UserCheck className="w-3.5 h-3.5" /> Key Verified
              </span>
            ) : recipientStatus === 'notFound' ? (
              <span className="inline-flex items-center gap-1 text-amber-400 text-[11px]">
                <UserX className="w-3.5 h-3.5" /> Unregistered
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Template Chips */}
      <div>
        <span className="block text-[11px] font-mono text-zinc-500 mb-1.5">
          Pre-fill Syntax Template:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.name}
              type="button"
              onClick={() => handleApplyTemplate(tmpl.template)}
              className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 border border-zinc-800 hover:border-emerald-500/40 transition"
            >
              {tmpl.name}
            </button>
          ))}
        </div>
      </div>

      {/* Secret Textarea with Mask / Peek Toggle */}
      <div className="relative">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-mono text-zinc-400">
            Payload Plaintext
          </label>
          <button
            type="button"
            onClick={() => setIsMasked(!isMasked)}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200"
          >
            {isMasked ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3 text-zinc-500" />}
            <span>{isMasked ? 'Reveal Plaintext' : 'Obfuscate Input'}</span>
          </button>
        </div>

        <textarea
          rows={5}
          placeholder="Paste API credentials, tokens, or confidential keys..."
          value={secretText}
          onChange={(e) => setSecretText(e.target.value)}
          className={`w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 p-3.5 rounded-xl text-xs sm:text-sm font-mono placeholder:text-zinc-600 outline-none transition resize-y leading-relaxed ${
            isMasked ? 'text-zinc-600 select-none' : 'text-emerald-300'
          }`}
          style={isMasked ? { WebkitTextSecurity: 'disc' } as React.CSSProperties : {}}
        />
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Footer Dispatch */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>X25519 Ephemeral Key &bull; Zero Server Log</span>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={isSending || !secretText.trim() || !recipientDhKey}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-mono font-semibold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSending ? (
            <>
              <Lock className="w-4 h-4 animate-spin text-zinc-950" />
              <span>Sealing & Dispatching...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-zinc-950" />
              <span>Encrypt & Dispatch</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};
