import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/* UNICO=1 gera um bundle só, usado pelo script de arquivo único. */
const arquivoUnico = process.env.UNICO === '1'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    rollupOptions: {
      output: arquivoUnico ? { codeSplitting: false } : {
        /* Separa as bibliotecas do código do site para melhorar o cache */
        codeSplitting: {
          groups: [
            { name: 'motion', test: /node_modules[\\/]+(framer-motion|motion-dom|motion-utils)/ },
            { name: 'vendor', test: /node_modules[\\/]+(react|react-dom|scheduler|zustand|use-sync-external-store)[\\/]/ },
          ],
        },
      },
    },
  },
})
