import { Requester } from '../Graph'

export type TBlueprint = {
  id: string
  requesters: Requester[]
}
export interface TBuilder<T> {
  build(blueprint: TBlueprint): Promise<T>
}
