import { DirectiveResolver, Source, ResoveOptions } from './types'
import { Resolver } from './Resolver'
import { TResolverOptions } from './Resolver'

export class MdResolver extends Resolver implements DirectiveResolver {
  constructor(options: TResolverOptions = {}) {
    super(options)
    this.supportedSourceExtensions = ['md']
  }

  resolve(content: string, options: ResoveOptions): Source {
    const matchCoContents = [...content.matchAll(/<!--\sco\s-->(?<content>[\s\S]+)<!--\sco-end\s-->/g)]
    const matchCoSources = [...content.matchAll(/<!-- co-source (?<dir>.+) -->(?<fragment>[\s\S]*?)<!--\sco-end\s-->/g)]

    if (matchCoContents.length === 0 && matchCoSources.length === 0) {
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

    const fragments = matchCoSources.flatMap((match) => {
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
        targetPath: this.ensureAbsolutePath(options.filename, targetPath),
        fragment,
      }]
    })

    return {
      path: options.filename,
      content,
      directives: [
        ...allImports.map(targetPath => ({ targetPath, fragment: '' })),
        ...fragments,
      ],
    }
  }
}
