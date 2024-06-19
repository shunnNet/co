import { DirectiveResolver, Source, ResoveOptions } from './types'
import {
  extname as getExtname,
  dirname as getDirname,
  resolve as resolvePath,
} from 'node:path'
import { Resolver } from './Resolver'
import { existsSync, readFileSync } from 'node:fs'
import { Generation, RewriteTextFileGeneration, WriteTextFileGeneration } from '../Generation'
import { TGenerationContext } from '../types'

export class MdResolver extends Resolver implements DirectiveResolver {
  constructor() {
    super()
    this.supportedExtensions = ['md']
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

  resolveGeneration(
    targetPath: string,
    generationContext: TGenerationContext,
  ): Generation {
    if (!existsSync(targetPath)) {
      return new WriteTextFileGeneration(targetPath, generationContext)
    }
    const content = readFileSync(targetPath, 'utf-8')
    const matchAllComments = [...content.matchAll(/<!--\sco-target\s(?<prompt>.*)-->\n(?<coContent>[\s\S]+)\n<!--\sco-target-end\s-->/g)]
    if (!matchAllComments.length) {
      return new WriteTextFileGeneration(targetPath, generationContext)
    }
    const rewriteDirectives = matchAllComments.flatMap((match, index) => match.groups?.coContent
      ? [{
          index,
          content: match.groups.coContent,
          prompt: match.groups.prompt || '',
          resolver: this,
          result: '',
        }]
      : [],
    )

    return new RewriteTextFileGeneration(
      targetPath,
      rewriteDirectives,
      generationContext,
    )
  }

  rewriteGeneration(content: string, id: number, rewrite: string): string {
    const matchAllResults = [...content.matchAll(/<!--\sco-target\s(?<prompt>.*)-->\n(?<coContent>[\s\S]+)\n<!--\sco-target-end\s-->/g)]
    if (matchAllResults[id]) {
      const coContent = matchAllResults[id].groups?.coContent
      const fullMatchContent = matchAllResults[id][0]
      if (coContent) {
        return content.replace(
          fullMatchContent,
          fullMatchContent.replace(coContent, rewrite),
        )
      }
      else {
        return content
      }
    }
    else {
      return content
    }
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
