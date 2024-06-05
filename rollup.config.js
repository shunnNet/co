import { defineConfig } from 'rollup'
import plugin from './index.js'

export default defineConfig({
  input: './playground/entry.js',
  output: {
    file: './playground/dist/bundle.js',
    format: 'cjs',
  },
  plugins: [plugin()],
})
