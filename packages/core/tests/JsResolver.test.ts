import { test, expect } from 'vitest'
import { JsResolver } from '../src/directive-resolvers/JsResolver'
import { SourceDirective } from '../src/directive-resolvers/types'
import { LocalFsController } from '../src/fs/LocalFsController'
import picomatch from 'picomatch'

function createResolver(targets: string[] = []) {
  const fs = new LocalFsController({
    alias: {
      '@': '/root',
    },
  })
  return new JsResolver({
    fsController: fs,
    targetMatcher: picomatch(
      targets.map(t => fs.resolveAlias('/root', t)),
    ),
  })
}
test('Should resolve single import', () => {
  const resolver = createResolver()
  const content = `
// co
import { a } from './a.js'
// co-end
`
  const results = resolver.resolve(content, { filename: '/root/test.js' })
  expect(results).toEqual({
    path: '/root/test.js',
    content: content,
    directives: [
      {
        targetPath: '/root/a.js',
        fragment: '',
      },
    ],
  },
  )
})

test('Should resolve multiple imports', () => {
  const resolver = createResolver()
  const content = `
// co
import { a } from './a.js'
import { b } from './b.js'
// co-end
`
  const results = resolver.resolve(content, { filename: '/root/test.js' })
  expect(results).toEqual({
    path: '/root/test.js',
    content: content,
    directives: [
      { targetPath: '/root/a.js', fragment: '' },
      { targetPath: '/root/b.js', fragment: '' },
    ],
  },
  )
})
// Support means that resolver should resolve the directive in these extensions correctly
// But can still resolve in other extensions
test('Should resolve .ts, .tsx, .js, .jsx, .cjs, .mjs, .vue', () => {
  const resolver = createResolver()
  const content = `
// co
import { a } from './a.js'
import { b } from './b.js'
// co-end
`
  const exts = ['ts', 'tsx', 'js', 'jsx', 'cjs', 'mjs', 'vue']
  exts.forEach((ext) => {
    const results = resolver.resolve(content, { filename: `/root/test.${ext}` })
    expect(results.directives.length).toBe(2)
  })
})
test('Should not resolve import outside of co block', () => {
  const resolver = createResolver()
  const content = `
// co
import { a } from './a.js'
// co-end
import { b } from './b.js'
`
  const result = resolver.resolve(content, { filename: '/root/test.js' })

  expect(result.directives.find(d => d.targetPath === '/root/b.js')).toBeUndefined()
})
test('Should resolve import with side effect', () => {
  const resolver = createResolver()
  const content = `
  // co
  import './a.js'
  // co-end
  `

  const result = resolver.resolve(content, { filename: '/root/test.js' })
  expect(result.directives).toEqual([
    { targetPath: '/root/a.js', fragment: '' },
  ])
})

test('Should resolve import with side effect and without side effect', () => {
  const resolver = createResolver()
  const content = `
  // co
  import './a.js'
  import { a } from './b.js'
  // co-end
  `

  const result = resolver.resolve(content, { filename: '/root/test.js' })
  expect(['/root/a.js', '/root/b.js'].every(p =>
    result.directives.find(d => d.targetPath === p),
  ))
})
test('Should resolve require', () => {
  const resolver = createResolver()
  const content = `
  // co
  require('./a.js')
  // co-end
  `

  const result = resolver.resolve(content, { filename: '/root/test.js' })
  expect(result.directives).toEqual([
    { targetPath: '/root/a.js', fragment: '' },
  ])
})

test('Should correctly resolve co-source', () => {
  const resolver = createResolver()
  const content = `
 // co-source path:/root/a.js
console.log('a')
// co-end
  `
  const result = resolver.resolve(content, { filename: '/root/test.js' })
  const item = result.directives.find(d => d.targetPath === '/root/a.js')
  expect(item).not.toBeUndefined()
  // TODO: not compatible interface SourceDirective
  expect((item as SourceDirective).fragment).toBe(`\nconsole.log('a')\n`)
})
test('Should resolve paths matches by targetMatcher', () => {
  const resolver = createResolver(['./targets/**/*.js'])
  const content = `
import { a } from '/root/targets/a.js'
import { b } from '../targets/b.js'
import { d } from '@/targets/d.js'
import { c } from '/root/not-targets/c.js'
`
  const results = resolver.resolve(content, { filename: '/root/src/source.js' })

  expect(results.directives).toEqual([
    { targetPath: '/root/targets/a.js', fragment: '' },
    { targetPath: '/root/targets/b.js', fragment: '' },
    { targetPath: '/root/targets/d.js', fragment: '' },
  ])
})
// TODO: should resolve html and css comments
