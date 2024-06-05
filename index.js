import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const id = 'co'
const OPENAI_API_KEY = ''
const generateFileContents = (filename, issuers) => {
  const prompt = `We have files import a file not been written, I need you write the imported file contents which fulfill the usage requirements in other importer files. You must only return file content without any word.

${issuers
  .map(
    (issuer, i) => `---importer file ${i + 1}---
name: ${issuer.id}
content: ${issuer.code}
`
  )
  .join('\n')}

---imported file---
filename: ${filename}
content:
`
  console.log('prompt', prompt)
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })
    .then((res) => res.json())
    .then((res) => {
      return res.choices[0].message.content
    })
}

const collection = {}

const addCollection = (id, path, code) => {
  const dependency = {
    id: path,
    code,
  }
  if (!collection[id]) {
    collection[id] = {}
  }
  collection[id][path] = dependency
}

export default () => {
  return {
    name: 'co',
    resolveId: (source, importer, options) => {
      if (!source.startsWith(`${id}:`)) {
        return
      }
      const contents = readFileSync(importer, 'utf-8')

      addCollection(source, importer, contents)

      return source
    },
    load: async (id) => {
      if (id.startsWith(`co:`) && collection[id]) {
        const issuers = Object.values(collection[id])
        const result = await generateFileContents(id.replace('co:', ''), issuers)

        // console.log('Result Files\n', result)
        console.log('Co write File...', id.replace('co:', ''))

        const outputFilePath = resolve(dirname(issuers[0].id), id.replace('co:', ''))
        writeFileSync(outputFilePath, result)
        return result
      }
      return null
    },

    watchChange(id, { event }) {
      console.log('watch changed: ', id)
    },
  }
}
