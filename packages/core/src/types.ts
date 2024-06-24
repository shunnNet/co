import { RewriteDirective, Source } from './directive-resolvers/types'
import { LocalFsController } from './fs/LocalFsController'

export type TContext = {
  fsController: LocalFsController
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
