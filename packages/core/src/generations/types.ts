import { Source } from '../directive-resolvers/types'

export interface Generation {
  path: string
  sources: Source[]
  generate(): Promise<void>
  addSources(sources: Source[]): void
}
