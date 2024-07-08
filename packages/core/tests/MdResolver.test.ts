import { test, expect } from 'vitest'
import { MdResolver } from '../src/directive-resolvers/mdResolver'
import { SourceDirective } from '../src/directive-resolvers/types'
import { LocalFsController } from '../src/fs/LocalFsController'
import picomatch from 'picomatch'

function createResolver(targets: string[] = []) {
  const fs = new LocalFsController({
    alias: {
      '@': '/root',
    },
  })
  return new MdResolver({
    fsController: fs,
    targetMatcher: picomatch(
      targets.map(t => fs.resolveAlias('/root', t)),
    ),
  })
}

test('Should resolve single import', () => {
  const resolver = createResolver()
  const content = `
<!-- co -->
[ajs](./a.js)
<!-- co-end -->
`
  const results = resolver.resolve(content, { filename: '/root/test.md' })
  expect(results).toEqual({
    path: '/root/test.md',
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
<!-- co -->
[ajs](./a.js)
[bjs](./b.js)
<!-- co-end -->
`
  const results = resolver.resolve(content, { filename: '/root/test.md' })
  expect(results).toEqual({
    path: '/root/test.md',
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
test('Should resolve .md', () => {
  const resolver = createResolver()
  const content = `
<!-- co -->
[ajs](./a.js)
[bjs](./b.js)
<!-- co-end -->
`
  const exts = ['md']
  exts.forEach((ext) => {
    const results = resolver.resolve(content, { filename: `/root/test.${ext}` })
    expect(results.directives.length).toBe(2)
  })
})
test('Should not resolve import outside of co block', () => {
  const resolver = createResolver()
  const content = `
<!-- co -->
[ajs](./a.js)
<!-- co-end -->
[bjs](./b.js)
`
  const result = resolver.resolve(content, { filename: '/root/test.js' })

  expect(result.directives.find(d => d.targetPath === '/root/b.js')).toBeUndefined()
})
test('Should correctly resolve co-source', () => {
  const resolver = createResolver()
  const content = `
<!-- co-source path:/root/a.js -->
console.log('a')
<!-- co-end -->
`
  const result = resolver.resolve(content, { filename: '/root/test.md' })
  const item = result.directives.find(d => d.targetPath === '/root/a.js')
  expect(item).not.toBeUndefined()
  expect((item as SourceDirective).fragment).toBe(`\nconsole.log('a')\n`)
})

test('Should resolve paths matches by targetMatcher', () => {
  const resolver = createResolver(['./targets/**/*.js'])
  const content = `
[a](/root/targets/a.js)
[b](../targets/b.js)
[c](@/targets/d.js)
[d](/root/not-targets/c.js)
`
  const results = resolver.resolve(content, { filename: '/root/src/source.md' })

  expect(results.directives).toEqual([
    { targetPath: '/root/targets/a.js', fragment: '' },
    { targetPath: '/root/targets/b.js', fragment: '' },
    { targetPath: '/root/targets/d.js', fragment: '' },
  ])
})
