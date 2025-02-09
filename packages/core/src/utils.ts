// NOTE: As import.meta.resolve is not supported in Node.js under 20.2.0,
// Didn't find easy way to implement isNodeModule function for both cjs and esm currently.
// export const isNodeModule = (path: string) => {
//   return import.meta.resolve(path).includes('node_modules')
// }

export const debounce = (func: CallableFunction, delay: number) => {
  let timeoutId: NodeJS.Timeout | null = null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (...args: any[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

export function ensureArray<T>(value?: T | T[]): T[] {
  return Array.isArray(value) ? value : !value ? [] : [value]
}

export function clearCoComment(code: string) {
  const patterns = [
    /\/\/ @co:.*\n?/g,
    /\/\/ @co-source:.*\n?/g,
    /\/\/ @co-target:.*\n?/g,
    /<!--\s@co:\s-->.*\n?/g,
    /<!--\s@co-source:.*\n?/g,
    /<!--\s@co-target:(?<prompt>.*)-->.*\n?/g,
    /\n?\/\/ @co-end.*/g,
    /\n?<!--\s@co-end\s-->.*/g,
    /\n?\/\/\s@co-target-end.*/g,
    /\n?<!--\s@co-target-end\s-->.*/g,
    /\n?.*@aicss-all.*/,
    /\n?.*@aicss-scope.*/,
  ]
  return patterns.reduce((acc, pattern) => acc.replace(pattern, ''), code)
}
