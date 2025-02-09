// import { isNodeModule } from '../utils'
import { DirectiveResolver, Source, ResolveOptions } from './types'
import { Resolver } from './Resolver'
import { TResolverOptions } from './Resolver'
export class JsResolver extends Resolver implements DirectiveResolver {
  constructor(options: TResolverOptions) {
    super(options)
    this.supportedSourceExtensions = ['ts', 'tsx', 'js', 'jsx', 'cjs', 'mjs', 'vue']
  }

  resolve(content: string, options: ResolveOptions): Source {
    let coContents = ''
    if (options.targetFilePath) {
      coContents = content
    }
    else {
      const matchCoContents = [...content.matchAll(/\/\/ co(?<coContent>[\s\S]*?)\/\/ co-end/g)]
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
    // console.log('fragments', fragments)
    // console.log(
    //   'paths',
    //   allImports.filter(path => this.targetMatcher(path)),
    //   allCoImports,
    // )
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
    const matchImportSideEfferct = content.matchAll(/import\s+['"](?<path>[^\s]*?)['"]/g)
    const contentRemoveSideEffect = content.replace(/import\s+['"][^\s]*?['"]/g, '')
    const matchImports = [
      ...contentRemoveSideEffect.matchAll(/import[\s\S]*?from ['"](?<path>[^\s]*?)['"]/g),
      ...contentRemoveSideEffect.matchAll(/require\(['"](?<path>[^\s]*?)['"]\)/g),
    ]
    const imports = matchImports.flatMap(
      match => match && match.groups ? [match.groups.path] : [],
    )
    const importsSideEffect = Array.from(matchImportSideEfferct).flatMap(
      match => match && match.groups ? [match.groups.path] : [],
    )
    return [
      ...imports,
      ...importsSideEffect,
    ].flatMap((path) => {
      try {
        return [this.ensureAbsolutePath(filename, path)]
      }
      catch (e) {
        return []
      }
    })
  }

  extractFragments(content: string, filename: string): { targetPath: string, fragment: string }[] {
    const matchCoSources = [
      ...content.matchAll(/\/\/ co-source (?<dir>.+)(?<fragment>[\s\S]*?)\/\/ co-end/g),
      ...content.matchAll(/<!--\sco-source (?<dir>.+)-->(?<fragment>[\s\S]*?)<!--\sco-end\s-->/g),
    ]
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
        targetPath: this.ensureAbsolutePath(filename, targetPath),
        fragment,
      }]
    })
    return fragments
  }
}
