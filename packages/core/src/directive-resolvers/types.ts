export type Directive = {
  path: string
  prompt?: string
  model?: string
  temperature?: number
  target?: string
}

export type ResoveOptions = {
  filename: string
}

export interface DirectiveResolver {
  resolve(
    content: string,
    options: ResoveOptions
  ): Directive[]
  // resolveTarget(content: string): string | undefined
  isSupportedFile(filename: string): boolean
}
