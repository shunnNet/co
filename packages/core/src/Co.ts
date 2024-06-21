import { Source, DirectiveResolver } from './directive-resolvers/types'
import { JsResolver } from './directive-resolvers/JsResolver'
import fg from 'fast-glob'
import {
  readFileSync,
} from 'node:fs'
import {
  resolve as resolvePath,
} from 'node:path'
import chokidar from 'chokidar'
import { MdResolver } from './directive-resolvers/mdResolver'
import { Generation, RewriteTextFileGeneration } from './Generation'
import { TGenerationContext } from './types'
import { debounce } from './utils'
import { Resolver } from './directive-resolvers/Resolver'

type TCoOptions = {
  generation: {
    text: Partial<TGenerationContext['text']>
  }
}

export class Co {
  resolvers: DirectiveResolver[]
  watcher?: chokidar.FSWatcher
  sourceDiction: Record<string, Source>
  generationContext: TGenerationContext
  generations: Record<string, Generation>
  generationResovler: Resolver

  constructor(options: TCoOptions) {
    this.resolvers = [
      new JsResolver(),
      new MdResolver(),
    ]
    this.watcher = undefined
    this.sourceDiction = {}
    this.generationContext = {
      text: {
        apiKey: '',
        model: 'gpt-3.5-turbo',
        temperature: 0,
        getPrompt: null,
        ...options.generation.text,
      },
    }
    this.generations = {}
    this.generationResovler = new Resolver()
  }

  protected getResolverByPath(path: string) {
    const resolver = this.resolvers.filter(r => r.isSupportedSource(path))[0]
    return resolver
  }

  resolveSourceByPath(path: string): Source | null {
    const resolver = this.getResolverByPath(path)
    if (!resolver) {
      return null
    }
    const content = readFileSync(path, 'utf-8')
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
  async scan(include: string, ignore: string[]) {
    this.sourceDiction = {}
    const files = await fg(include, {
      ignore,
    })

    files.forEach((aFilePath) => {
      const source = this.resolveSourceByPath(aFilePath)
      if (source) {
        this.sourceDiction[aFilePath] = source
      }
    })
  }

  async generateByTargetPaths(targetPaths: string[]) {
    const generations: Record<string, Generation> = {}

    targetPaths.forEach((target) => {
      const gen = this.generationResovler.resolveGeneration(target, this.generationContext)
      generations[target] = gen
    })

    Object.values(this.sourceDiction).forEach((source) => {
      source.directives.forEach((directive) => {
        generations[directive.targetPath]?.addSource(source)
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
   * @param ignore - An array of glob patterns or file paths to ignore.
   */
  watch(include: string, ignore: string[]) {
    this.watcher = chokidar.watch(include, {
      ignored: ignore,
    })
    this.watcher.on('ready', () => {
      console.log('watching files for changes...')
      if (!this.watcher) {
        return
      }
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

        const updatedPathInfoList = _quene
          .flatMap(
            ({ event, changedPath }) => {
              if (event === 'add' || event === 'change') {
                const absPath = resolvePath(changedPath)
                const source = this.resolveSourceByPath(absPath)
                return [{ absPath, source }]
              }
              else {
                return []
              }
            },
          )

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

        await Promise.allSettled(pathsNoSource.map(async (absPath) => {
          const gen = this.generationResovler.resolveGeneration(absPath, this.generationContext)
          if (!(gen instanceof RewriteTextFileGeneration)) {
            console.log('Not rewrite generation: ', absPath)
            return
          }
          if (!this.generations[absPath]) {
            Object.values(this.sourceDiction).forEach((source) => {
              if (source.directives.some(d => d.targetPath === absPath)) {
                gen.addSource(source)
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
              return od.result === d.content && od.prompt === d.prompt
            })
            if (notChangedDirective) {
              d.result = notChangedDirective.result
            }
          })
          const directivesNeedRegenerated = gen.directives.filter(d => d.result !== d.content)
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
      this.watcher.on('all', (event, changedPath) => {
        console.log(event, changedPath)
        queue.push({ event, changedPath })
        if (!running) {
          debouncedHandler()
        }
      })
    })
  }

  /**
   * Removes all listeners from watched files.
   */
  unwatch() {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = undefined
    }
  }
}
