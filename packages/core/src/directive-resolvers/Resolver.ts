import {
  TTextGenerationOptions,
} from '../generations/TextGeneration'

import querystring from 'node:querystring'
import { Generation } from '../generations/types'
import { Fs } from '../fs/LocalFsController'
import { WriteTextFileGeneration } from '../generations/WriteTextFileGeneration'
import { RewriteTextFileGeneration } from '../generations/RewriteTextFileGeneration'
import { isRelativePath } from '../fs/utils'

export type TResolverOptions = {
  fsController: Fs
  targetMatcher?: (path: string) => boolean
}
export class Resolver {
  public supportedSourceExtensions: string[] = []
  public fs: Fs
  public targetMatcher: (path: string) => boolean

  constructor(options: TResolverOptions) {
    this.fs = options.fsController
    this.targetMatcher = options.targetMatcher || (() => false)
  }

  isSupportedSource(filename: string) {
    const ext = this.fs.extname(filename).slice(1)
    return this.supportedSourceExtensions.includes(ext)
  }

  async resolveGeneration(
    targetPath: string,
    generationOptions: TTextGenerationOptions,
  ): Promise<Generation> {
    if (!await this.fs.exists(targetPath)) {
      return new WriteTextFileGeneration(targetPath, generationOptions)
    }
    const content = await this.fs.readFile(targetPath)
    const matchAllComments = [
      ...content.matchAll(/\/\/ co-target(?<prompt>.*)\n(?<coContent>[\s\S]*?)\/\/\sco-target-end/g),
      ...content.matchAll(/<!--\sco-target\s(?<prompt>.*)-->(?<coContent>[\s\S]*?)<!--\sco-target-end\s-->/g),
    ]
    if (!matchAllComments.length) {
      return new WriteTextFileGeneration(targetPath, generationOptions)
    }

    const rewriteDirectives = matchAllComments.flatMap((match, index) => match.groups?.coContent !== undefined
      ? [{
          index,
          content: match.groups.coContent || '',
          prompt: match.groups?.prompt || '',
          resolver: this,
          result: '',
        }]
      : [],
    )

    // TODO: handle duplicate contents
    // index solution can not handle because index may change after each rewrite
    return new RewriteTextFileGeneration(
      targetPath,
      rewriteDirectives,
      generationOptions,
    )
  }

  rewriteGeneration(content: string, id: number, rewrite: string): string {
    const matchAllResults = [
      ...content.matchAll(/(?<header>\/\/ co-target(?<prompt>.*)\n)(?<coContent>[\s\S]*?)(?<footer>\/\/\sco-target-end)/g),
      ...content.matchAll(/(?<header><!--\sco-target\s(?<prompt>.*)-->)(?<coContent>[\s\S]*?)(?<footer><!--\sco-target-end\s-->)/g),
    ]
    if (matchAllResults[id]) {
      const coContent = matchAllResults[id].groups?.coContent
      const header = matchAllResults[id].groups?.header
      const footer = matchAllResults[id].groups?.footer
      const fullMatchContent = matchAllResults[id][0]
      if (coContent) {
        return content.replace(
          fullMatchContent,
          fullMatchContent.replace(coContent, rewrite),
        )
      }
      else if (header && footer) {
        return content.replace(
          fullMatchContent,
          header + rewrite + footer,
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
    const baseExtension = this.fs.extname(baseFileName).split('.').at(-1)
    if (!baseExtension) {
      throw new Error('baseFileName must have extension')
    }

    // TODO: Implement isNodeModule
    // See src/utils.ts
    // if (isNodeModule(relatedPath)) {
    //   throw new Error('Not support node_modules import')
    // }

    if (this.fs.extname(relatedPath)) {
      return this.resolvePath(baseFileName, relatedPath)
    }
    else {
      const [pathWithoutQs, qs] = relatedPath.split('?')
      const qsObj = querystring.parse(qs)

      if (qsObj['co-ext']) {
        const ext = Array.isArray(qsObj['co-ext']) ? qsObj['co-ext'][0] : qsObj['co-ext']
        if ('co-index' in qsObj) {
          return this.resolvePath(baseFileName, pathWithoutQs + '/index' + '.' + ext)
        }
        else {
          return this.resolvePath(baseFileName, pathWithoutQs + '.' + ext)
        }
      }
      else {
        return this.resolvePath(baseFileName, pathWithoutQs + '.' + 'ts')
      }
    }
  }

  resolvePath(baseFileName: string, relatedPath: string) {
    if (isRelativePath(relatedPath)) {
      return this.fs.resolve(relatedPath, this.fs.dirname(baseFileName))
    }
    else {
      return this.fs.resolveAlias(relatedPath)
    }
  }
}
