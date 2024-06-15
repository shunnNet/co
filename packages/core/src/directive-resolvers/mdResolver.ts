import { DirectiveResolver, Directive, ResoveOptions } from './types'
import {
  extname as getExtname,
  dirname as getDirname,
  resolve as resolvePath,
} from 'node:path'
import { Resolver } from './Resolver'

export class MdResolver extends Resolver implements DirectiveResolver {
  constructor() {
    super()
    this.supportedExtensions = ['md']
  }

  resolve(content: string, options: ResoveOptions): Directive[] {
    const matchCoContents = [...content.matchAll(/<!--\sco\s-->(?<content>[\s\S]+)<!--\sco-end\s-->/g)]
    if (matchCoContents.length === 0) {
      return []
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

    return allImports.map(path => ({ path }))
  }

  ensureAbsolutePath(baseFileName: string, relatedPath: string) {
    const baseExtension = getExtname(baseFileName).split('.').at(-1)
    if (!baseExtension) {
      throw new Error('baseFileName must have extension')
    }

    const baseDir = getDirname(baseFileName)

    if (getExtname(relatedPath)) {
      return resolvePath(baseDir, relatedPath)
    }
    else {
      throw new Error('Not support path without extension')
    }
  }
}
