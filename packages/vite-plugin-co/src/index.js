import { start } from '@co-ai/core'
import defu from 'defu'

/**
 * @type {import('vite').Plugin}
 * @param {import('vite').UserConfig & {
 *  openaiApiKey: string
 *  model: string
 *  include: string
 *  ignore: string[]
 * }} options
 */
export default async (options) => {
  const _options = defu(options, {
    apiKey: '',
    model: 'gpt-3.5-turbo',
    include: './**/*',
    ignore: ['**/node_modules/**', '**/.vscode', '**/.git/**'],
  })

  if (!_options.apiKey) {
    throw new Error('openaiApiKey is required')
  }

  const loadPromise = start(_options)

  return {
    name: 'co',
    async buildStart() {
      await loadPromise
    },
  }
}
