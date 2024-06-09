import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import coPlugin from '@co/vite-plugin-co'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    coPlugin({
      model: 'gpt-3.5-turbo',
      apiKey: '',
    }),
  ],
})
