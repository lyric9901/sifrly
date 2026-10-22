'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dices, Sparkles, Shield, Lock, Cpu, ArrowRight } from 'lucide-react';
import { generateAnonymousHandle } from '@/lib/crypto';

interface IdentitySetupProps {
  onRegister: (chosenUsername: string) => Promise<boolean>;
  isLoading: boolean;
}

export const IdentitySetup: React.FC<IdentitySetupProps> = ({ onRegister, isLoading }) => {
  const [handleInput, setHandleInput] = useState('');

  const handleRandomize = () => {
    setHandleInput(generateAnonymousHandle());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidate = handleInput.trim() || generateAnonymousHandle();
    await onRegister(candidate);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Header Badge */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Initialize Cryptographic Identity
              </h2>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                State 0: No Local Keys
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Client-isolated Ed25519 Identity & X25519 Diffie-Hellman Keypair
            </p>
          </div>
        </div>

        {/* Security Invariants Box */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono">
              <Shield className="w-3.5 h-3.5" />
              <span>Zero-Knowledge</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
              Private keys are generated in RAM and written solely to browser IndexedDB.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono">
              <Cpu className="w-3.5 h-3.5" />
              <span>Blinded Mailbox</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
              Envelopes are delivered to SHA-256 tokens. The relay has zero metadata on who messages whom.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Atomic Hard Purge</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
              Upon decryption, ciphertext envelopes are instantly deleted from Supabase.
            </p>
          </div>
        </div>

        {/* Input & Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-xs font-mono text-zinc-300 flex items-center justify-between">
            <span>Choose Anonymous Handle</span>
            <span className="text-zinc-500 text-[11px]">Letters, numbers, and dashes only</span>
          </label>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="e.g. shadow_node_8c (or leave blank to randomize)"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 px-4 py-3 rounded-xl text-sm font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition shadow-inner"
              />
              <button
                type="button"
                onClick={handleRandomize}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 transition"
                title="Randomize Anonymous Handle"
              >
                <Dices className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-mono font-semibold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-zinc-950 shadow-[0_0_25px_rgba(16,185,129,0.25)] transition disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>Sealing Vault...</span>
                </>
              ) : (
                <>
                  <span>Create Anonymous Vault</span>
                  <ArrowRight className="w-4 h-4 text-zinc-950" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
