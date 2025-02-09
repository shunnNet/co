import { promises as fs } from 'fs'
import { resolve, dirname, extname } from 'pathe'
import { resolveAlias } from 'pathe/utils'
import chokidar from 'chokidar'

type TFsOptions = {
  alias: Record<string, string>
  base?: string
}
export class Fs {
  watcher: chokidar.FSWatcher | null
  alias: Record<string, string>
  base: string
  constructor(
    options: Partial<TFsOptions> = {},
  ) {
    this.base = options.base || process.cwd()
    this.alias = options.alias || {}
    this.watcher = null
  }

  async readFile(path: string): Promise<string> {
    return fs.readFile(path, 'utf-8')
  }

  async writeFile(path: string, content: string): Promise<void> {
    await fs.writeFile(path, content, 'utf-8')
  }

  async mkdir(path: string): Promise<void> {
    await fs.mkdir(path, { recursive: true })
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path)
      return true
    }
    catch {
      return false
    }
  }

  resolve(relativePath: string, base?: string): string {
    return resolve(base ?? this.base, relativePath)
  }

  resolveAlias(path: string): string {
    return resolveAlias(path, this.alias)
  }

  dirname(path: string): string {
    return dirname(path)
  }

  extname(path: string): string {
    return extname(path)
  }
}
