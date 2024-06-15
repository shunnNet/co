import {
  extname as getExtname,
} from 'node:path'

export class Resolver {
  public supportedExtensions: string[] = []
  isSupportedFile(filename: string) {
    const ext = getExtname(filename).slice(1)
    return this.supportedExtensions.includes(ext)
  }
}
