const { getCo } = require('./utils.cjs')

const co = getCo()

async function watch() {
  await co.scan()
  co.watch()
}
async function run() {
  await co.scan()
  co.generate()
}
async function clear() {
  await co.clear()
}
module.exports = {
  watch,
  run,
  clear,
}
