import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // @c3-digital/shared est un paquet du monorepo (lien symbolique, pas
    // un vrai téléchargement npm), compilé en CommonJS pour rester
    // consommable par le backend (Node/NestJS, lui aussi en CommonJS).
    // Sans ceci, le serveur de dev de Vite sert dist/index.js tel quel
    // (CommonJS) à un `import` ESM natif du navigateur, qui échoue —
    // l'inclure ici force son passage par l'interop CommonJS -> ESM
    // d'esbuild, comme pour une dépendance npm normale.
    include: ['@c3-digital/shared'],
  },
})
