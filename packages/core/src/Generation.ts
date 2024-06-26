import { LLMBuilder } from './builders/llm'
import { RewriteDirective, Source } from './directive-resolvers/types'
import { TCoOptions } from './types'
import { LocalFsController } from './fs/LocalFsController'
export class TextFileGeneration {
  public path: string
  public sources: Source[]
  protected builder: LLMBuilder
  protected coOptions: TCoOptions
  protected fsController: LocalFsController

  constructor(
    path: string,
    coOptions: TCoOptions,
  ) {
    this.path = path
    this.sources = []
    this.builder = new LLMBuilder()
    this.coOptions = coOptions
    this.fsController = new LocalFsController()
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
    const { text: options } = this.coOptions.generation

    const prompt = typeof options.getPrompt === 'function'
      ? options.getPrompt(this.sources, this.path)
      : this.getPrompt()
    console.log('prompt', prompt)
    const content = await this.builder.build({
      apiKey: options.apiKey,
      model: options.model,
      temperature: options.temperature,
      prompt,
    })
    await this.fsController.mkdir(
      this.fsController.getDirname(this.path),
    )
    await this.fsController.writeFile(this.path, content)
  }

  getPrompt() {
    const sourcePrompt = this.sources.map(
      (source) => {
        const fragments = source.directives.flatMap((directive) => {
          return directive.targetPath === this.path && directive.fragment
            ? [directive.fragment]
            : []
        })

        const generateByFullContent = source.directives.some(
          directive => directive.targetPath === this.path && !directive.fragment,
        )

        const fullContentPrompt = generateByFullContent
          ? [
          `---source file---`,
          `name: ${source.path}`,
          `content: ${source.content}`,
            ].join('\n')
          : ''

        const fragmentPrompt = fragments.map(
          fragment => [
            `---source file---`,
            `name: ${source.path}`,
            `content: ${fragment}`,
          ].join('\n'),
        ).join('\n')

        return [fullContentPrompt, fragmentPrompt].filter(Boolean).join('\n')
      },
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
    coOptions: TCoOptions,
  ) {
    super(path, coOptions)
    this.directives = directives
  }

  async generate() {
    await this.generateByDirectives(this.directives)
  }

  async generateByDirectives(directives: RewriteDirective[]) {
    let currentContent = await this.fsController.readFile(this.path)

    const results = await Promise.allSettled(
      directives.map(async (directive) => {
        const { text: options } = this.coOptions.generation
        const prompt = typeof options.getPrompt === 'function'
          ? options.getPrompt(this.sources, this.path, directive)
          : this.getPrompt(directive)
        console.log('prompt', prompt)
        directive.result = await this.builder.build({
          apiKey: options.apiKey,
          model: options.model,
          temperature: options.temperature,
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
    await this.fsController.writeFile(this.path, currentContent)
  }

  getPrompt(directive: RewriteDirective) {
    const sourcePrompt = this.sources.map(
      (source) => {
        const fragments = source.directives.flatMap((directive) => {
          return directive.targetPath === this.path && directive.fragment
            ? [directive.fragment]
            : []
        })

        const generateByFullContent = source.directives.some(
          directive => directive.targetPath === this.path && !directive.fragment,
        )

        const fullContentPrompt = generateByFullContent
          ? [
          `---source file---`,
          `name: ${source.path}`,
          `content: ${source.content}`,
            ].join('\n')
          : ''

        const fragmentPrompt = fragments.map(
          fragment => [
            `---source file---`,
            `name: ${source.path}`,
            `content: ${fragment}`,
          ].join('\n'),
        ).join('\n')

        return [fullContentPrompt, fragmentPrompt].filter(Boolean).join('\n')
      },
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
