import { TBuilder, TBlueprint } from './Builder'

export type TLLMOptions = {
  apiKey: string
  model?: string
  temperature?: number
}

export class LLMBuilder implements TBuilder<string> {
  options: TLLMOptions

  constructor(options: TLLMOptions) {
    this.options = Object.assign({}, {
      model: 'gpt-3.5-turbo',
      temperature: 0,
    }, options)
  }

  async build(blueprint: TBlueprint) {
    const prompt = this.getPrompt(blueprint)
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify({
        model: this.options.model,
        temperature: this.options.temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })
      .then(res => res.json())
      .then(res => this.sanitizeLLMOutput(res.choices[0].message.content))
  }

  getPrompt(blueprint: TBlueprint) {
    const requestersPrompt = blueprint.requesters.map(
      (req, i) => [
        `---importer file ${i + 1}---`,
        `name: ${req.id}`,
        `content: ${req.code}`,
      ].join('\n'),
    ).join('\n')

    return `We have files import a file not been written, I need you write the imported file contents which fulfill the usage requirements in other importer files. You must only return file content without any word.

${requestersPrompt}

---imported file---
filename: ${blueprint.id}
content:
`
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
