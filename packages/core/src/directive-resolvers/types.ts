import { Generation } from '../Generation'
import { TGenerationContext } from '../types'

export type Source = {
  path: string
  content: string
  directives: SourceDirective[]
}

export type SourceDirective = {
  targetPath: string
}

export type GenerationDirective = {
  index?: number
  content?: string
  prompt?: string
  resolver: DirectiveResolver
}

export type ResoveOptions = {
  filename: string
}

export interface DirectiveResolver {
  resolve(
    content: string,
    options: ResoveOptions
  ): Source
  resolveGeneration(
    targetPath: string,
    generationContext: TGenerationContext,
  ): Generation
  rewriteGeneration(content: string, id: number, rewrite: string): string
  isSupportedFile(filename: string): boolean
}

export type RewriteDirective = {
  index: number
  content: string
  prompt: string
  resolver: DirectiveResolver
  result: string
}
