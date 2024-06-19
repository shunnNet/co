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
import { Generation, RewriteTextFileGeneration, WriteTextFileGeneration } from './Generation'
import { TGenerationContext } from './types'

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
  }

  protected getResolverByPath(path: string) {
    const resolver = this.resolvers.filter(r => r.isSupportedFile(path))[0]
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
      const resolver = this.getResolverByPath(target)
      if (!resolver) {
        return
      }
      const gen = resolver.resolveGeneration(target, this.generationContext)
      generations[target] = gen
    })

    Object.values(this.sourceDiction).forEach((source) => {
      source.directives.forEach((directive) => {
        generations[directive.targetPath]?.addSource(source)
      })
    })

    await Promise.allSettled(
      Object.values(generations).map(async (gen) => {
        await gen.generate()
      }),
    )

    this.generations = generations
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
      this.watcher.on('all', async (event, changedPath) => {
        console.log(event, changedPath)
        const absPath = resolvePath(changedPath)
        if (event === 'unlink') {
          if (this.sourceDiction[absPath]) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete this.sourceDiction[absPath]
          }
          else if (this.generations[absPath]) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete this.generations[absPath]
          }
          return
        }
        if (event === 'add' || event === 'change') {
          const source = this.resolveSourceByPath(absPath)
          if (source) {
            console.log('generate for source change: ', absPath)
            this.sourceDiction[absPath] = source
            const targetPaths = source.directives.map(d => d.targetPath)
            await this.generateByTargetPaths(targetPaths)
            return
          }

          if (this.sourceDiction[absPath]) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete this.sourceDiction[absPath]
          }

          const resolver = this.getResolverByPath(absPath)
          if (!resolver) {
            return
          }
          const gen = resolver.resolveGeneration(absPath, this.generationContext)
          /**
           * If it is not WriteGeneration and it is not in the this.generations
           * This means it has no source file reference, so we can ignore it.
           * */
          if (gen instanceof RewriteTextFileGeneration) {
            if (!this.generations[absPath]) {
              return
            }
            gen.addSources(this.generations[absPath].sources)

            if (this.generations[absPath] instanceof WriteTextFileGeneration) {
              console.log('rewrite: ', absPath)
              await gen.generate()
              this.generations[absPath] = gen
            }
            else if (this.generations[absPath] instanceof RewriteTextFileGeneration) {
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
            }
          }
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
