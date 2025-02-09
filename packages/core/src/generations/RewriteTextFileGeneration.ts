import { RewriteDirective } from '../directive-resolvers/types'
import { TextFileGeneration, TTextGenerationOptions } from './TextGeneration'

export class RewriteTextFileGeneration extends TextFileGeneration {
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
    let currentContent = await this.fs.readFile(this.path)
    const results = await Promise.allSettled(
      directives.map(async (directive) => {
        const prompt = this.getPrompt(directive)
        directive.result = await this.generator.build(prompt)
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
    await this.fs.writeFile(this.path, currentContent)
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
