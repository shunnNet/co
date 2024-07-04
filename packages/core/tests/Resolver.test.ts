import { Resolver } from '../src/directive-resolvers/Resolver'
import { describe, test, expect } from 'vitest'
import { TCoOptions } from '../src/types'
import { LocalFsController } from '../src/fs/LocalFsController'
import { RewriteTextFileGeneration, WriteTextFileGeneration } from '../src/Generation'

const resolverOptions = {
  alias: {
    '~': '/root/src',
  },
}
const coOptions: TCoOptions = {
  baseDir: '/root',
  includes: ['**/*'],
  excludes: [],
  fsController: new LocalFsController(),
  generation: {
    text: {
      apiKey: 'test',
      model: 'test',
      temperature: 0,
      getPrompt: null,
    },
  },
  resolve: {
    alias: {
      '~': '/root/src',
    },
  },
}
describe('isSupportedSource', () => {
  test('Should return true if the file extension is supported', async () => {
    const resolver = new Resolver(resolverOptions)
    resolver.supportedSourceExtensions = ['js']
    const result = await resolver.isSupportedSource('test.js')
    expect(result).toBe(true)
  })
  test('Should return false if the file extension is not supported', async () => {
    const resolver = new Resolver(resolverOptions)
    resolver.supportedSourceExtensions = ['js']
    const result = await resolver.isSupportedSource('test.ts')
    expect(result).toBe(false)
  })
})

describe('resolveGeneration', () => {
  test('Should return WriteTextFileGeneration if the target file does not exist', async () => {
    const resolver = new Resolver(resolverOptions)
    resolver.fsController.exists = async () => false
    const result = await resolver.resolveGeneration('test.js', coOptions)
    expect(result).toBeInstanceOf(WriteTextFileGeneration)
  })
  test('Should return WriteTextFileGeneration if the target file does not contain any directives', async () => {
    const resolver = new Resolver(resolverOptions)
    resolver.fsController.exists = async () => true
    resolver.fsController.readFile = async () => 'test'
    const result = await resolver.resolveGeneration('test.js', coOptions)
    expect(result).toBeInstanceOf(WriteTextFileGeneration)
  })
  test('Should return RewriteTextFileGeneration if the target file contains directives', async () => {
    const resolver = new Resolver(resolverOptions)
    resolver.fsController.exists = async () => true
    resolver.fsController.readFile = async () => `
// co-target
test
// co-target-end`
    const result = await resolver.resolveGeneration('test.js', coOptions)
    expect(result).toBeInstanceOf(RewriteTextFileGeneration)
  })
  test('Should contain correct result in RewriteTextFileGeneration', async () => {
    const resolver = new Resolver(resolverOptions)
    const prompt = 'this is a prompt'
    resolver.fsController.exists = async () => true
    resolver.fsController.readFile = async () => `
// co-target${prompt}
test 1
// co-target-end
// co-target${prompt}
test 2
// co-target-end
<!-- co-target ${prompt}-->
test 3
<!-- co-target-end -->
`
    const result = await resolver.resolveGeneration('test.js', coOptions) as RewriteTextFileGeneration
    expect(result).toBeInstanceOf(RewriteTextFileGeneration)
    expect(result.directives).toEqual([
      {
        index: 0,
        content: 'test 1\n',
        prompt: 'this is a prompt',
        resolver: resolver,
        result: '',
      },
      {
        index: 1,
        content: 'test 2\n',
        prompt: 'this is a prompt',
        resolver: resolver,
        result: '',
      },
      {
        index: 2,
        // TODO: Not aligned with other directives
        content: '\ntest 3\n',
        prompt: 'this is a prompt',
        resolver: resolver,
        result: '',
      },
    ])
  })
})

describe('rewriteGeneration', () => {
  test('Should rewrite the content correctly', () => {
    const resolver = new Resolver(resolverOptions)
    const content1 = 'test 1'
    const content2 = 'test 2'
    const content = `
// co-target this is a prompt
${content1}// co-target-end
<!-- co-target this is a prompt-->${content2}<!-- co-target-end -->
`
    const rewrite1 = 'test 3'
    const result1 = resolver.rewriteGeneration(content, 0, rewrite1)
    const expect1 = content.replace(content1, rewrite1)
    expect(result1).toBe(expect1)
    const rewrite2 = 'test 4'
    const result2 = resolver.rewriteGeneration(result1, 1, rewrite2)
    const expect2 = result1.replace(content2, rewrite2)
    expect(result2).toBe(expect2)
  })
})

describe('ensureAbsolutePath', () => {
  test('Throw error if baseFileName does not have extension', () => {
    const resolver = new Resolver(resolverOptions)
    expect(() => resolver.ensureAbsolutePath('test', 'test')).toThrowError('baseFileName must have extension')
  })
  test('Should return absolute path if relatedPath has extension', () => {
    const resolver = new Resolver(resolverOptions)
    const result = resolver.ensureAbsolutePath('/root/parent.js', 'child.js')
    expect(result).toBe('/root/child.js')
  })

  test('Should return absolute path if relatedPath contain alias in path', () => {
    const resolver = new Resolver(resolverOptions)
    const result = resolver.ensureAbsolutePath('/root/parent.js', '~/child.js')
    expect(result).toBe('/root/src/child.js')
  })

  test('Should return absolute path if relatedPath does not have extension but include co-ext query', () => {
    const resolver = new Resolver(resolverOptions)
    const result = resolver.ensureAbsolutePath('/root/parent.js', 'child?co-ext=js')
    expect(result).toBe('/root/child.js')
  })
  test('Should return absolute path of index file if relatedPath does not have extension but include co-ext and co-index query', () => {
    const resolver = new Resolver(resolverOptions)
    const result = resolver.ensureAbsolutePath('/root/parent.js', 'child?co-ext=js&co-index')
    expect(result).toBe('/root/child/index.js')
  })
  test('Should return absolute path with .txt extension anyway if no query and no extension', () => {
    const resolver = new Resolver(resolverOptions)
    const result = resolver.ensureAbsolutePath('/root/parent.js', 'child')
    expect(result).toBe('/root/child.txt')
  })
})
