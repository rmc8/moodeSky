import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
    plugins: [sveltekit(), tailwindcss()],
    
    resolve: {
        alias: {
            '$paraglide': '/src/paraglide'
        }
    },

    // Environment variables for logging
    define: {
        __LOG_LEVEL__: JSON.stringify(process.env.VITE_LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'WARN' : 'DEBUG'))
    },


    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                  protocol: "ws",
                  host,
                  port: 1421,
              }
            : undefined,
        watch: {
            // 3. tell Vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
        },
    },
}));
