import { test, expect } from 'vitest'
import { MdResolver } from '../src/directive-resolvers/mdResolver'
import { SourceDirective } from '../src/directive-resolvers/types'

test('Should resolve single import', () => {
  const resolver = new MdResolver()
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
  const resolver = new MdResolver()
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
  const resolver = new MdResolver()
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
  const resolver = new MdResolver()
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
  const resolver = new MdResolver()
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
