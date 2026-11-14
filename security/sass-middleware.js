const fs = require('fs')
const path = require('path')
const sass = require('sass')

// Compile local source files at startup, never paths supplied by a request.
module.exports = options => {
  const compile = directory => {
    if (!fs.existsSync(directory)) return
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) compile(file)
      else if (/\.s[ac]ss$/.test(entry.name) && !entry.name.startsWith('_')) {
        fs.writeFileSync(file.replace(/\.s[ac]ss$/, '.css'), sass.compile(file).css)
      }
    }
  }
  compile(options.src)
  return (req, res, next) => next()
}
