import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import coPlugin from '@imaginary-ai/vite-plugin-co'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    coPlugin({
      openaiApiKey: '',
      model: 'gpt-3.5-turbo',
    }),
  ],
})
