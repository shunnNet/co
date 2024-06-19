export type TLLMOptions = {
  apiKey: string
  model: string
  temperature: number
  prompt: string
}

export interface TBuilder<T> {
  build(options: TLLMOptions): Promise<T>
}
