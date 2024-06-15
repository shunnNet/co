export const isNodeModule = (path: string) => {
  return import.meta.resolve(path).includes('node_modules')
}
