import { TextFileGeneration } from './TextGeneration'

export class WriteTextFileGeneration extends TextFileGeneration {
  async generate() {
    const prompt = this.getPrompt()

    const content = await this.generator.build(prompt)
    await this.fs.mkdir(
      this.fs.dirname(this.path),
    )
    await this.fs.writeFile(this.path, content)
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
