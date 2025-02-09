import { consola } from 'consola'
import { colors } from 'consola/utils'

const prefix = colors.green('✨[co]')

/* eslint-disable */
export const logger = {
  warn(...args: any[]) {
    consola.warn(prefix, colors.yellow('[WARN]'), ...args)
  },
  error(...args: any[]) {
    consola.error(prefix, colors.red('[ERROR]'), ...args)
  },
  info(...args: any[]) {
    consola.log(prefix, colors.blue('[INFO]'), ...args)
  },
  debug(...args: any[]) {
    consola.debug(prefix, '[DEBUG]', ...args)
  },
  say(...args: any[]) {
    consola.log(prefix, '[SAY]', ...args)
  },
}
