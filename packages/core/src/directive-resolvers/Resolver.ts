import {
  Generation,
  RewriteTextFileGeneration,
  WriteTextFileGeneration,
} from '../Generation'
import { TContext } from '../types'
import querystring from 'node:querystring'

import { PathResolver } from '../PathResolver'

import { LocalFsController } from '../fs/LocalFsController'

export type TResolverOptions = {
  alias?: Record<string, string>
  fsController?: LocalFsController

}
export class Resolver {
  public supportedSourceExtensions: string[] = []
  private pathResolver: PathResolver
  protected fsController: LocalFsController

  constructor(options: TResolverOptions = {}) {
    this.pathResolver = new PathResolver(options.alias)
    this.fsController = options.fsController || new LocalFsController()
  }

  async isSupportedSource(filename: string) {
    const ext = await this.fsController.getExtname(filename).slice(1)
    return this.supportedSourceExtensions.includes(ext)
  }

  async resolveGeneration(
    targetPath: string,
    generationContext: TContext,
  ): Promise<Generation> {
    if (!await this.fsController.exists(targetPath)) {
      return new WriteTextFileGeneration(targetPath, generationContext)
    }
    const content = await this.fsController.readFile(targetPath)
    const matchAllComments = [
      ...content.matchAll(/\/\/ co-target(?<prompt>.*)\n(?<coContent>[\s\S]*?)\/\/\sco-target-end/g),
      ...content.matchAll(/<!--\sco-target\s(?<prompt>.*)-->(?<coContent>[\s\S]*?)<!--\sco-target-end\s-->/g),
    ]
    if (!matchAllComments.length) {
      return new WriteTextFileGeneration(targetPath, generationContext)
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
      generationContext,
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
      return this.pathResolver.resolveAlias(baseDir, relatedPath)
    }
    else {
      const [pathWithoutQs, qs] = relatedPath.split('?')
      const qsObj = querystring.parse(qs)

      if (qsObj['co-ext']) {
        const ext = Array.isArray(qsObj['co-ext']) ? qsObj['co-ext'][0] : qsObj['co-ext']
        if ('co-index' in qsObj) {
          return this.pathResolver.resolve(baseDir, pathWithoutQs + '/index', ext)
        }
        else {
          return this.pathResolver.resolve(baseDir, pathWithoutQs, ext)
        }
      }
      else {
        return this.pathResolver.resolve(baseDir, pathWithoutQs, 'txt')
      }
    }
  }
}
