const fs = require('fs')
const path = require('path')
const sass = require('sass')

// Compile trusted application styles at startup, never paths supplied by a request.
module.exports = ({ src, dest = src }) => {
    const compileDirectory = directory => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const source = path.join(directory, entry.name)
            if (entry.isDirectory()) compileDirectory(source)
            else if (/\.s[ac]ss$/i.test(entry.name) && !entry.name.startsWith('_')) {
                const output = path.join(dest, path.relative(src, source).replace(/\.s[ac]ss$/i, '.css'))
                fs.mkdirSync(path.dirname(output), { recursive: true })
                fs.writeFileSync(output, sass.compile(source).css)
            }
        }
    }
    compileDirectory(src)
    return (req, res, next) => next()
}
