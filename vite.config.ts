import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        // TanStack Router plugin must come before React plugin
        tanstackRouter({
            target: 'react',
            autoCodeSplitting: true,
        }),
        react(),
    ],
    server: {
        port: 8080,
    },
});
