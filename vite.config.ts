import { defineConfig } from 'vite';
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        // TanStack Router plugin must come before React plugin
        tanstackRouter({
            target: 'react',
            autoCodeSplitting: true,
        }),
        react(),
        tailwindcss()
    ],
    server: {
        port: 8080,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
