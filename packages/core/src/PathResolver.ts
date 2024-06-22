import { resolve as resolvePath } from 'node:path'

export class PathResolver {
  alias: Record<string, string>

  constructor(alias: Record<string, string> = {}) {
    this.alias = alias
  }

  resolveAlias(baseDir: string, path: string) {
    const aliasKeys = Object.keys(this.alias)
    for (const alias of aliasKeys) {
      if (path.startsWith(alias)) {
        return resolvePath(baseDir, path.replace(alias, this.alias[alias]))
      }
    }
    return resolvePath(baseDir, path)
  }

  resolve(baseDir: string, path: string, ext: string) {
    return resolvePath(baseDir, path + '.' + ext)
  }
}
