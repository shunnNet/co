import fg from 'fast-glob'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import {
  resolve as resolvePath,
  dirname as getDirname,
  basename as getBasename,
} from 'node:path'
import chokidar from 'chokidar'
import defu from 'defu'

const extractCoImportFromContent = (content) => {
  const matchComment = content.match(/\/\/ co(?<imports>[\s\S]*?)\/\/ co-end/)
  if (matchComment) {
    return matchComment.groups.imports.split('\n').flatMap((line) => {
      const m = line.match(/import .+ from ['"](?<path>[^\s]*?)['"]/)
      return m ? [m.groups.path] : []
    })
  }
  return []
}

export const rewriteLock = {
  locked: Promise.resolve(),
}

const sanitizeContent = (content) => {
  if (content.match(/```[\s\S]*?```/)) {
    return content.replace(/```.*/g, '')
  } else {
    return content
  }
}

export const start = async (options) => {
  const _options = defu(options, {
    include: './**/*',
    ignore: ['**/node_modules/**', '**/.vscode', '**/.git/**'],
    apiKey: '',
    model: 'gpt-4o',
  })
  console.log('Co options: ', _options)
  const files = await fg(_options.include, {
    ignore: _options.ignore,
  })

  const coFilesToDeps = {
    // [coFile]: [dep1, dep2]
  }

  const depFilesDict = {
    // [depFileId]: { id, code, coFiles: [coFile1, coFile2] }
  }

  const addDepFile = (id, code, coFiles) => {
    const depFile = (depFilesDict[id] = {
      id,
      code,
      coFiles,
    })
    coFiles.forEach((coFile) => {
      if (!coFilesToDeps[coFile]) {
        coFilesToDeps[coFile] = []
      }
      if (!coFilesToDeps[coFile].find((dep) => dep.id === depFile.id)) {
        coFilesToDeps[coFile].push(depFile)
      }
    })
    return depFilesDict[id]
  }

  const updateDepFileCoFiles = (depFile, coFiles) => {
    const oldCoFiles = depFile.coFiles
    depFile.coFiles = coFiles
    oldCoFiles.forEach((coFile) => {
      const idx = coFilesToDeps[coFile].findIndex((dep) => dep.id === depFile.id)
      coFilesToDeps[coFile].splice(idx, 1)
      if (!coFilesToDeps[coFile].length) {
        delete coFilesToDeps[coFile]
      }
    })
    coFiles.forEach((coFile) => {
      if (!coFilesToDeps[coFile]) {
        coFilesToDeps[coFile] = []
      }
      if (!coFilesToDeps[coFile].find((dep) => dep.id === depFile.id)) {
        coFilesToDeps[coFile].push(depFile)
      }
    })
  }

  files.forEach((aFile) => {
    const content = readFileSync(aFile, 'utf-8')
    const importPaths = extractCoImportFromContent(content)
    if (!importPaths.length) {
      return
    }
    const depFilePath = resolvePath('.', aFile)
    const coFilePathListRelative = importPaths
    const coFilePathListAbsolute = coFilePathListRelative.map((p) => {
      return resolvePath(getDirname(depFilePath), p)
    })

    const depFile = (depFilesDict[depFilePath] = {
      id: depFilePath,
      code: content,
      coFiles: coFilePathListAbsolute,
    })

    coFilePathListAbsolute.forEach((coFile) => {
      coFilesToDeps[coFile] ||= []
      coFilesToDeps[coFile].push(depFile)
    })
  })

  for (const [coFilePath, deps] of Object.entries(coFilesToDeps)) {
    const filename = getBasename(coFilePath)
    const fileContent = await generateFileContents(filename, deps, _options)
    console.log(`Write file content for ${coFilePath}`)
    console.log(fileContent)
    mkdirSync(getDirname(coFilePath), { recursive: true })
    writeFileSync(coFilePath, fileContent)
  }

  // One-liner for current directory
  const watcher = chokidar.watch(_options.include, {
    ignored: _options.ignore,
  })
  const removeDepFile = (depFile) => {
    depFile.coFiles.forEach((coFile) => {
      const idx = coFilesToDeps[coFile].findIndex((dep) => dep.id === depFile.id)
      coFilesToDeps[coFile].splice(idx, 1)
    })
    delete depFilesDict[depFile.id]
  }
  const clearCoFilesIfNoDeps = () => {
    for (const [coFile, deps] of Object.entries(coFilesToDeps)) {
      if (deps.length === 0) {
        console.log('no more dep for this co file', coFile)
        delete coFilesToDeps[coFile]
      }
    }
  }
  watcher.on('ready', () => {
    watcher.on('all', async (event, changedPath) => {
      console.log('event', event, changedPath)
      const absPath = resolvePath(changedPath)
      let depFile = depFilesDict[absPath]
      switch (event) {
        case 'add':
        case 'change':
          console.log(`File ${absPath} has been changed`)
          const newContent = readFileSync(absPath, 'utf-8')
          const importPaths = extractCoImportFromContent(newContent)

          const isCoFile = Boolean(coFilesToDeps[absPath])

          if (isCoFile || (!depFile && !importPaths.length)) {
            return
          }
          console.log('is depFile', changedPath)
          const needRecalculateCoFiles = []
          if (!importPaths.length) {
            console.log('no co files dep in this file', changedPath)

            removeDepFile(depFile)
            clearCoFilesIfNoDeps()

            needRecalculateCoFiles.push(
              ...depFile.coFiles.filter((coFile) => coFilesToDeps[coFile])
            )

            if (!needRecalculateCoFiles.length) {
              return
            }
          } else {
            const coFilePathListRelative = importPaths
            const coFilePathListAbsolute = coFilePathListRelative.map((p) => {
              return resolvePath(getDirname(absPath), p)
            })
            if (!depFile) {
              depFile = addDepFile(absPath, newContent, coFilePathListAbsolute)
            }

            updateDepFileCoFiles(depFile, coFilePathListAbsolute)

            depFile.code = newContent

            needRecalculateCoFiles.push(...depFile.coFiles)
          }
          await Promise.all(
            needRecalculateCoFiles.map(async (coFile) => {
              const filename = getBasename(coFile)
              const depFiles = coFilesToDeps[coFile]
              const fileContent = await generateFileContents(filename, depFiles, _options)
              console.log(`Write file content for ${filename}`)
              mkdirSync(getDirname(coFile), { recursive: true })
              writeFileSync(coFile, fileContent)
            })
          )

          break

        case 'unlink':
          console.log(`File ${absPath} has been removed`)

          if (!depFile) {
            return
          }
          removeDepFile(depFile)
          clearCoFilesIfNoDeps()
          // const needRegenerate = depFile.coFiles.filter((coFile) => coFilesToDeps[coFile])
          break
        default:
          break
      }
    })
  })
}

const doCompletion = (prompt, { apiKey, model }) => {
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })
    .then((res) => res.json())
    .then((res) => sanitizeContent(res.choices[0].message.content))
}

const generateFileContents = (filename, dependencies, options) => {
  const _options = defu(options, {
    model: 'gpt-3.5-turbo',
  })
  console.log(_options)
  console.log(`Generate file content for ${filename}`)
  console.log(
    `Based on dependencies`,
    dependencies.map((d) => d.id)
  )
  const prompt = `We have files import a file not been written, I need you write the imported file contents which fulfill the usage requirements in other importer files. You must only return file content without any word.

${dependencies
  .map(
    (dep, i) => `---importer file ${i + 1}---
name: ${dep.id}
content: ${dep.code}
`
  )
  .join('\n')}

---imported file---
filename: ${filename}
content:
`
  return doCompletion(prompt, {
    apiKey: _options.apiKey,
    model: _options.model,
  })
}

const rewriteFileContent = (filename, currentFileContent, importerId) => {
  console.log(`rewrite for ${importerId}`)
  const issuer = collection[filename][importerId]
  const prompt = `We have a importer file which import the existing imported file, I need you rewrite the imported file contents which fulfill the usage requirements in the importer files. You must only return file content without any word.

---importer file ---
name: ${issuer.id}
content: ${issuer.code}

---imported file---
filename: ${filename}
content: ${currentFileContent}

---rewrited file---
content:
`
  return doCompletion(prompt)
}
