import { TTextGenerationOptions } from '../generations/TextGeneration'
import { Generation } from '../generations/types'
import { Resolver } from './Resolver'

export type Source = {
  path: string
  content: string
  directives: SourceDirective[]
}

export type SourceDirective = {
  targetPath: string
  fragment?: string
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
    generationOptions: TTextGenerationOptions
  ): Promise<Generation>
  rewriteGeneration(content: string, id: number, rewrite: string): string
  isSupportedSource(filename: string): Promise<boolean>
}

export type RewriteDirective = {
  index: number
  content: string
  prompt: string
  resolver: Resolver
  result: string
}
