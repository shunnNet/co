# ✨ co-ai 
A front-end development AI writing assistant, similar to Copilot but with a different working approach, will automatically create and write the content of the referenced files in the code.

> [!WARNING]
> In development...

## Features
- ✨ Auto write/rewrite when you import a file (with special comments)
- 🚀 Seamlessly integrate with Vite plugins and work with your preferred frameworks (tested with React and Vue)

## Demo
Using `gpt-4o`.

[![co-ai-demo](https://i.ytimg.com/vi/DcBn_GSMfs4/maxresdefault.jpg)](https://www.youtube.com/watch?v=DcBn_GSMfs4) 

## Usage
The recommended way using this package is `vite-plugin-co`

```sh
npm install @co-ai/vite-plugin-co
```

Setup the plugin.

```ts
import { defineConfig } from 'vite'
import coPlugin from '@co-ai/vite-plugin-co'

export default defineConfig({
  plugins: [
    // ...
    coPlugin({
      model: 'gpt-3.5-turbo', // any OpenAI model like `gpt-4o`
      apiKey: 'YOUR_OPENAI_API_KEY',
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

> [!WARNING]
> Only support relative path currently

```js
// co
import { sayHello } from "./path-to-file.js"
import User from "./User.js"
// co-end
```


## License
[MIT](./LICENSE)