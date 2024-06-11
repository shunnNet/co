// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'

export default [
  ...tseslint.config(
    eslint.configs.recommended, // enable eslint:recommended
    ...tseslint.configs.strict, // a superset of recommended that includes more opinionated rules which may also catch bugs.
  ),
  stylistic.configs['recommended-flat'],
]
