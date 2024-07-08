import {
  RewriteTextFileGeneration,
  TTextGenerationOptions,
  WriteTextFileGeneration,
} from '../generations/TextGeneration'
import querystring from 'node:querystring'
import { Generation } from '../generations/types'
import { FsController } from '../fs/types'

export type TResolverOptions = {
  fsController: FsController
  targetMatcher?: (path: string) => boolean
}
export class Resolver {
  public supportedSourceExtensions: string[] = []
  public fsController: FsController
  public targetMatcher: (path: string) => boolean

  constructor(options: TResolverOptions) {
    this.fsController = options.fsController
    this.targetMatcher = options.targetMatcher || (() => false)
  }

  async isSupportedSource(filename: string) {
    const ext = await this.fsController.getExtname(filename).slice(1)
    return this.supportedSourceExtensions.includes(ext)
  }

  async resolveGeneration(
    targetPath: string,
    generationOptions: TTextGenerationOptions,
  ): Promise<Generation> {
    if (!await this.fsController.exists(targetPath)) {
      return new WriteTextFileGeneration(targetPath, generationOptions)
    }
    const content = await this.fsController.readFile(targetPath)
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
    const baseExtension = this.fsController.getExtname(baseFileName).split('.').at(-1)
    if (!baseExtension) {
      throw new Error('baseFileName must have extension')
    }

    // TODO: Implement isNodeModule
    // See src/utils.ts
    // if (isNodeModule(relatedPath)) {
    //   throw new Error('Not support node_modules import')
    // }

    const baseDir = this.fsController.getDirname(baseFileName)

    if (this.fsController.getExtname(relatedPath)) {
      return this.fsController.resolveAlias(baseDir, relatedPath)
    }
    else {
      const [pathWithoutQs, qs] = relatedPath.split('?')
      const qsObj = querystring.parse(qs)

      if (qsObj['co-ext']) {
        const ext = Array.isArray(qsObj['co-ext']) ? qsObj['co-ext'][0] : qsObj['co-ext']
        if ('co-index' in qsObj) {
          return this.fsController.resolveAlias(baseDir, pathWithoutQs + '/index' + '.' + ext)
        }
        else {
          return this.fsController.resolveAlias(baseDir, pathWithoutQs + '.' + ext)
        }
      }
      else {
        return this.fsController.resolveAlias(baseDir, pathWithoutQs + '.' + 'txt')
      }
    }
  }
}
