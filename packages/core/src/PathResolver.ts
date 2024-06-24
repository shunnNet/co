import { LocalFsController } from './fs/LocalFsController'

export class PathResolver {
  public alias: Record<string, string>
  protected fsController: LocalFsController

  constructor(
    alias: Record<string, string> = {},
    fsController?: LocalFsController,
  ) {
    this.alias = alias
    this.fsController = fsController || new LocalFsController()
  }

  resolveAlias(baseDir: string, path: string) {
    const aliasKeys = Object.keys(this.alias)
    for (const alias of aliasKeys) {
      if (path.startsWith(alias)) {
        return this.fsController.resolvePath(baseDir, path.replace(alias, this.alias[alias]))
      }
    }
    return this.fsController.resolvePath(baseDir, path)
  }

  resolve(baseDir: string, path: string, ext: string) {
    return this.fsController.resolvePath(baseDir, path + '.' + ext)
  }
}
