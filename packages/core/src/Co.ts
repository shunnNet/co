import { clearCoComment, debounce, ensureArray } from './utils'
import { Fs } from './fs/LocalFsController'
import defu from 'defu'
import { TCoOptions } from './types'
import { TTextGenerator } from './generators/types'
import chokidar from 'chokidar'
import { CSSGeneration } from './generations/CSSGenration'
import { GenerationGraph } from './generations/GenerationGraph'
import { logger } from './log'
import fg from 'fast-glob'

export function defineCoConfig(options: Partial<TCoOptions> & { generator: TTextGenerator }) {
  return options
};

export class Co {
  fs: Fs
  options: TCoOptions
  watcher: chokidar.FSWatcher | null
  cssGeneration: CSSGeneration
  generationGroup: GenerationGraph

  constructor(options: Partial<TCoOptions> & { generator: TTextGenerator }) {
    this.options = defu(options, {
      baseDir: process.cwd(),
      targets: [],
      includes: ['**/*'],
      excludes: ['**/node_modules/**', '**/.vscode', '**/.git/**'],
      alias: {},
    })
    logger.debug('Co options:', this.options)
    if (!this.options.generator) {
      logger.error('options.generator is required')
      throw new Error('options.generator is required')
    }

    this.fs = new (this.options.fs || Fs)({
      alias: this.options.alias,
      base: this.options.baseDir,
    })
    this.watcher = null
    this.cssGeneration = new CSSGeneration(
      {
        fs: this.fs,
        generator: this.options.generator,
        outputPath: this.options.cssPath,
      },
    )
    this.generationGroup = new GenerationGraph({
      baseDir: this.options.baseDir,
      includes: this.options.includes,
      excludes: this.options.excludes,
      generator: this.options.generator,
      alias: this.options.alias,
      fs: this.options.fs,
    })
  }

  /**
   * Scans the specified files and adds dependencies to the graph based on the directives found in the files.
   * @param include - The glob pattern to match the files to be scanned.
   * @param excludes - An array of glob patterns to exclude files from being scanned.
   */
  async scan(
    includes: string | string[] = this.options.includes,
    excludes: string | string[] = this.options.excludes,
    targetSourcePath?: string,
  ) {
    await this.generationGroup.scan(includes, excludes, targetSourcePath)
  }

  generate() {
    return this.generationGroup.generate()
  }

  singleFileGeneration(targetPath: string) {
    return this.generationGroup.singleFileGeneration(targetPath)
  }

  async clear() {
    const files = await fg(this.options.includes, {
      cwd: this.options.baseDir,
      ignore: ensureArray(this.options.excludes),
    })
    let count = 0
    await Promise.allSettled(
      files.map(async (f) => {
        const content = await this.fs.readFile(f)
        const result = clearCoComment(content)
        if (content !== result) {
          count++
          await this.fs.writeFile(f, result)
        }
      }),
    )
    logger.info(`Cleared ${count} files.`)
  }

  /**
   * Removes all listeners from watched files.
   */
  unwatch() {
    this.watcher?.close()
  }

  /**
   * Watches the specified files for changes and performs ai completion for requests.
   *
   * @param include - The glob pattern or file path to include for watching.
   * @param exclude - An array of glob patterns or file paths to ignore.
  */
  watch(includes?: string[], excludes?: string[]) {
    const queue: { event: string, changedPath: string }[] = []
    let running = false

    this.watcher = chokidar.watch(includes || this.options.includes, {
      ignored: excludes || this.options.excludes,
      persistent: true,
      cwd: this.options.baseDir,
      ignoreInitial: true,
      // interval: 2000,
    })
      .on('ready', () => {
        logger.info('Start watching...')
      })
      .on('all', (event, path) => {
        logger.debug('Watcher event:', { event, path })
        if (!running) {
          logger.debug('Add queue', { event, path })
          queue.push({ event, changedPath: path })
          debouncedHandler()
        }
      })
    const debouncedHandler = debounce(async () => {
      running = true
      logger.info('Handling changes...')

      await handler()

      logger.info('Done.')
      setTimeout(() => {
        running = false
      }, 1000)
    }, 2000)
    const handler = async () => {
      const tasks = queue.slice()
      queue.length = 0

      // Delete unlink files from generation graph
      tasks
        .forEach(({ event, changedPath }) => {
          if (event === 'unlink') {
            const absPath = this.fs.resolve(changedPath)
            this.generationGroup
              .removeGenerationIfExist(absPath)
              .removeSourceIfExist(absPath)
          }
        })

      // Generate only for changed files or new files
      // replace sources and only generate for paths that related to the updated sources
      await Promise.all(
        tasks.map(
          async ({ event, changedPath: path }) => {
            if (!(['add', 'change'].includes(event))) {
              return []
            }
            const absPath = this.fs.resolve(path)
            await this.generationGroup.addQueue(absPath)
          },
        ))

      await this.generationGroup.flushGenerate()

      // ---------------------------------------
      // CSS generation
      const cssPaths = tasks.flatMap(({ event, changedPath }) => {
        return event === 'change' ? [this.fs.resolve(changedPath)] : []
      })
      await this.cssGeneration.generate(cssPaths)

      // Rewrite generation
      // const pathsNoSource = updatedPathInfoList.filter(
      //   ({ source }) => !source,
      // ).map(({ absPath }) => absPath)

      // // !NOTE: temporary disable rewrite
      // await Promise.allSettled(pathsNoSource.map(async (absPath) => {
      //   const gen = await this.generationResovler.resolveGeneration(absPath, {
      //     fs: this.fs,
      //     generator: this.options.generator,
      //   })
      //   if (!(gen instanceof RewriteTextFileGeneration)) {
      //     // console.log('Not rewrite generation: ', absPath)
      //     return
      //   }
      //   if (!this.generations[absPath]) {
      //     Object.values(this.sourceDiction).forEach((source) => {
      //       if (source.directives.some(d => d.targetPath === absPath)) {
      //         gen.addSources([source])
      //       }
      //     })
      //     this.generations[absPath] = gen
      //   }
      //   else {
      //     gen.addSources(this.generations[absPath].sources)
      //   }

      //   const { directives } = this.generations[absPath] as RewriteTextFileGeneration
      //   // TODO: This is a temporary way. It's dangerous to update directive relying on object references.
      //   gen.directives.forEach((d) => {
      //     const notChangedDirective = directives.find((od) => {
      //       console.log('compare: ', od.result.trim(), d.content.trim())
      //       return od.result.trim() === d.content.trim() && od.prompt === d.prompt
      //     })
      //     if (notChangedDirective) {
      //       d.result = notChangedDirective.result
      //     }
      //   })
      //   const directivesNeedRegenerated = gen.directives.filter(d => d.result.trim() !== d.content.trim())
      //   if (directivesNeedRegenerated.length) {
      //     console.log('rewrite: ', absPath)
      //     await gen.generateByDirectives(directivesNeedRegenerated)
      //   }
      //   this.generations[absPath] = gen
      // }))
    }
  }
}
