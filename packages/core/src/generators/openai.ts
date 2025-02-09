import { TTextGenerator } from './types'
import { sanitizeLLMOutput } from './utils'

export type TOpenAITextGeneratorOptions = {
  apiKey: string
  model?: string
  temperature?: number
}

export class OpenAITextGenerator implements TTextGenerator {
  private _options: TOpenAITextGeneratorOptions

  constructor(private options: TOpenAITextGeneratorOptions) {
    this._options = options
  }

  async build(prompt: string): Promise<string> {
    console.log(prompt)
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify({
        model: this.options.model ?? 'gpt-3.5-turbo',
        temperature: this.options.temperature ?? 0,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })
      .then(res => res.json())
      .then(res => sanitizeLLMOutput(res.choices[0].message.content))
    // return 'done'
  }
};
