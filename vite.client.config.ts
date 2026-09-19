import { defineConfig } from 'vite'
import { resolve } from 'path'

// Client bundle for the /edit/{slug} shell — plain ES module, no library
// packaging (the worldnotes npm-library era ended with the server pivot).
export default defineConfig({
  build: {
    outDir: resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/client/main.ts'),
      formats: ['es'],
      fileName: () => 'client.js',
    },
  },
})
