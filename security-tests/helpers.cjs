const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function load(relative, mocks = {}, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', relative), 'utf8'), {
    module, exports: module.exports, __dirname: path.dirname(path.join(__dirname, '..', relative)),
    require: name => Object.prototype.hasOwnProperty.call(mocks, name) ? mocks[name] : require(name),
    Buffer, console: { log() {}, error() {} }, process: { env: {} }, ...globals
  }, { filename: relative });
  return module.exports;
}
function response() {
  return { code: 200, headers: {}, status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; }, set(key, value) { this.headers[key] = value; return this; } };
}
function router() {
  const routes = [];
  const instance = { routes };
  for (const method of ['get', 'post', 'use']) instance[method] = (...args) => { routes.push({ method, args }); return instance; };
  return instance;
}
module.exports = { load, response, router };
