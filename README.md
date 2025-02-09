# ✨ co
> [!WARNING]
> This project is still in development, but you can try out some features.

A front-end development AI writing assistant, similar to Copilot but with a different working approach, will automatically create and write the content of the referenced files in the code.

- [✨ co](#-co)
  - [Features](#features)
  - [Demo](#demo)
    - [Vue - Write a simple page](#vue---write-a-simple-page)
    - [Vue - Write autocomplete input](#vue---write-autocomplete-input)
    - [Markdown: Generate a project](#markdown-generate-a-project)
    - [TDD](#tdd)
  - [Quick start](#quick-start)
  - [Usage](#usage)
  - [Tutorial \& Examples](#tutorial--examples)
    - [`@co:`](#co)
    - [Comment: provide more hint](#comment-provide-more-hint)
    - [Reference from multiple place](#reference-from-multiple-place)
    - [`@co-source:`](#co-source)
    - [Supported File Types and Comments](#supported-file-types-and-comments)
      - [Javascript](#javascript)
      - [Markdown](#markdown)
  - [Markdown](#markdown-1)
  - [Why `Co` ?](#why-co-)
    - [Small Issues with Copilot](#small-issues-with-copilot)
    - [How Co Is Different](#how-co-is-different)
    - [How Does Co Work?](#how-does-co-work)
    - [Use Cases and Potential of Co](#use-cases-and-potential-of-co)
      - [Prototyping](#prototyping)
      - [TDD (Test-Driven Development)](#tdd-test-driven-development)
  - [Additional: `aicss` (Experimental)](#additional-aicss-experimental)
  - [License](#license)

## Features
- ✨ Auto write/rewrite when you import a module (with special comments)
- 🌴 Generate a project by markdown
- 🛠️ TDD: auto generate implementation when writing test cases.

## Demo
Using OpenAI `gpt-4o-mini`

### Vue - Write a simple page
[![Vue demo](https://i.ytimg.com/vi/IGBJbUESEtk/maxresdefault.jpg)](https://youtu.be/IGBJbUESEtk) 

### Vue - Write autocomplete input
[![AutoComplete demo](https://i.ytimg.com/vi/Hfavj2m1o1s/maxresdefault.jpg)](https://youtu.be/Hfavj2m1o1s) 

### Markdown: Generate a project
[![Markdown demo](https://i.ytimg.com/vi/4XRZIQb3YOk/maxresdefault.jpg)](https://youtu.be/4XRZIQb3YOk) 

### TDD
[![TDD demo](https://i.ytimg.com/vi/cWDb-U3fImM/maxresdefault.jpg)](https://youtu.be/cWDb-U3fImM) 

## Quick start
Install the package.

```sh
npm install @imaginary-ai/core
```

Create `co.config.{js|ts}` in current working directory.

```ts
// co.config.ts
import { OpenAITextGenerator, defineCoConfig } from '@imaginary-ai/core'

export default defineCoConfig({
  baseDir: '.',
  includes: ['**/*.js', '**/*.ts', '**/*.md'],
  excludes: ['**/node_modules/**', '**/.vscode', '**/.git/**', '**/ai.css'],
  generator: new OpenAITextGenerator({
    apiKey: '...', // Put your OPENAI_API_KEY here
    model: 'gpt-4o-mini',
    temperature: 0,
  }),
})
```

Write some code import a function:
```ts
// @co:
import { sayHello } from "./path-to-file.js"
// @co-end

sayHello()
```

Go to terminal run `npx co run`, then `path-to-file.js` will be generated.

```ts
// path-to-file.js
export function sayHello() {
    console.log("Hello, World!");
}
```

## Usage
`Co` uses a glob pattern to scan files. If a file contains a co comment (e.g: `// @co:` and `// @co-end`), it will generate the files imported between the comments.

- `npx co run`: Scans and generates files.
- `npx co watch`: Scans and watches files based on the glob pattern. When a file containing a co comment is modified or added, it generates the files imported between the comments.
- `npx co clear`: Removes all co comments (excluding the content between the comments).

To use the co command, a `co.config.ts` file must be present in the current working directory.

You can set `CO_CONFIG_PATH` env variable to change path-to-co-config, e.g: `CO_CONFIG_PATH=/user/name/co.config.ts npx co watch`

To see the prompt `Co` send to model, set environment variable `CONSOLA_LEVEL=4`, e.g: `CONSOLA_LEVEL=4 npx co run`.

> [!WARNING]
> Use `npx co watch` carefully. There is a possibility of causing infinite model calls. This issue has been addressed, but to prevent any unexpected situations, it is recommended to monitor the terminal while using the command to see if it keeps running continuously.

## Tutorial & Examples

### `@co:`
The files imported between `// @co:` and `// @co-end` will be automatically generated and can be single or multiple.

```ts
// @co:
import { add } from "./math.js"
import { isArray } from "./utils.js"
// @co-end

isArray(add(1,2,3,4,5)) // false
```

When generating file content, the model will generate the file based on how the imported module is used.

Should generate `add` in `./math.js`, `isArray` in `./utils.js`. For example:

```ts
// math.js
export function add(...numbers) {
    return numbers.reduce((sum, number) => sum + number, 0);
}
```
```ts
// utils.js
export function isArray(value) {
    return Array.isArray(value);
}
```

When you don't need to generate files, move the import out of the comment.

```ts
// @co:
// @co-end
import { add } from "./math.js"
import { isArray } from "./utils.js"

isArray(add(1,2,3,4,5)) // false
```

Or run `npx co clear`. After ran:

```ts
import { add } from "./math.js"
import { isArray } from "./utils.js"

isArray(add(1,2,3,4,5)) // false
```

> [!NOTE] 
> File extension in `./math.js` is required. Or it will generate `.ts` file by default. (e.g: `./math` will generate `./math.ts`)

### Comment: provide more hint
Adding comments appropriately in usage locations can provide more hints to the model, potentially improving accuracy.

It's like collaborating with another engineer—they will follow your comments and usage patterns to create the module you want.

```ts
// @co:
import { sayHello } from "./utils.js"
// @co-end

sayHello("Net") // Net: Hello!
sayHello("Net", "Foo") // Net: Hello!\nFoo: Hello!
```

### Reference from multiple place
You can reference the same file from multiple places, just like you would import the same module from multiple locations.

In this case, the model will consider usage from all locations and generate the corresponding file content.

```ts
// file: test.js
// @co:
import { add } from "./math.js"
// @co-end

add(1,2,3,4,5) // 15
```

```ts
// file: test2.js
// @co:
import { substract } from "./math.js"
// @co-end

substract(5,1) // 4
```

Should generate something like:

```ts
// math.js
export function substract(a, b) {
    return a - b;
}

export function add(...numbers) {
    return numbers.reduce((sum, number) => sum + number, 0);
}
```

### `@co-source:`
Sometimes, importing may not effectively point to the corresponding file. In such cases, you can use @co-source: to specify a path. When generating that path, the code between `@co-source:` and `@co-end` will be used as context.

For example, in the following case, `./module/math.js` will be generated relative to the current file.
```ts
import { add } from "./module"

// @co-source: path=./module/math.js
add(1,2,3,4,5) // 15
// @co-end
```

`@co-source` can be used together with `@co`, and multiple groups can reference the same file simultaneously.

### Supported File Types and Comments

#### Javascript
Currently, comments in the following file types will be used as sources:
`ts`, `tsx`, `js`, `jsx`, `cjs`, `mjs`, `vue`.

In these files, the following types of comments can be included:

```ts
// @co:
...
// @co-end

// @co-source: path=./path-to-file
...
// @co-end
```

#### Markdown
Also support `.md` file. In markdown file, the following types of comments can be included:

```md
<!-- @co: -->
...
<!-- @co-end -->
```

## Markdown
Generation can be done through Markdown files(`.md`), where link references between comments will be generated. Currently, only one reference format is supported: `[text](link)`.

```md
<!-- README.md -->
Here is the directory structure of our project:

<!-- @co: -->
`[index.js](./index.js)`: Starts an Express server and listens on port 3000.
`[handler.js](./handler.js)`: Contains all request handlers under the `/api` route. It is imported by `index.js` and mounted onto Express.
<!-- @co-end -->
```

May generate files like:

```js
// index.js
const express = require('express');
const app = express();
const port = 3000;
const handler = require('./handler');

app.use('/api', handler);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
```

```js
// handler.js
const express = require('express');
const router = express.Router();

// Example request handler for GET /api/example
router.get('/example', (req, res) => {
    res.json({ message: 'This is an example response' });
});

// Add more request handlers as needed
router.get('/another-example', (req, res) => {
    res.json({ message: 'This is another example response' });
});

module.exports = router;
```


## Why `Co` ?

### Small Issues with Copilot
I believe many people have used `GitHub Copilot` or similar code assistants. Personally, I use `GitHub Copilot`.

The feature I use most frequently in `GitHub Copilot` is autocomplete. While editing a file, the model predicts the next content and provides suggestions.

This truly deserves the name Copilot—it always lends a helping hand just when you’re feeling exhausted from coding. I often find myself genuinely grateful for it in those moments. At this point, I’ve gotten so used to autocomplete suggestions that it feels strange when they don’t appear.

Within a single file, it often does a good job predicting what I need. However, things get a bit awkward when working across multiple files.

For example, while writing File A, I realize I need a File B containing some functions to complete my work in File A.

With `GitHub Copilot`:

1. It's best to have two tabs open simultaneously—one for File A and one for File B—to provide the model with the correct context (which might mean closing all other tabs first).
2. Switch to File B and write the functions I need. (If lucky, Copilot might guess what I want and autocomplete them for me.)
3. I return to File A and import the functions from File B.

If your Copilot behaves like mine, it’s probably most helpful in step 3, when it knows which functions you are trying to use. When I am editing File B, it is harder for Copilot to infer what I want to write based on File A.

Additionally, this disrupts my work in File A. Can it be made even smoother?

### How Co Is Different
I imagined a different kind of Copilot: one that doesn't just autocomplete within a single file but also understands your intent and writes the files you need in your workspace—almost like having two engineers working on the same project simultaneously.

That’s what `Co` does. With `Co`, the workflow becomes:

1. In File A, reference the function I want from File B.
2. Save the file.
3. If necessary, modify File B.

`Co` will automatically generate the module you need and create an appropriate interface based on how you use the function in File A.

The advantage of this approach is that you don’t need to describe what you want in natural language. Describing a feature in natural language can be more cumbersome than just writing a piece of code to demonstrate it—LLMs seem to work the same way. Using natural language forces us to translate abstract code concepts into descriptive sentences, which every software engineer knows can be frustrating.

This method may aligns more closely with how LLMs excel at autocomplete.

Of course, this isn’t meant to replace Copilot. Copilot's autocomplete is great, and its ability to generate documentation or refactor code is also useful. `Co` simply complements Copilot by addressing one of its limitations (in my opinion).

### How Does Co Work?
From an AI perspective, it uses a simple prompt and makes a single request—no agent-based techniques are involved.

```md
We have "source files" reference a file not been written, I need you write the "referenced file" contents which fulfill the usage requirements in other source files. You must only return file content without any word.

${sourceFileContents}

---referenced file---
filename: ${this.path}
content:

```

### Use Cases and Potential of Co

#### Prototyping
`Co` is great for quickly generating module interfaces while keeping you in your workflow. Of course, the generated code won’t be perfect—it will still require some manual refinement. An ideal workflow might look like this:

```md
> Edit Module A  
> Import module B in A and use it as if it’s already implemented.  
> Complete Module A.  
> Edit Module B.  
> Import module C in B and use it as if it’s already implemented.  
> Complete Module B.  
> Edit Module C.  
> ....  
```

#### TDD (Test-Driven Development)
This workflow is actually quite similar to **TDD**: define how something should be used before implementing it.

With `Co`, you can generate interface modules while writing test cases. When combined with `Copilot`, this approach can be even more powerful.


## Additional: `aicss` (Experimental)
> [!INFO]
> This is an implementation of [`ai-css-concept`](https://github.com/shunnNet/ai-css-concept). The functionality is not yet stable and is for demonstration purposes only.

`Co` supports AI-generated CSS. To enable it, set `aicss: true` in `co.config` 

```ts
// co.config.ts
import { OpenAITextGenerator, defineCoConfig } from '@imaginary-ai/core'

export default defineCoConfig({
  // ...
  aicss: true
})
```

The method is as follows:

```html
<div class="@ai:putChildrenCenterCenter @ai:beautifulBg">
  <p>Hello world</p>
</div>
```

During generation, the AI will replace class names with new ones and append the corresponding style rules in `./src/ai.css`.

```html
<div class="putChildrenCenterCenter beautifulBg">
  <p>Hello world</p>
</div>
```

```css
/* ./src/ai.css */
.putChildrenCenterCenter {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
.beautifulBg {
  background-color: #f0f0f0;
  border-radius: 8px;
  padding: 20px;
}
```

If you don't want to add `@ai:` prefix every class name, you can just `@aicss-all` in the file, then all class name in the file will be generated.

```html
<!-- @aicss-all -->
<div class="putChildrenCenterCenter beautifulBg">
  <p>Hello world</p>
</div>
```

You can add class name prefix using `@aicss-scope: name`

```html
<!-- @aicss-all -->
<!-- @aicss-scope: card -->
<div class="putChildrenCenterCenter beautifulBg">
  <p>Hello world</p>
</div>
```

Will generate something like:

```css
/* ./src/ai.css */
.card-putChildrenCenterCenter {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
.card-beautifulBg {
  background-color: #f0f0f0;
  border-radius: 8px;
  padding: 20px;
}
```

## License
[MIT](./LICENSE)
