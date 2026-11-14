const { test } = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const basic = fs.existsSync(path.join(root, 'starter-code'))
const base = basic ? path.join(root, 'starter-code') : root

function load(file, mocks) {
    const context = { module: { exports: {} }, require(name) {
        if (Object.hasOwn(mocks, name)) return mocks[name]
        throw new Error('Unexpected dependency: ' + name)
    }, process: { env: { SESSION_SECRET: 'x'.repeat(64) } }, console }
    vm.runInNewContext(fs.readFileSync(path.join(base, file), 'utf8'), context, { filename: file })
    return { value: context.module.exports, context }
}
function routes(file, model = {}) {
    const handlers = {}
    const router = {}
    for (const method of ['get', 'post', 'use']) router[method] = (url, ...fn) => { handlers[method + ' ' + url] = fn }
    const mocks = { express: { Router: () => router }, passport: { authenticate: () => () => {} },
        '../configs/nodemailer.config': {}, crypto: require('crypto'), bcrypt: { genSaltSync: () => '', hashSync: () => 'hash', compareSync: (password, hash) => password === 'correct' && hash === 'hash' } }
    const modelName = file.includes('products') ? 'product.model' : file.includes('cart') ? 'cart.model' : basic ? 'user-model' : fs.existsSync(path.join(base, 'models/User.model.js')) ? 'User.model' : 'user.model'
    mocks['../models/' + modelName] = model
    load(file, mocks)
    return handlers
}
function response() {
    return { code: 200, status(code) { this.code = code; return this }, json(value) { this.body = value }, render(view, value) { this.body = value }, redirect(url) { this.location = url } }
}
test('signup rejects query operators, arrays and non-string passwords before database access', () => {
    const h = routes('routes/auth.routes.js', { findOne() { throw new Error('Untrusted input reached MongoDB') } })['post /signup'][0]
    const field = basic ? 'user' : 'username'
    for (const value of [{ $ne: null }, ['admin'], 123, null]) {
        h({ body: { [field]: value, password: 'password' } }, response())
        h({ body: { [field]: 'admin', password: value } }, response())
    }
})
if (basic) {
    test('login rejects operator objects and compares the actual supplied password', async () => {
        let queried = 0
        const handlers = routes('routes/auth.routes.js', { findOne() { queried++; return Promise.resolve({ password: 'hash' }) } })
        const login = handlers['post /login'][0]
        login({ body: { user: { $ne: null }, password: 'correct' } }, response())
        assert.equal(queried, 0)
        for (const password of ['wrong', 'correct']) {
            const req = { body: { user: 'admin', password }, session: {} }; const res = response()
            login(req, res)
            await new Promise(resolve => setImmediate(resolve))
            assert.equal(Boolean(req.session.currentUser), password === 'correct')
            assert.equal(res.location, password === 'correct' ? '/' : undefined)
        }
    })
}
if (fs.existsSync(path.join(base, 'configs/passport.config.js'))) {
    test('session configuration fails closed and rejects operator objects in local strategy', () => {
        let config, strategy, queried = 0
        const mocks = { 'express-session': value => { config = value; return () => {} }, bcrypt: {},
            passport: { serializeUser() {}, deserializeUser() {}, use(value) { strategy = value }, initialize() {}, session() {} },
            'passport-local': { Strategy: function (options, callback) { this.verify = callback } },
            'connect-flash': () => () => {}, '../models/user.model': { findOne() { queried++ } } }
        const { value: configure, context } = load('configs/passport.config.js', mocks)
        const app = { use() {}, get: () => 'production' }
        configure(app)
        assert.equal(config.cookie.secure, true)
        assert.equal(config.cookie.httpOnly, true)
        assert.equal(config.cookie.sameSite, 'lax')
        assert.equal(config.saveUninitialized, false)
        let rejected = false
        strategy.verify({}, { $ne: null }, 'password', (err, user) => { rejected = user === false })
        assert.equal(rejected, true); assert.equal(queried, 0)
        for (const secret of [undefined, '', 'short']) {
            context.process.env.SESSION_SECRET = secret
            assert.throws(() => configure(app), /SESSION_SECRET/)
        }
    })
}
if (fs.existsSync(path.join(base, 'routes/products.routes.js'))) {
    test('all product mutations require an authenticated administrator', () => {
        const handlers = routes('routes/products.routes.js')
        for (const route of ['post /postProduct', 'post /:id/update', 'post /:id/delete']) {
            const guard = handlers[route][0]
            for (const [authenticated, role, expected] of [[false, null, 401], [true, 'CLIENT', 403], [true, 'ADMIN', 200]]) {
                const res = response(); let called = false
                guard({ isAuthenticated: () => authenticated, user: { role } }, res, () => { called = true })
                assert.equal(res.code, expected); assert.equal(called, expected === 200)
            }
        }
    })
    test('cart is readable only by its authenticated owner', async () => {
        let queries = 0
        const cart = routes('routes/cart.routes.js', { find(query) { queries++; assert.equal(query.owner, 'owner'); return Promise.resolve([{ item: 'private' }]) } })['get /oneCart/:id'][0]
        for (const [authenticated, id, expected] of [[false, 'owner', 401], [true, 'other', 403], [true, 'owner', 200]]) {
            const res = response()
            cart({ isAuthenticated: () => authenticated, user: { _id: 'owner' }, params: { id } }, res)
            await new Promise(resolve => setImmediate(resolve))
            assert.equal(res.code, expected)
        }
        assert.equal(queries, 1)
    })
    test('session endpoint never returns password hashes', () => {
        const handler = routes('routes/auth.routes.js')['get /loggedin'][0]
        const res = response()
        handler({ isAuthenticated: () => true, user: { _id: 'id', username: 'user', password: 'sensitive-hash', role: 'CLIENT' } }, res)
        assert.equal(res.body.username, 'user'); assert.equal('password' in res.body, false)
    })
}
