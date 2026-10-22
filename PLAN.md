# Sifrly Architecture & Implementation Plan

## Goal
Build Sifrly: an ephemeral, anonymous, zero-knowledge, End-to-End Encrypted (E2EE) messaging Progressive Web App (PWA) for sharing high-value credentials, secrets, and API keys.

## Architecture
- **Frontend / PWA**: Next.js 16 (App Router), React 19, TypeScript strict mode, Tailwind CSS v4, Framer Motion, Lucide icons, Canvas Confetti.
- **Crypto Engine (`src/lib/crypto.ts`)**:
  - Ed25519 for Identity keypair & public directory registration signature verification.
  - X25519 for Diffie-Hellman Key Exchange (ephemeral & static-ephemeral).
  - Web Crypto API: HKDF-SHA256 for key derivation, AES-GCM-256 with 96-bit random IVs and 128-bit authentication tags.
  - Blinded Mailbox tokens (`SHA-256("mailbox:" + recipientDhPublicKey)`) to prevent metadata leakage.
- **Client Key Vault (`src/lib/vault.ts`)**:
  - IndexedDB storage exclusively via `idb`. Zero keys in localStorage, sessionStorage, or cookies.
- **Relay & Ephemeral Queue (`src/lib/supabase.ts`)**:
  - Supabase client with non-crashing initialization.
  - Realtime subscription and polling fallback for mailbox queues.
  - Atomic hard purge: `DELETE FROM message_queue WHERE id = envelope_id` immediately upon client decryption.
- **PWA Manifest & Service Worker**:
  - `manifest.webmanifest`, meta tags, offline shell support, mobile viewport & standalone display configuration.
- **UI / UX**:
  - Dark-mode-first Zinc/Emerald aesthetic.
  - Clean Anonymous Handle generation or custom claim.
  - Monospaced Secret Inspector with 1-click copy, burn animation, confetti on secure transmission, QR code / link sharing.
  - Active E2EE security telemetry badge.

## Task Breakdown
- [x] Step 1: Install dependencies via Bun (`clsx`, `tailwind-merge`, `framer-motion`, `canvas-confetti`, `@types/canvas-confetti`, `@noble/curves`, `@noble/ciphers`, `idb`, `lucide-react`).
- [x] Step 2: Implement UI utils (`src/lib/utils.ts`), safe Supabase client with environment resilience (`src/lib/supabase.ts`), and secure IndexedDB vault (`src/lib/vault.ts`).
- [x] Step 3: Audit and strengthen cryptographic primitives (`src/lib/crypto.ts`) with Ed25519 signature verification and X25519 shared secrets.
- [x] Step 4: Configure PWA manifest (`src/app/manifest.ts`), icons, and responsive viewport in `src/app/layout.tsx`.
- [x] Step 5: Implement foundational UI components.
- [x] Step 6: Verify zero TypeScript errors, zero ESLint errors, and build success.
- [x] Step 7: Build `src/components/layout/Navbar.tsx` (brand, crypto status pulse, active handle pill, Rose-500 Nuke Vault panic button).
- [x] Step 8: Build `src/components/chat/IdentitySetup.tsx` (State 0 onboarding, instant client-side Ed25519/X25519 generation).
- [x] Step 9: Build `src/components/chat/SecretComposer.tsx` (recipient lookup, template chips: OpenAI, Anthropic, Private Key, Env Block, Password, optimistic UI).
- [x] Step 10: Build `src/components/chat/SecretMessageCard.tsx` (bullet obfuscation, 8s shoulder-surfing auto-remask, 60s dissolution progress bar, safe copy, regex classification chips).
- [x] Step 11: Connect complete responsive flow in `src/app/page.tsx` with realtime subscription, 2.5s polling fallback, and atomic hard purge.
- [x] Step 12: Verify strict typing (`bun x tsc --noEmit`), lint clean (`bun run lint`), and production build (`bun run build`).

## Wave 2: WhatsApp / Instagram DM Chat Layout
- [x] Step 13: Define Chat Types & conversation persistence in IndexedDB `sifrly_vault`.
- [x] Step 14: Build `src/components/chat/Sidebar.tsx` (User avatar, handle, search/new chat, conversation list with unread dots).
- [x] Step 15: Build `src/components/chat/MessageBubble.tsx` (Instagram electric blue pill for outgoing, `#262626` for incoming, timestamps, copy, obfuscation toggle).
- [x] Step 16: Build `src/components/chat/MessageInput.tsx` (Instagram-styled rounded pill bar, Enter-to-send, dynamic send button).
- [x] Step 17: Build `src/components/chat/ChatWindow.tsx` (Chat header with avatar, status, safety number trigger, scroll stream, mobile back button).
- [x] Step 18: Build `src/components/chat/SafetyNumberModal.tsx` (Cryptographic verification fingerprint).
- [x] Step 19: Refactor `src/app/page.tsx` for full split-view desktop and mobile single-viewport DM messenger UX.
- [x] Step 20: Complete verification (`bun x tsc --noEmit`, `bun run lint`, `bun run build`).
