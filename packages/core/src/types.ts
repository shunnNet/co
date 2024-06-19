import { RewriteDirective, Source } from './directive-resolvers/types'

export type TGenerationContext = {
  text: {
    apiKey: string
    model: string
    temperature: number
    getPrompt: null | ((
      sources: Source[],
      targetPath: string,
      directive?: RewriteDirective,
    ) => string)
  }
}
