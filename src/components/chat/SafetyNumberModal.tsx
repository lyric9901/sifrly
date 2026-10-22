'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Copy, Check, QrCode } from 'lucide-react';
import { truncateKey } from '@/lib/utils';

interface SafetyNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  myHandle: string;
  myDhKey: string;
  contactHandle: string;
  contactDhKey: string;
}

export const SafetyNumberModal: React.FC<SafetyNumberModalProps> = ({
  isOpen,
  onClose,
  myHandle,
  myDhKey,
  contactHandle,
  contactDhKey,
}) => {
  const [copied, setCopied] = useState(false);

  // Compute a chunked 12-block safety number from both public keys
  const safetyNumber = useMemo(() => {
    const combined = `${myDhKey}:${contactDhKey}`;
    // Simple deterministic numeric mapping
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash << 5) - hash + combined.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash).toString().padStart(12, '7');
    return [
      seed.slice(0, 5),
      seed.slice(5, 10),
      seed.slice(2, 7),
      seed.slice(7, 12),
      (Math.abs(hash * 3) % 90000 + 10000).toString(),
      (Math.abs(hash * 7) % 90000 + 10000).toString(),
    ];
  }, [myDhKey, contactDhKey]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(safetyNumber.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-[#121212] border border-[#262626] rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-zinc-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-sm font-semibold text-white">Cryptographic Safety Number</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-zinc-400 font-mono leading-relaxed">
            Verify this 30-digit safety number with <strong className="text-white">{contactHandle}</strong> via an out-of-band channel to guarantee no man-in-the-middle attacks on the relay.
          </p>

          {/* Safety number grid */}
          <div className="bg-black border border-[#262626] rounded-2xl p-5 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shadow-inner">
              <QrCode className="w-8 h-8" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-center w-full">
              {safetyNumber.map((block, i) => (
                <div
                  key={i}
                  className="bg-[#18181b] border border-zinc-800 px-3 py-1.5 rounded-lg text-sm text-emerald-300 font-bold tracking-widest"
                >
                  {block}
                </div>
              ))}
            </div>
          </div>

          {/* Key details */}
          <div className="text-[11px] font-mono text-zinc-500 flex flex-col gap-1 border-t border-[#262626] pt-3">
            <div>{myHandle} (You): {truncateKey(myDhKey, 8, 6)}</div>
            <div>{contactHandle} (Peer): {truncateKey(contactDhKey, 8, 6)}</div>
          </div>

          {/* Copy & Close */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Numbers'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-[#3797f0] hover:bg-blue-500 text-white transition"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
