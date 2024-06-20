import { DirectiveResolver, Source, ResoveOptions } from './types'
import { Resolver } from './Resolver'

export class MdResolver extends Resolver implements DirectiveResolver {
  constructor() {
    super()
    this.supportedSourceExtensions = ['md']
  }

  resolve(content: string, options: ResoveOptions): Source {
    const matchCoContents = [...content.matchAll(/<!--\sco\s-->(?<content>[\s\S]+)<!--\sco-end\s-->/g)]

    if (matchCoContents.length === 0) {
      return {
        path: options.filename,
        content,
        directives: [],
      }
    }

    const coContents = matchCoContents.map(match => match.groups?.content).filter(Boolean).join('\n')

    const matchImports = coContents.matchAll(/\[[^\]]+\]\((?<path>[^)]+)\)/g)

    const imports = Array.from(matchImports).flatMap(
      match => match && match.groups ? [match.groups.path] : [],
    )

    const allImports = imports.flatMap((path) => {
      try {
        return [this.ensureAbsolutePath(options.filename, path)]
      }
      catch (e) {
        return []
      }
    })

    return {
      path: options.filename,
      content,
      directives: allImports.map((targetPath) => {
        return {
          targetPath,
        }
      }),
    }
  }
}
