import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig([
  {
    entries: [
      {
        input: './src/index.ts',
        name: 'index',
        outDir: 'dist',
      },
    ],
    externals: ['vite'], // prevent build error: "The keyword 'interface' is reserved"
    declaration: true,
    rollup: {
      emitCJS: true,
    },
  },
])
