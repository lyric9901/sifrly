'use client';

import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Flame, Cpu, Copy, Check, AlertTriangle } from 'lucide-react';

interface NavbarProps {
  registeredUser: string | null;
  dhPublicKey: string | null;
  isConfigured: boolean;
  onNukeVault: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  registeredUser,
  dhPublicKey,
  onNukeVault,
}) => {
  const [showConfirmNuke, setShowConfirmNuke] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    if (!registeredUser || typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}?to=${encodeURIComponent(registeredUser)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExecuteNuke = () => {
    setShowConfirmNuke(false);
    onNukeVault();
  };

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Cryptographic Status Badge */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.12)]">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-white text-base">Sifrly</span>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                E2EE Active
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono hidden sm:block">
              Zero-Knowledge Ephemeral Relay
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Crypto specs badge */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-2.5 py-1 rounded-full">
            <Cpu className="w-3 h-3 text-emerald-400" />
            <span>Curve25519 + AES-GCM</span>
          </div>

          {/* User state and Panic Button */}
          {registeredUser && (
            <div className="flex items-center gap-2">
              {/* Active handle pill with share link copy */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 hover:border-emerald-500/50 px-3 py-1 rounded-lg text-xs font-mono text-zinc-200 transition"
                title={dhPublicKey ? `Public Key: ${dhPublicKey} (Click to copy share link)` : 'Click to copy share link'}
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">{registeredUser}</span>
                {copiedLink ? (
                  <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
                ) : (
                  <Copy className="w-3 h-3 text-zinc-500 ml-0.5" />
                )}
              </button>

              {/* Panic Nuke Button */}
              <button
                onClick={() => setShowConfirmNuke(true)}
                type="button"
                className="flex items-center gap-1.5 text-xs font-mono text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/50 hover:border-rose-500/60 px-2.5 py-1 rounded-lg transition"
                title="Panic Button: Wipe all IndexedDB keys and clear state"
              >
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline font-medium">Nuke Vault</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Panic Nuke */}
      {showConfirmNuke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-zinc-950 border border-rose-900/60 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-900/80 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">
                  Execute Panic Nuke?
                </h3>
                <p className="text-xs text-rose-400 font-mono">Irreversible cryptographic wipe</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-mono">
              This will completely obliterate your Ed25519 identity key, X25519 Diffie-Hellman private
              key, and all active messages from client IndexedDB and volatile RAM. Any unread
              secrets sent to your handle will become permanently undecryptable.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowConfirmNuke(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteNuke}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.35)] transition"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Wipe & Reset to State 0</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
