export interface TTextGenerator {
  build(prompt: string): Promise<string>
}
