#!/usr/bin/env node

const co = require('../cli/co.cjs')
const command = process.argv[2]

// console.log('command:', command)

if (command === 'watch') {
  // console.log('✨[co] I will start watching...')
  co.watch()
}
else if (command === 'run') {
  // console.log('✨[co] I will start running...')
  co.run()
}
else if (command === 'clear') {
  co.clear()
}
