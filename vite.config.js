import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
    base: './',
    build: {
        target: 'es2022',
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(process.cwd(), 'index.html'),
                experience: resolve(process.cwd(), 'experience.html')
            }
        }
    }
});
