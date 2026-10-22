# Sifrly Architecture Context

## Environment
- OS: Windows
- Runtime: Bun 1.3.14
- Framework: Next.js 16.4.2 (App Router, Turbopack, React 19)
- Styling: Tailwind CSS v4, dark mode first (Zinc/Emerald)

## Security Invariants
1. Zero LocalStorage/SessionStorage/Cookies for any secret or key. All identity and private DH keys live in IndexedDB `sifrly_vault`.
2. Plaintext exists strictly in ephemeral React state in memory.
3. Decrypted envelopes are purged from Supabase `message_queue` immediately with `delete().eq('id', envelope.id)`.
4. Uses audited primitives only: `@noble/curves/ed25519.js`, `@noble/curves/utils.js`, Web Crypto API (HKDF-SHA256, AES-GCM-256).
