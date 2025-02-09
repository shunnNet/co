import { DirectiveResolver, Source, ResolveOptions } from './types'
import { Resolver } from './Resolver'
import { TResolverOptions } from './Resolver'

export class MdResolver extends Resolver implements DirectiveResolver {
  constructor(options: TResolverOptions) {
    super(options)
    this.supportedSourceExtensions = ['md']
  }

  resolve(content: string, options: ResolveOptions): Source {
    let coContents = ''
    if (options.targetFilePath) {
      coContents = content
    }
    else {
      const matchCoContents = [...content.matchAll(/<!--\sco\s-->(?<coContent>[\s\S]+)<!--\sco-end\s-->/g)]
      coContents = matchCoContents.map(match => match.groups?.coContent).filter(Boolean).join('\n')
    }
    const allImports = this.extractImports(content, options.filename)
    const allCoImports = this.extractImports(coContents, options.filename)

    let importsUnique = Array.from(
      new Set([
        ...allImports.filter(path => this.targetMatcher(path)),
        ...allCoImports,
      ]),
    )
    if (options.targetFilePath) {
      importsUnique = importsUnique.filter(path => path === options.targetFilePath)
    }
    const fragments = this.extractFragments(content, options.filename)
    return {
      path: options.filename,
      content,
      directives: [
        ...importsUnique.map(targetPath => ({ targetPath, fragment: '' })),
        ...fragments,
      ],
    }
  }

  extractImports(content: string, filename: string): string[] {
    const matchImports = content.matchAll(/\[[^\]]+\]\((?<path>[^)]+)\)/g)
    const imports = Array.from(matchImports).flatMap(
      match => match && match.groups ? [match.groups.path] : [],
    )
    return imports.flatMap((path) => {
      try {
        return [this.ensureAbsolutePath(filename, path)]
      }
      catch (e) {
        return []
      }
    })
  }

  extractFragments(content: string, filename: string): { targetPath: string, fragment: string }[] {
    const matchCoSources = [...content.matchAll(/<!-- co-source (?<dir>.+) -->(?<fragment>[\s\S]*?)<!--\sco-end\s-->/g)]

    return matchCoSources.flatMap((match) => {
      const dir = match.groups?.dir
      const fragment = match.groups?.fragment
      if (!dir || !fragment) {
        return []
      }
      const targetPath = dir.match(/path:(?<path>[^\s]+)/)?.groups?.path
      if (!targetPath) {
        return []
      }
      return [{
        targetPath: this.ensureAbsolutePath(filename, targetPath),
        fragment,
      }]
    })
  }
}
