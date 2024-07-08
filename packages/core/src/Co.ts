import { Source, DirectiveResolver } from './directive-resolvers/types'
import { JsResolver } from './directive-resolvers/JsResolver'
import fg from 'fast-glob'
import {
  resolve as resolvePath,
} from 'node:path'
import { MdResolver } from './directive-resolvers/mdResolver'
import { RewriteTextFileGeneration } from './generations/TextGeneration'
import { debounce, ensureArray } from './utils'
import { Resolver } from './directive-resolvers/Resolver'
import { LocalFsController } from './fs/LocalFsController'
import defu from 'defu'
import { TCoOptions } from './types'
import { Generation } from './generations/types'
import { LLMBuilder } from './builders/llm'
import picomatch from 'picomatch'
export class Co {
  resolvers: DirectiveResolver[]
  sourceDiction: Record<string, Source>
  generations: Record<string, Generation>
  generationResovler: Resolver
  fsController: LocalFsController
  options: TCoOptions
  targetMatcher: (path: string) => boolean

  constructor(options: Partial<TCoOptions>) {
    this.options = defu(options, {
      baseDir: process.cwd(),
      fsController: new LocalFsController(),
      targets: [],
      includes: ['**/*'],
      excludes: ['**/node_modules/**', '**/.vscode', '**/.git/**'],
      generation: {
        text: {
          apiKey: '',
          model: 'gpt-3.5-turbo',
          temperature: 0,
          getPrompt: null,
        },
      },
      resolve: {
        alias: {},
      },
    })
    this.sourceDiction = {}
    this.generations = {}
    this.fsController = this.options.fsController
    this.fsController.setAlias(this.options.resolve.alias)
    this.targetMatcher = picomatch(
      ensureArray(options.targets).map(
        t => this.fsController.resolveAlias(this.options.baseDir, t),
      ),
    ) as (path: string) => boolean

    this.generationResovler = new Resolver({
      targetMatcher: this.targetMatcher,
      fsController: this.options.fsController,
    })

    this.resolvers = [
      new JsResolver({
        targetMatcher: this.targetMatcher,
        fsController: this.options.fsController,
      }),
      new MdResolver({
        targetMatcher: this.targetMatcher,
        fsController: this.options.fsController,
      }),
    ]
  }

  protected getResolverByPath(path: string) {
    const resolver = this.resolvers.filter(r => r.isSupportedSource(path))[0]
    return resolver
  }

  async resolveSourceByPath(path: string): Promise<Source | null> {
    const resolver = this.getResolverByPath(path)
    if (!resolver) {
      return null
    }
    const content = await this.fsController.readFile(path)
    const source = resolver.resolve(content, { filename: path })
    if (!source.directives.length) {
      return null
    }
    else {
      return source
    }
  }

  /**
   * Scans the specified files and adds dependencies to the graph based on the directives found in the files.
   * @param include - The glob pattern to match the files to be scanned.
   * @param ignore - An array of glob patterns to exclude files from being scanned.
   */
  async scan(
    includes: string | string[] = this.options.includes,
    excludes?: string | string[],
  ) {
    const excludesArray = ensureArray(excludes)
    this.sourceDiction = {}
    const files = await fg(includes, {
      cwd: this.options.baseDir,
      ignore: excludesArray,
    })
    await Promise.allSettled(
      files.map(async (aFilePath) => {
        const source = await this.resolveSourceByPath(aFilePath)
        if (source) {
          this.sourceDiction[aFilePath] = source
        }
      }),
    )
  }

  async generateByTargetPaths(targetPaths: string[]) {
    const generations: Record<string, Generation> = {}

    await Promise.allSettled(
      targetPaths.map(async (target) => {
        const gen = await this.generationResovler.resolveGeneration(target, {
          ...this.options.generation.text,
          builder: new LLMBuilder(),
          fs: this.fsController,
        })
        generations[target] = gen
      }),
    )

    Object.values(this.sourceDiction).forEach((source) => {
      // !NOTE: temporary disallow source is also a generation target (prevent chain generation)
      if (generations[source.path]) {
        return
      }
      source.directives.forEach((directive) => {
        generations[directive.targetPath]?.addSources([source])
      })
    })

    await Promise.allSettled(
      Object.values(generations).map(async (gen) => {
        try {
          await gen.generate()
          console.log('generated: ', gen.path)
        }
        catch (e) {
          console.log('error: ', gen.path, e)
        }
      }),
    )

    this.generations = { ...generations }
  }

  async generate() {
    const targetPaths = Object.values(this.sourceDiction)
      .flatMap(s => s.directives.map(d => d.targetPath))

    await this.generateByTargetPaths(targetPaths)
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

    const handler = async () => {
      const _quene = queue.slice()
      queue.length = 0

      const unlinkPaths = _quene.flatMap(
        ({ event, changedPath }) => event === 'unlink' ? [resolvePath(changedPath)] : [],
      )

      unlinkPaths.forEach((absPath) => {
        if (this.sourceDiction[absPath]) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete this.sourceDiction[absPath]
        }
        else if (this.generations[absPath]) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete this.generations[absPath]
        }
      })

      const updatedPathInfoList: { absPath: string, source: Source }[] = []

      await Promise.all(
        _quene.map(
          async ({ event, changedPath }) => {
            if (event === 'add' || event === 'change') {
              const absPath = await this.fsController.resolvePath(this.options.baseDir, changedPath)
              const source = await this.resolveSourceByPath(absPath)
              if (source) {
                return updatedPathInfoList.push({ absPath, source })
              }
            }
          },
        ))

      const pathsNeedRegenerateBySource = updatedPathInfoList.filter(
        ({ source }) => source,
      ) as { absPath: string, source: Source }[]

      pathsNeedRegenerateBySource.forEach(({ absPath, source }) => {
        this.sourceDiction[absPath] = source
      })
      const targetPaths = pathsNeedRegenerateBySource.flatMap(
        ({ source }) => source.directives.map(d => d.targetPath),
      )
      if (targetPaths.length) {
        console.log('Generating files from sources...\n', targetPaths.join('\n'))
        await this.generateByTargetPaths(targetPaths)
      }

      const pathsNoSource = updatedPathInfoList.filter(
        ({ source }) => !source,
      ).map(({ absPath }) => absPath)

      // !NOTE: temporary disable rewrite
      await Promise.allSettled(pathsNoSource.map(async (absPath) => {
        const gen = await this.generationResovler.resolveGeneration(absPath, {
          ...this.options.generation.text,
          fs: this.fsController,
          builder: new LLMBuilder(),
        })
        if (!(gen instanceof RewriteTextFileGeneration)) {
          // console.log('Not rewrite generation: ', absPath)
          return
        }
        if (!this.generations[absPath]) {
          Object.values(this.sourceDiction).forEach((source) => {
            if (source.directives.some(d => d.targetPath === absPath)) {
              gen.addSources([source])
            }
          })
          this.generations[absPath] = gen
        }
        else {
          gen.addSources(this.generations[absPath].sources)
        }

        const { directives } = this.generations[absPath] as RewriteTextFileGeneration
        // TODO: This is a temporary way. It's dangerous to update directive relying on object references.
        gen.directives.forEach((d) => {
          const notChangedDirective = directives.find((od) => {
            console.log('compare: ', od.result.trim(), d.content.trim())
            return od.result.trim() === d.content.trim() && od.prompt === d.prompt
          })
          if (notChangedDirective) {
            d.result = notChangedDirective.result
          }
        })
        const directivesNeedRegenerated = gen.directives.filter(d => d.result.trim() !== d.content.trim())
        if (directivesNeedRegenerated.length) {
          console.log('rewrite: ', absPath)
          await gen.generateByDirectives(directivesNeedRegenerated)
        }
        this.generations[absPath] = gen
      }))
    }
    const debouncedHandler = debounce(async () => {
      running = true
      console.log('handling changes...')
      await handler()
      console.log('done handling changes...')
      running = false
      if (queue.length) {
        debouncedHandler()
      }
    }, 2000)

    this.fsController.watch({
      includes: includes || this.options.includes,
      excludes: excludes || this.options.excludes,
      cwd: this.options.baseDir,
    }, (event, path) => {
      console.log(event, path)
      queue.push({ event, changedPath: path })
      if (!running) {
        debouncedHandler()
      }
    })
  }

  /**
   * Removes all listeners from watched files.
   */
  unwatch() {
    this.fsController.unwatch()
  }
}
