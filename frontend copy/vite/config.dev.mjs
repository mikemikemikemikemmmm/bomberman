import { defineConfig } from 'vite';
import react from "@vitejs/plugin-react"
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
    base: './',
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        },
    },
    server: {
        port: 8080
    },plugins:[react(),
    tailwindcss(),]
});
