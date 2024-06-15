import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import coPlugin from '@co-ai/vite-plugin-co'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    coPlugin({
      apiKey: 'YOUR_API_KEY',
    }),
  ],
})
