import { Fs } from './fs/LocalFsController'
import { TTextGenerator } from './generators/types'

export type TCoOptions = {
  baseDir: string
  /**
   * Generation targets
   *
   * File paths that match the patterns will be generated
   */
  targets?: string[]
  /**
   * Scan targets
   *
   * File paths that match the patterns will be scanned
   *
   * Scanned files will be used as sources for generation
   */
  includes: string | string[]
  excludes: string | string[]

  fs?: typeof Fs
  generator: TTextGenerator

  /**
   * A map of aliases to resolve paths.
   * example:
   *  {
   *   '@': resolve(__dirname,'./src'),
   *  }
   */
  alias: Record<string, string>

  /**
   * Default output path for generated css file
   */
  cssPath?: string

}
