import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { LLMBuilder } from './builders/llm'
import { RewriteDirective, Source } from './directive-resolvers/types'
import { TGenerationContext } from './types'
import { dirname } from 'path'

export class TextFileGeneration {
  public path: string
  public sources: Source[]
  protected builder: LLMBuilder
  protected context: TGenerationContext

  constructor(
    path: string,
    generationContext: TGenerationContext,
  ) {
    this.path = path
    this.sources = []
    this.builder = new LLMBuilder()
    this.context = generationContext
  }

  addSource(source: Source) {
    this.sources.push(source)
  }

  addSources(sources: Source[]) {
    this.sources.push(...sources)
  }
}

export interface Generation {
  path: string
  sources: Source[]
  generate(): Promise<void>
  addSource(source: Source): void
}

export class WriteTextFileGeneration extends TextFileGeneration implements Generation {
  async generate() {
    const { text: options } = this.context

    const prompt = typeof options.getPrompt === 'function'
      ? options.getPrompt(this.sources, this.path)
      : this.getPrompt()

    const content = await this.builder.build({
      apiKey: this.context.text.apiKey,
      model: this.context.text.model,
      temperature: this.context.text.temperature,
      prompt,
    })
    mkdirSync(dirname(this.path), { recursive: true })
    writeFileSync(this.path, content)
  }

  getPrompt() {
    const sourcePrompt = this.sources.map(
      (source, i) => [
        `---source file ${i + 1}---`,
        `name: ${source.path}`,
        `content: ${source.content}`,
      ].join('\n'),
    ).join('\n')
    return `We have "source files" reference a file not been written, I need you write the "referenced file" contents which fulfill the usage requirements in other source files. You must only return file content without any word.

${sourcePrompt}

---referenced file---
filename: ${this.path}
content:
`
  }
}

export class RewriteTextFileGeneration extends TextFileGeneration implements Generation {
  public directives: RewriteDirective[]
  constructor(
    path: string,
    directives: RewriteDirective[],
    generationContext: TGenerationContext,
  ) {
    super(path, generationContext)
    this.directives = directives
  }

  async generate() {
    await this.generateByDirectives(this.directives)
  }

  async generateByDirectives(directives: RewriteDirective[]) {
    let currentContent = readFileSync(this.path, 'utf-8')

    const results = await Promise.allSettled(
      directives.map(async (directive) => {
        const options = this.context.text
        const prompt = typeof options.getPrompt === 'function'
          ? options.getPrompt(this.sources, this.path, directive)
          : this.getPrompt(directive)

        directive.result = await this.builder.build({
          apiKey: this.context.text.apiKey,
          model: this.context.text.model,
          temperature: this.context.text.temperature,
          prompt,
        })
        return directive
      }),
    )
    results
      .flatMap(r => r.status === 'fulfilled' ? [r.value] : [])
      .reverse()
      .forEach((directive) => {
        currentContent = directive.resolver.rewriteGeneration(
          currentContent,
          directive.index as number,
          directive.result,
        )
      })
    writeFileSync(this.path, currentContent)
  }

  getPrompt(directive: RewriteDirective) {
    const sourcePrompt = this.sources.map(
      (source, i) => [
        `---source file ${i + 1}---`,
        `name: ${source.path}`,
        `content: ${source.content}`,
      ].join('\n'),
    ).join('\n')
    return `We have "source files" reference a file, which has a part of content need adjust, I need you rewrite the content in "referenced file" to fulfill the usage requirements in other source files. You must only return rewrited content without any word.

${sourcePrompt}

---referenced file---
filename: ${this.path}
current part of contents: ${directive.content}

---rewrited part of contents---
${directive.prompt.trim() ? 'hint: ' + directive.prompt : ''}
content:
`
  }

  addDirective(directive: RewriteDirective) {
    this.directives.push(directive)
  }
}
