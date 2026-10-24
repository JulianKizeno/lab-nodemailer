const test = require('node:test');
const assert = require('node:assert/strict');
const { load, response, router } = require('./helpers.cjs');
test('confirmation codes use cryptographic randomness; credentials and HTML never reach logs/mail markup', async () => {
  const routes = router(); const users = [], mail = [], logs = [];
  const model = { findOne: () => Promise.resolve(null), create: user => { users.push(user); return Promise.resolve(user); } };
  const fakeMath = Object.create(Math); fakeMath.random = () => { throw Error('insecure random generator used'); };
  load('routes/auth.routes.js', {
    express: { Router: () => routes }, passport: { authenticate: () => () => {} }, '../models/user.model': model,
    bcrypt: { genSaltSync: () => 'salt', hashSync: () => 'hash' },
    '../configs/nodemailer.config': { sendMail(options) { mail.push(options); return Promise.resolve({}); } }
  }, { Math: fakeMath, console: { log(...args) { logs.push(args); }, error() {} } });
  const signup = routes.routes.find(route => route.method === 'post' && route.args[0] === '/signup');
  for (let n = 0; n < 2; n++) {
    const res = response(); res.redirect = () => {};
    signup.args[1]({ body: { username: '<img src=x onerror=attack()>', email: 'alice@example.test', password: 'do-not-log-me' } }, res, error => { throw error; });
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.equal(users.length, 2); assert.match(users[0].confirmationCode, /^[a-f0-9]{64}$/);
  assert.notEqual(users[0].confirmationCode, users[1].confirmationCode);
  assert.equal(mail[0].html, undefined); assert.ok(mail[0].text.includes(users[0].confirmationCode));
  assert.equal(JSON.stringify(logs).includes('do-not-log-me'), false);
});
