const path = require('path')
const { createJiti } = require('jiti')

function getCo() {
  const jiti = createJiti(__filename)
  const configPath = process.env.CO_CONFIG_PATH || path.resolve(process.cwd(), './co.config')
  const config = jiti(configPath)

  const { Co } = require('../dist/index.cjs')
  const co = new Co(config)
  return co
}

module.exports = {
  getCo,
}
