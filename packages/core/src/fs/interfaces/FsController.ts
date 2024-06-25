export interface FsController {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  mkdir(path: string): Promise<void>
  exists(path: string): Promise<boolean>
  resolvePath(baseDir: string, relativePath: string): string
  getDirname(path: string): string
  getExtname(path: string): string
  watch(
    options: {
      includes: string | string[]
      excludes: string | string[]
    },
    callback: (event: string, path: string) => void
  ): void
  unwatch(): void
}
