import { promises as fs } from 'fs'
import { resolve, dirname, extname } from 'path'
import chokidar from 'chokidar'
import { FsController } from './interfaces/FsController'

export class LocalFsController implements FsController {
  watcher: chokidar.FSWatcher | null
  alias: Record<string, string>
  constructor(
    alias: Record<string, string> = {},
  ) {
    this.alias = alias
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

  resolvePath(baseDir: string, relativePath: string): string {
    return resolve(baseDir, relativePath)
  }

  resolveAlias(baseDir: string, path: string) {
    const aliasKeys = Object.keys(this.alias)
    for (const alias of aliasKeys) {
      if (path.startsWith(alias)) {
        return this.resolvePath(baseDir, path.replace(alias, this.alias[alias]))
      }
    }
    return this.resolvePath(baseDir, path)
  }

  getDirname(path: string): string {
    return dirname(path)
  }

  getExtname(path: string): string {
    return extname(path)
  }

  watch(
    options: {
      includes: string | string[]
      excludes: string | string[]
      cwd: string
    },
    callback: (event: string, path: string) => void,
  ): void {
    if (this.watcher) {
      this.unwatch()
    }
    this.watcher = chokidar.watch(options.includes, {
      ignored: options.excludes,
      persistent: true,
      cwd: options.cwd,
    })

    this.watcher
      .on('add', path => callback('add', path))
      .on('change', path => callback('change', path))
      .on('unlink', path => callback('unlink', path))
  }

  unwatch(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }
}
