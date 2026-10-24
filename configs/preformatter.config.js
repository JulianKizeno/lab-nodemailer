const path = require('path')

module.exports = app => {
    app.use(require("./sass.config.js")({
        src: path.join(__dirname, '..', 'public'),
        dest: path.join(__dirname, '..', 'public'),
        sourceMap: true
    }))
}