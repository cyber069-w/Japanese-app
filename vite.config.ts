/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { buildPrivatePack } from './scripts/pack-lib.mjs';
import { fontGlobs } from './scripts/font-subsets.mjs';

/**
 * `virtual:private-pack` = the copyrighted course content from private/.
 * It is only bundled for the local dev server (or with VITE_BUNDLE_PRIVATE=1),
 * never in the normal production build that gets deployed.
 */
function privatePack(): Plugin {
  let include = false;
  let root = process.cwd();
  return {
    name: 'private-pack',
    configResolved(c) {
      root = c.root;
      include = (c.command === 'serve' && c.mode !== 'test') || process.env.VITE_BUNDLE_PRIVATE === '1';
    },
    resolveId(id) {
      if (id === 'virtual:private-pack') return '\0virtual:private-pack';
    },
    load(id) {
      if (id !== '\0virtual:private-pack') return;
      const pack = include ? buildPrivatePack(root) : null;
      return `export default ${JSON.stringify(pack)};`;
    },
  };
}

export default defineConfig({
  // relative base so the build works on GitHub Pages (username.github.io/repo/) and anywhere else
  base: './',
  plugins: [
    react(),
    privatePack(),
    VitePWA({
      registerType: 'autoUpdate',
      // icons are already matched by globPatterns below
      includeManifestIcons: false,
      manifest: {
        name: 'Nihongo – Japanese study',
        short_name: 'Nihongo',
        description: 'Kana, vocab, kanji, grammar, numbers, listening and speaking for Minna no Nihongo – offline, no ads.',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f6f1e7',
        theme_color: '#f6f1e7',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // the app itself + the font files its built-in text needs (≈ 2.5 MB), so it renders fully offline
        globPatterns: ['**/*.{js,css,html,svg,png,json}', ...fontGlobs(process.cwd())],
        globIgnores: ['**/pack.enc'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Japanese fonts are split into many small files – cache the ones actually used
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  build: {
    // one app chunk with all study data is intended – it is precached for offline use anyway
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
