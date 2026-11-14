const path = require('path')

module.exports = app => {
    app.use(require("../security/sass-middleware.js")({
        src: path.join(__dirname, '..', 'public'),
        dest: path.join(__dirname, '..', 'public'),
        sourceMap: true
    }))
}