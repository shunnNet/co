import { TBuilder, TLLMOptions } from './types'

export class LLMBuilder implements TBuilder<string> {
  async build(options: TLLMOptions) {
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        temperature: options.temperature,
        messages: [
          {
            role: 'user',
            content: options.prompt,
          },
        ],
      }),
    })
      .then(res => res.json())
      .then(res => this.sanitizeLLMOutput(res.choices[0].message.content))
  }

  sanitizeLLMOutput(content: string) {
    if (content.match(/```[\s\S]*?```/)) {
      return content.replace(/```.*/g, '')
    }
    else {
      return content
    }
  }
};
