import { Fs } from '../fs/LocalFsController'
import { TTextGenerator } from '../generators'
import { logger } from '../log'

export type TTextGenerationOptions = {
  fs: Fs
  generator: TTextGenerator
  outputPath?: string
}

export class CSSGeneration {
  fs: Fs
  generator: TTextGenerator
  outputPath: string

  constructor(options: TTextGenerationOptions) {
    this.fs = options.fs
    this.generator = options.generator
    this.outputPath = this.fs.resolve(options.outputPath || './src/ai.css')
  }

  async generate(targetPath: string[], outputPath?: string) {
    const _outputPath = this.fs.resolve(outputPath || this.outputPath)
    let cssContent = await this.fs.readFile(_outputPath)
    const originalContent = cssContent

    await Promise.allSettled(targetPath.map(async (targetPath) => {
      let source = await this.fs.readFile(targetPath)
      const all = source.includes('@aicss-all')
      if (!source.includes('@ai:') && !all) {
        logger.debug('No @ai: found in file: ', targetPath)
        return
      }
      const matchScope = source.match(/@aicss-scope: (?<scope>.+)/)
      const scope = matchScope?.groups?.scope || ''

      const groups = extractStyleInfos(
        await this.generator.build(this.getPrompt(source, { scope, all })),
      ) as { original: string, new: string, rules: string }[]
      const rules = groups.map(({ new: newName, rules }) => `.${newName} {\n${rules}\n}`).join('\n')

      groups.forEach(({ original, new: newName }) => {
        // console.log('replace: ', original, newName)
        source = source
          .replace(original.replace('originalName:', ''), newName)
          .replace('@ai:', '')
      })
      logger.info('Write file for css: ', targetPath)
      await this.fs.writeFile(targetPath, source)
      cssContent += '\n' + rules
    }))
    if (originalContent !== cssContent) {
      logger.info('Writing css file: ', _outputPath)
      await this.fs.writeFile(_outputPath, cssContent)
    }
  }

  getPrompt(code: string, options: { scope?: string, all?: boolean }) {
    const { scope, all } = options
    const prefix = scope ? `class name prefix: ${scope}` : ''
    const exampleClassName = prefix ? `${scope}-a50pxSquare` : 'a50pxSquare'
    const allHint = all ? '' : ' only for class name start with "@ai:"'
    return `I will give a code include css class name, write the style rules which fulfill their functionalities and rewrite class name appropriatly${allHint}, you must answer style rules by the following format with no other words.
${prefix}
code: ${code}

--- example ---
/* originalName:a50pxSquare */
.${exampleClassName} {
  width: 50px;
  height: 50px;
}

--- output ---

`
  }
}

function extractStyleInfos(content: string) {
  const matched = content.match(/```css\n([\s\S]+?)```/g)
  if (matched) {
    content = matched.map(m => m.replace(/```css\n|```/g, '')).join('\n')
  }

  // extract original name and new name
  return [...content.matchAll(/\/\* (?<original>[\s\S]+?) \*\/\n\.(?<new>.+?) {\n(?<rules>.+?)\n}/gs)]
    .map(m => m.groups)
}
