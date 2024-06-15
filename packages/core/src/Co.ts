import { DirectiveResolver } from './directive-resolvers/types'
import { JsResolver } from './directive-resolvers/JsResolver'
import { Graph } from './Graph'
import { LLMBuilder, TLLMOptions } from './builders/llm'
import fg from 'fast-glob'
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs'
import {
  resolve as resolvePath,
  dirname as getDirname,
} from 'node:path'
import chokidar from 'chokidar'

export class Co {
  resolver: DirectiveResolver
  graph: Graph
  builder: LLMBuilder
  watcher?: chokidar.FSWatcher

  constructor(options: TLLMOptions) {
    this.resolver = new JsResolver()
    this.graph = new Graph()
    this.builder = new LLMBuilder(options)
    this.watcher = undefined
  }

  /**
   * Scans the specified files and adds dependencies to the graph based on the directives found in the files.
   * @param include - The glob pattern to match the files to be scanned.
   * @param ignore - An array of glob patterns to exclude files from being scanned.
   */
  async scan(include: string, ignore: string[]) {
    const files = await fg(include, {
      ignore,
    })

    files.forEach((aFilePath) => {
      const content = readFileSync(aFilePath, 'utf-8')
      const directives = this.resolver.resolve(content, { filename: aFilePath })

      if (!directives.length) {
        return
      }

      this.graph.addDependencyByRequester(
        {
          id: aFilePath,
          code: content,
          targetIds: directives.map(d => d.path),
        },
      )
    })
  }

  /**
   * Builds the graph by asynchronously building each branch and writing the content to a file.
   * @returns {Promise<void>} A promise that resolves when all branches have been built and written to files.
   */
  async build() {
    await Promise.allSettled(
      this.graph
        .getAllBranches()
        .map(async (branch) => {
          try {
            const content = await this.builder.build({
              id: branch.id,
              requesters: branch.requesters,
            })
            console.log('write: ', branch.id)
            mkdirSync(getDirname(branch.id), { recursive: true })
            writeFileSync(branch.id, content)
          }
          catch (e) {
            console.error(e)
            console.warn('Failed to build', branch.id)
          }
        }),
    )
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
        switch (event) {
          case 'add':
          case 'change': {
            const content = readFileSync(absPath, 'utf-8')
            const directives = this.resolver.resolve(content, { filename: absPath })
            if (directives.length) {
              const targetIds = directives.map(d => d.path)
              const requester = {
                id: absPath,
                code: content,
                targetIds,
              }
              this.graph.addDependencyByRequester(requester)
              targetIds.map(async (targetId) => {
                const branch = this.graph.getBranchByTargetId(targetId)
                if (!branch) {
                  return
                }
                try {
                  const content = await this.builder.build(branch)
                  console.log('write: ', branch.id)
                  mkdirSync(getDirname(branch.id), { recursive: true })
                  writeFileSync(branch.id, content)
                }
                catch (e) {
                  console.error(e)
                  console.warn('Failed to build', branch.id)
                }
              })
            }
            else {
              this.graph.removeDependencyByRequesterId(absPath)
            }
            break
          }
          case 'unlink':
            console.log('remove: ', absPath)
            this.graph.removeDependencyByRequesterId(absPath)
            break
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
