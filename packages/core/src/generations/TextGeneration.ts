import { RewriteDirective, Source } from '../directive-resolvers/types'
import { TCoOptions } from '../types'
import { FsController } from '../fs/types'
import { Generation } from './types'
import { TBuilder } from '../builders/types'

export type TTextGenerationOptions = TCoOptions['generation']['text'] & {
  fs: FsController
  builder: TBuilder<string>
}

export class TextFileGeneration {
  public path: string
  public sources: Source[]
  protected builder: TBuilder<string>
  protected options: TTextGenerationOptions
  protected fsController: FsController

  constructor(
    path: string,
    options: TTextGenerationOptions,
  ) {
    this.path = path
    this.sources = []
    this.options = options
    this.builder = options.builder
    this.fsController = this.options.fs
  }

  addSources(sources: Source[]) {
    this.sources.push(...sources)
  }
}

export class WriteTextFileGeneration extends TextFileGeneration implements Generation {
  async generate() {
    const { getPrompt, apiKey, model, temperature } = this.options
    const prompt = typeof getPrompt === 'function'
      ? getPrompt(this.sources, this.path)
      : this.getPrompt()

    const content = await this.builder.build({
      apiKey,
      model,
      temperature,
      prompt,
    })
    console.log(this.path)
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
    options: TTextGenerationOptions,
  ) {
    super(path, options)
    this.directives = directives
  }

  async generate() {
    await this.generateByDirectives(this.directives)
  }

  async generateByDirectives(directives: RewriteDirective[]) {
    let currentContent = await this.fsController.readFile(this.path)
    const { getPrompt, apiKey, model, temperature } = this.options
    const results = await Promise.allSettled(
      directives.map(async (directive) => {
        const prompt = typeof getPrompt === 'function'
          ? getPrompt(this.sources, this.path, directive)
          : this.getPrompt(directive)
        directive.result = await this.builder.build({
          apiKey,
          model,
          temperature,
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
