import defu from 'defu'
import { JsResolver } from '../directive-resolvers/JsResolver'
import { MdResolver } from '../directive-resolvers/mdResolver'
import { TTextGenerator } from '../generators'
import { Generation } from './types'
import { DirectiveResolver, Source } from '../directive-resolvers/types'
import picomatch from 'picomatch'
import { ensureArray } from '../utils'
import { Resolver } from '../directive-resolvers/Resolver'
import { Fs } from '../fs/LocalFsController'
import fg from 'fast-glob'
import { logger } from '../log'

type TGenerationGraphOptions = {
  baseDir: string
  /**
     * Generation targets
     *
     * File paths that match the patterns will be generated
     */
  targets?: string[]
  /**
     * Scan targets
     *
     * File paths that match the patterns will be scanned
     *
     * Scanned files will be used as sources for generation
     */
  includes: string | string[]
  excludes: string | string[]

  fs?: typeof Fs
  generator: TTextGenerator

  /**
     * A map of aliases to resolve paths.
     * example:
     *  {
     *   '@': resolve(__dirname,'./src'),
     *  }
     */
  alias: Record<string, string>
}

export class GenerationGraph {
  resolvers: DirectiveResolver[]
  sourceDiction: Record<string, Source>
  generations: Record<string, Generation>
  generationResovler: Resolver
  fs: Fs
  options: TGenerationGraphOptions
  targetMatcher: (path: string) => boolean
  sourceQueue: { absPath: string, source: Source | null }[]

  constructor(options: Partial<TGenerationGraphOptions> & { generator: TTextGenerator }) {
    this.options = defu(options, {
      baseDir: process.cwd(),
      targets: [],
      includes: ['**/*'],
      excludes: ['**/node_modules/**', '**/.vscode', '**/.git/**'],
      alias: {},
    })
    this.fs = new (this.options.fs || Fs)({
      alias: this.options.alias,
      base: this.options.baseDir,
    })
    this.targetMatcher = picomatch(
      ensureArray(options.targets).map(
        t => this.fs.resolveAlias(t),
      ),
    ) as (path: string) => boolean
    this.sourceDiction = {}
    this.generations = {}
    this.generationResovler = new Resolver({
      targetMatcher: this.targetMatcher,
      fsController: this.fs,
    })
    this.resolvers = [
      new JsResolver({
        targetMatcher: this.targetMatcher,
        fsController: this.fs,
      }),
      new MdResolver({
        targetMatcher: this.targetMatcher,
        fsController: this.fs,
      }),
    ]
    this.sourceQueue = []
  }

  async scan(
      includes: string | string[] = this.options.includes,
      excludes: string | string[] = this.options.excludes,
      targetSourcePath?: string,
  ) {
    this.sourceDiction = {}
    const files = await fg(includes, {
      cwd: this.options.baseDir,
      ignore: ensureArray(excludes),
    })
    await Promise.allSettled(
      files.map(async (aFilePath) => {
        const absPath = this.fs.resolve(aFilePath)
        return this.resolveSourceByPath(absPath, targetSourcePath)
          .then((source) => {
            if (source) {
              this.sourceDiction[absPath] = source
            }
          })
          .catch(error => logger.error(error))
      }),
    )
  }

  async generate() {
    const targetPaths = Object.values(this.sourceDiction)
      .flatMap(s => s.directives.map(d => d.targetPath))

    await this.generateToTargetPaths(targetPaths)
  }

  async flushGenerate() {
    const paths: string[] = []
    this.sourceQueue.forEach(({ absPath, source }) => {
      if (!source) {
        this.removeSourceIfExist(absPath)
      }
      else {
        this.setSource(absPath, source)
        paths.push(...source.directives.map(d => d.targetPath))
      }
    })
    const targetPaths = Array.from(new Set(paths))
    if (targetPaths.length) {
      await this.generateToTargetPaths(targetPaths)
    }
    this.sourceQueue.length = 0
  }

  async generateToTargetPaths(targetPaths: string[]) {
    const generations: Record<string, Generation> = {}

    await Promise.allSettled(
      targetPaths.map(async (target) => {
        const gen = await this.generationResovler.resolveGeneration(target, {
          generator: this.options.generator,
          fs: this.fs,
        })
        generations[target] = gen
      }),
    )
    // console.log(this.sourceDiction)

    Object.values(this.sourceDiction).forEach((source) => {
      // !NOTE: temporary disallow source is also a generation target (prevent chain generation)
      // if (generations[source.path]) {
      //   return
      // }
      source.directives.forEach((directive) => {
        generations[directive.targetPath]?.addSources([source])
      })
    })

    await Promise.allSettled(
      Object.values(generations).map(async (gen) => {
        try {
          logger.info('Generating: ', gen.path)
          await gen.generate()
          logger.info('Generated: ', gen.path)
          logger.info({ path: gen.path, sources: gen.sources.map(s => s.path) })
        }
        catch (e) {
          logger.error('error: ', gen.path, e)
        }
      }),
    )

    this.generations = { ...generations }
  }

  async singleFileGeneration(targetPath: string) {
    targetPath = this.fs.resolveAlias(targetPath)
    await this.scan(this.options.includes, this.options.excludes, targetPath)
    await this.generate()
  }

  async addQueue(absPath: string) {
    const source = await this.resolveSourceByPath(absPath)
    this.sourceQueue.push({ absPath, source })
    return this
  }

  getResolverByPath(path: string) {
    const resolver = this.resolvers.filter(r => r.isSupportedSource(path))[0]
    return resolver
  }

  /**
     * Resolves the source by the specified path.
     * @param path
     * @param targetFilePath
     * @returns
     */
  async resolveSourceByPath(
    path: string,
    targetFilePath?: string,
  ): Promise<Source | null> {
    const resolver = this.getResolverByPath(path)
    if (!resolver) {
      return null
    }
    const content = await this.fs.readFile(path)
    const source = resolver.resolve(content, { filename: path, targetFilePath })
    if (!source.directives.length) {
      return null
    }
    else {
      return source
    }
  }

  removeSourceIfExist(absPath: string) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.sourceDiction[absPath]
    return this
  }

  removeGenerationIfExist(absPath: string) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.generations[absPath]
    return this
  }

  setSource(absPath: string, source: Source) {
    this.sourceDiction[absPath] = source
    return this
  }
}
