import { DirectiveResolver, Directive, ResoveOptions } from './types'
import { extname as getExtname, resolve as resolvePath } from 'node:path'
import { existsSync } from 'node:fs'

export class JsResolver implements DirectiveResolver {
  static supportedExtensions = ['ts', 'tsx', 'js', 'jsx', 'cjs', 'mjs', 'vue', 'svelte', 'json']

  resolve(content: string, options: ResoveOptions): Directive[] {
    const matchComment = content.match(/\/\/ co(?<coContent>[\s\S]*?)\/\/ co-end/)

    if (!(matchComment?.groups?.coContent)) {
      console.info('No co content found')
      return []
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

    return allImports.map(path => ({ path }))
  }

  ensureAbsolutePath(baseFileName: string, relatedPath: string) {
    const baseExtension = getExtname(baseFileName).split('.').at(-1)
    if (!baseExtension) {
      throw new Error('baseFileName must have extension')
    }

    if (getExtname(relatedPath)) {
      const absPath = resolvePath(baseFileName, relatedPath)
      if (existsSync(absPath)) {
        return absPath
      }
      else {
        throw new Error('Cannot find file: ' + relatedPath)
      }
    }
    else {
      for (const extension of JsResolver.supportedExtensions) {
        const absPath = resolvePath(baseFileName, relatedPath + '.' + extension)
        if (existsSync(absPath)) {
          return absPath
        }
      }
      throw new Error('Cannot find file: ' + relatedPath)
    }
  }
}
