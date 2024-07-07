import { RewriteDirective, Source } from './directive-resolvers/types'
import { LocalFsController } from './fs/LocalFsController'

export type TCoOptions = {
  baseDir: string
  includes: string | string[]
  excludes: string | string[]
  fsController: LocalFsController
  generation: {
    text: {
      apiKey: string
      model: string
      temperature: number
      getPrompt?: null | ((
        sources: Source[],
        targetPath: string,
        directive?: RewriteDirective,
      ) => string)
    }
  }
  /**
   * A map of aliases to resolve paths.
   * example:
   *  {
   *  '@': './src',
   *  '~': './src',
   *  '~server: './src/server',
   *  '~client: './src/client
   * }
   */
  resolve: {
    alias: Record<string, string>
  }

}
