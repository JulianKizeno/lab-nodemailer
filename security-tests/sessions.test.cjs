const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');
function configure(env) {
  let options;
  const session = value => { options = value; return () => {}; };
  const passport = { serializeUser() {}, deserializeUser() {}, use() {}, initialize() {}, session() {} };
  const exported = load('configs/passport.config.js', {
    'express-session': session, bcrypt: {}, bcryptjs: {}, passport,
    'passport-local': { Strategy: function () {} }, 'connect-flash': () => () => {},
    '../models/user.model': {}, '../models/User.model': {},
    'connect-mongo': () => function () {}, mongoose: { connection: {} }
  }, { process: { env } });
  exported({ use() {} }); return options;
}
test('production fails closed without a strong signing secret', () => {
  assert.throws(() => configure({ NODE_ENV: 'production' }), /SESSION_SECRET/);
  assert.throws(() => configure({ NODE_ENV: 'production', SESSION_SECRET: 'weak' }), /SESSION_SECRET/);
});
test('production uses the configured secret and secure cookie policy', () => {
  const options = configure({ NODE_ENV: 'production', SESSION_SECRET: 's'.repeat(40) });
  assert.equal(options.secret, 's'.repeat(40)); assert.equal(options.resave, false);
  assert.equal(options.saveUninitialized, false); assert.equal(options.cookie.httpOnly, true);
  assert.equal(options.cookie.secure, true); assert.equal(options.cookie.sameSite, 'lax');
});
test('development uses an unpredictable secret per initialization', () => {
  const first = configure({}); const second = configure({});
  assert.ok(first.secret.length >= 32); assert.notEqual(first.secret, second.secret);
});
