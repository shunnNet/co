# ✨ co
> [!WARNING]
> In development...

A front-end development AI writing assistant, similar to Copilot but with a different working approach, will automatically create and write the content of the referenced files in the code.


- [✨ co](#-co)
  - [Features](#features)
  - [Demo](#demo)
  - [Usage](#usage)
    - [import from multiple files](#import-from-multiple-files)
    - [path resolution](#path-resolution)
    - [side effect import](#side-effect-import)
  - [Usage in NodeJS](#usage-in-nodejs)
  - [How this works ?](#how-this-works-)
  - [License](#license)

## Features
- ✨ Auto write/rewrite when you import a file (with special comments)
- 🚀 Seamlessly integrate with Vite plugins and work with your preferred frameworks (tested with React and Vue)

## Demo
Using `gpt-4o`.

[![co-ai-demo](https://i.ytimg.com/vi/DcBn_GSMfs4/maxresdefault.jpg)](https://www.youtube.com/watch?v=DcBn_GSMfs4) 

## Usage
The recommended way using this package is `vite-plugin-co`

```sh
npm install @imaginary-ai/vite-plugin-co
```

Setup the plugin.

```ts
import { defineConfig } from 'vite'
import coPlugin from '@imaginary-ai/vite-plugin-co'

export default defineConfig({
  plugins: [
    // ...
    coPlugin({
      apiKey: 'YOUR_OPENAI_API_KEY', // required, Open AI api key

      model: 'gpt-3.5-turbo', // any OpenAI model like `gpt-4o`
      temperature: 0, // default, model temperature
      include: './**/*' // files to inspect
      ignore: ['**/node_modules/**', '**/.vscode', '**/.git/**'] // default
    }),
    // ...
  ],
})
```

Run vite server.

```sh
npm run dev
```

Then import a file (existing or not both OK) you want ask AI to write for you with comments.

```js
// co
import { sayHello } from "./path-to-file.js"
import User from "./User.js" // multiple files are OK
// co-end

sayHello()
```

AI will write `./path-to-file.js` which export `sayHello` function.

If you don't need AI to write for you and prefer to edit yourself, simply remove the import statement from the comment block.

```js
// co
import User from "./User.js" // multiple files are OK
// co-end

import { sayHello } from "./path-to-file.js" // You have the control now

sayHello()
```

### import from multiple files
When multiple files has `co` comment refer to the same file, the model will generate code fulfilled all requirements.

In the following situations, the model may generate code contain a class User with `sayHello` and `introduce` method

```js
// ./fileA.js
// co
import User from "./User.js" 
// co-end

const user = new User()
user.sayHello()
```

```js
// ./fileB.js
// co
import User from "./User.js" 
// co-end

const user = new User()
user.introduce()
```

### path resolution
Currently, only the following path formats are supported.

- ✅: relative path (with extension)
- ✅: relative path (no extension but has special query)
- ❌: node_module path
- ❌: alias path
- ❌: remote path
- ❌: virtual path

Basically, you should add the file extension to the import paths. However, in TypeScript, file extensions are usually omitted. Therefore, you can use a special query: `co-ext` to specify the file extension.

```js
// co
import { something } from "./file.js"

import something from "./file.js"

// for .ts or .tsx
import { something } from "./file?co-ext=ts"
import { component } from "./file?co-ext=tsx"

// co-end
```

### side effect import
You can also import files that cause side effects. In such cases, it is recommended to add some comments to let the model know what side effects the file will cause.

```js
// This file introduce side effect that binding a helper function "$" to globalThis
import "./file-introduce-side-effect.js"

globalThis.$("....")
```

## Usage in NodeJS
You can also use this package directly in `Node`.

```sh
npm i -D @imaginary-ai/core
```

```js
import { Co } from "@imaginary-ai/core"

const co = new Co({
  apiKey: 'OpenAI Api Key',
  model: 'model name',
  temperature: 0,
})

;(async function () {
  // scan the files
  await co.scan(
    './**/*',
    ['**/node_modules/**', '**/.vscode', '**/.git/**'],
  )
  // generate files based on scan result
  await co.build()

  // listening on file changes, should be called after co.scan
  co.watch(
    './**/*',
    ['**/node_modules/**', '**/.vscode', '**/.git/**'],
  )
})()
```



## How this works ?
`Co` will generate the referenced code based on how it is used. You don't need to think about a prompt for every generated file.

```js
// Write down how you will use the imported code.

// co
import User from "./User.js"
// co-end

const user = new User("My name", 20)

user.sayHello()
```

```js
// The generated code possibly be...
export default class User {
  constructor(name, age){
    this.name = name
    this.age = age
  }

  sayHello(){
    console.log(`Hello my name is ${this.name}`)
  }
}
```

You can also add hints in comments, which Co will consider when generating code.

```js
// Write down how you will use the imported code.

// co
import User from "./User.js"
// co-end

const user = new User("My name", 20)

user.sayHello() // Hello every one, my name is ${name}. Nice to meet you.
```

> [!INFO]
> When multiple files attempt to request the generation of the same file, these files will all be included in the prompt as the basis for generation.



## License
[MIT](./LICENSE)
