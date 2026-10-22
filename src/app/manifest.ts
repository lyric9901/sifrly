import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sifrly — Ephemeral E2EE Secret Vault',
    short_name: 'Sifrly',
    description: 'Ephemeral, zero-knowledge, End-to-End Encrypted secret and API credential relay.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
