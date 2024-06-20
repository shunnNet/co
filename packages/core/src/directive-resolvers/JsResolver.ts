// import { isNodeModule } from '../utils'
import { DirectiveResolver, Source, ResoveOptions } from './types'

import { Resolver } from './Resolver'

export class JsResolver extends Resolver implements DirectiveResolver {
  constructor() {
    super()
    this.supportedSourceExtensions = ['ts', 'tsx', 'js', 'jsx', 'cjs', 'mjs', 'vue']
  }

  resolve(content: string, options: ResoveOptions): Source {
    const matchComment = content.match(/\/\/ co(?<coContent>[\s\S]*?)\/\/ co-end/)

    if (!(matchComment?.groups?.coContent)) {
      return {
        path: options.filename,
        content,
        directives: [],
      }
    }
    const { coContent } = matchComment.groups

    const matchImportSideEfferct = coContent.matchAll(/import\s+['"](?<path>[^\s]*?)['"]/g)
    const coContentRemoveSideEffect = coContent.replace(/import\s+['"][^\s]*?['"]/g, '')

    const matchImports = coContentRemoveSideEffect.matchAll(/import[\s\S]*?from ['"](?<path>[^\s]*?)['"]/g)
    const imports = Array.from(matchImports).flatMap(
      match => match && match.groups ? [match.groups.path] : [],
    )
    const importsSideEffect = Array.from(matchImportSideEfferct).flatMap(
      match => match && match.groups ? [match.groups.path] : [],
    )

    const allImports = Array.from(
      new Set([
        ...imports,
        ...importsSideEffect,
      ]),
    ).flatMap((path) => {
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
