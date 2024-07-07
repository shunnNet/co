import { expect, test, describe, vi, type Mock } from 'vitest'

import { TTextGenerationOptions, WriteTextFileGeneration } from '../src/generations/TextGeneration'
import { LocalFsController } from '../src/fs/LocalFsController'
import { TBuilder } from '../src/builders/types'
import { FsController } from '../src'

function createBuilder(result: string) {
  return {
    build: vi.fn(async () => result),
  } as unknown as TBuilder<string>
}
function createOptions(options: {
  fs?: FsController
  getPrompt?: () => string
  buildResult?: string
} = {}): TTextGenerationOptions {
  return {
    fs: options.fs || new LocalFsController({
      alias: {
        '~': '/root/src',
      },
    }),
    apiKey: 'test',
    model: 'test',
    temperature: 0,
    getPrompt: options.getPrompt,
    builder: createBuilder(options.buildResult || 'test'),
  }
}
function createFs(overwrite: Record<string, Mock> = {}) {
  return {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    exists: vi.fn(),
    resolvePath: vi.fn(),
    resolveAlias: vi.fn(),
    getDirname: vi.fn(),
    getExtname: vi.fn(),
    watch: vi.fn(),
    unwatch: vi.fn(),
    glob: vi.fn(),
    ...overwrite,
  }
}

describe('WriteTextFileGeneration', () => {
  test('Should generate prompt from sources', async () => {
    const generationOptions = createOptions()
    const targetPath = '/root/target/test.js'
    const sourcePath = '/root/src/test.js'
    const sourceContent = 'test content'
    const gen = new WriteTextFileGeneration(targetPath, generationOptions)
    gen.addSources([
      {
        path: sourcePath,
        content: sourceContent,
        directives: [
          { targetPath: targetPath, fragment: '' },
          { targetPath: '/root/path-to-any-place/utils.js', fragment: '' },
        ],
      },
    ])
    const prompt = gen.getPrompt()
    expect(prompt).toBe(`We have "source files" reference a file not been written, I need you write the "referenced file" contents which fulfill the usage requirements in other source files. You must only return file content without any word.

---source file---
name: ${sourcePath}
content: ${sourceContent}

---referenced file---
filename: ${targetPath}
content:
`)
  })
  test('Should generate prompt from sources with fragment', async () => {
    const generationOptions = createOptions()
    const targetPath = '/root/target/test.js'
    const sourcePath = '/root/src/test.js'
    const sourceContent = 'test content'
    const sourceFragment = 'test fragment'
    const gen = new WriteTextFileGeneration(targetPath, generationOptions)
    gen.addSources([
      {
        path: sourcePath,
        content: sourceContent,
        directives: [
          { targetPath: targetPath, fragment: sourceFragment },
          { targetPath: targetPath, fragment: sourceFragment },
        ],
      },
    ])
    const prompt = gen.getPrompt()
    expect(prompt).toBe(`We have "source files" reference a file not been written, I need you write the "referenced file" contents which fulfill the usage requirements in other source files. You must only return file content without any word.

---source file---
name: ${sourcePath}
content: ${sourceFragment}
---source file---
name: ${sourcePath}
content: ${sourceFragment}

---referenced file---
filename: ${targetPath}
content:
`)
  })
  test('Should correctly generate from sources', async () => {
    const mockFs = createFs({
      getDirname: vi.fn(() => '/root/target'),
    })
    const buildResult = 'test build result'
    const generationOptions = createOptions({
      buildResult,
      fs: mockFs,
    })
    const targetPath = '/root/target/test.js'
    const sourcePath = '/root/src/test.js'
    const sourceContent = 'test content'
    const gen = new WriteTextFileGeneration(targetPath, generationOptions)
    gen.addSources([
      {
        path: sourcePath,
        content: sourceContent,
        directives: [
          { targetPath: targetPath, fragment: '' },
          { targetPath: '/root/path-to-any-place/utils.js', fragment: '' },
        ],
      },
    ])
    const prompt = gen.getPrompt()
    await gen.generate()
    expect(mockFs.mkdir).toHaveBeenCalledWith('/root/target')
    expect(mockFs.writeFile).toHaveBeenCalledWith(targetPath, buildResult)
    expect(generationOptions.builder.build).toHaveBeenCalledWith({
      apiKey: generationOptions.apiKey,
      model: generationOptions.model,
      temperature: generationOptions.temperature,
      prompt,
    })
  })
})
