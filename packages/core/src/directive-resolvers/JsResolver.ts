import { isNodeModule } from '../utils'
import { DirectiveResolver, Directive, ResoveOptions } from './types'
import {
  extname as getExtname,
  resolve as resolvePath,
  dirname as getDirname,
} from 'node:path'
import querystring from 'node:querystring'

export class JsResolver implements DirectiveResolver {
  static supportedExtensions = ['ts', 'tsx', 'js', 'jsx', 'cjs', 'mjs', 'vue', 'json']

  resolve(content: string, options: ResoveOptions): Directive[] {
    const matchComment = content.match(/\/\/ co(?<coContent>[\s\S]*?)\/\/ co-end/)

    if (!(matchComment?.groups?.coContent)) {
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
    if (isNodeModule(relatedPath)) {
      throw new Error('Not support node_modules import')
    }

    const baseDir = getDirname(baseFileName)

    if (getExtname(relatedPath)) {
      return resolvePath(baseDir, relatedPath)
    }
    else {
      const [pathWithoutQs, qs] = relatedPath.split('?')
      const qsObj = querystring.parse(qs)
      if (qsObj['co-ext'] && 'co-index' in qsObj) {
        return resolvePath(baseDir, pathWithoutQs, 'index' + '.' + qsObj['co-ext'])
      }
      else if (qsObj['co-ext']) {
        return resolvePath(baseDir, pathWithoutQs + '.' + qsObj['co-ext'])
      }
      else {
        throw new Error(`Failed to resolve without extension: ${relatedPath}`)
      }
    }
  }
}
