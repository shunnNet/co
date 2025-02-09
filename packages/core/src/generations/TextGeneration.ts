import { Source } from '../directive-resolvers/types'
import { Fs } from '../fs/LocalFsController'
import { TTextGenerator } from '../generators/types'
import { Generation } from './types'

export type TTextGenerationOptions = {
  fs: Fs
  generator: TTextGenerator
}

export class TextFileGeneration implements Generation {
  public path: string
  public sources: Source[]
  protected generator: TTextGenerator
  protected options: TTextGenerationOptions
  protected fs: Fs

  constructor(
    path: string,
    options: TTextGenerationOptions,
  ) {
    this.path = path
    this.sources = []
    this.options = options
    this.generator = options.generator
    this.fs = this.options.fs
  }

  addSources(sources: Source[]) {
    this.sources.push(...sources)
  }

  generate(): Promise<void> {
    throw new Error('Method not implemented')
  }
}
