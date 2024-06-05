# rollup-plugin-co
This is a rollup plugin that can automatically generate a imported module code base on importer content.

> [!WARNING]
> In development...

## Demo
[![rollup-plugin-co-demo](https://i.ytimg.com/vi/XDy670obbZM/maxresdefault.jpg)](https://www.youtube.com/watch?v=XDy670obbZM) 

## How to play
You can now try this plugin. Here’s how to use it:

1. Clone this repo

2. run `pnpm install`

3. run `pnpm install rollup -g`

4. Paste your `OPENAI_API_KEY` to `index.js`

5. Run `pnpm start`

6. At `playground/main.js`, Import a simple function from any path with `co:` prefix, e.g: `import { sum } from co:./src/helper.js`. Use that function then save the `main.js`.

```js
// e.g
import { sum } from "co:./src/helper.js"

console.log(sum(1))

```

7. Check the `src` folder and `bundle.js`

