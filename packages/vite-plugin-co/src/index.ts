import { Co } from '@imaginary-ai/core'
import defu from 'defu'
import type { Plugin } from 'vite'

export type TCoPluginOptions = {
  /**
   * OpenAI API Key
   */
  apiKey: string

  /**
   * Model to use
   */
  model?: string

  /**
   * Model temperature
   */
  temperature?: number

  /**
   * Include files, glob pattern
   */
  include?: string

  /**
   * Ignore files, glob pattern
   */
  ignore?: string[]
}

export default function (options: TCoPluginOptions): Plugin<TCoPluginOptions> {
  const _options = defu(options, {
    apiKey: '',
    model: 'gpt-3.5-turbo',
    temperature: 0,
    include: './**/*',
    ignore: ['**/node_modules/**', '**/.vscode', '**/.git/**'],
  })

  if (!_options.apiKey) {
    throw new Error('apiKey is required')
  }

  const co = new Co({
    apiKey: _options.apiKey,
    temperature: _options.temperature,
    model: _options.model,
  })
  const ready = co.scan(_options.include, _options.ignore)
    .then(() => co.build())
    .then(() => co.watch(_options.include, _options.ignore))

  return {
    name: 'co',
    async buildStart() {
      await ready
    },
  }
}
