// Build da mesa de treino offline num arquivo único (usado para o artefato de teste).
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // O motor do jogo usa node:crypto no servidor; no navegador usamos crypto.getRandomValues.
    alias: { 'node:crypto': fileURLToPath(new URL('./src/demo/cripto.js', import.meta.url)) },
  },
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000, // fontes embutidas no CSS
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: { input: fileURLToPath(new URL('./demo.html', import.meta.url)) },
  },
})
