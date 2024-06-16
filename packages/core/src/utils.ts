// NOTE: As import.meta.resolve is not supported in Node.js under 20.2.0,
// Didn't find easy way to implement isNodeModule function for both cjs and esm currently.
// export const isNodeModule = (path: string) => {
//   return import.meta.resolve(path).includes('node_modules')
// }
