const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
process.env.SESSION_SECRET = 'integration-only-'.repeat(4);
process.env.SECRET = process.env.SESSION_SECRET;
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/security_' + path.basename(root) + '_' + Date.now();
process.env.DB = process.env.MONGODB_URI;
const mongoose = require(path.join(root, 'node_modules/mongoose'));
if (root.includes('nodemailer')) require.cache[require.resolve(path.join(root, 'configs/nodemailer.config'))] = { exports: { sendMail: () => Promise.resolve({}) } };
const app = require(path.join(root, 'app'));
let server;
const cookies = new Map();
async function request(url, body, jar = 'default') {
 const headers = {}; if (cookies.has(jar)) headers.cookie = cookies.get(jar);
 if (body) headers['content-type'] = 'application/json';
 const res = await fetch(`http://127.0.0.1:${server.address().port}${url}`, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
 if (res.headers.get('set-cookie')) cookies.set(jar, res.headers.get('set-cookie').split(';')[0]);
 const text = await res.text();return { status:res.status, headers:res.headers, text, json() { return JSON.parse(text) } };
}
(async () => {
 await mongoose.connection.asPromise();
 server = app.listen(0, '127.0.0.1'); await new Promise(r=>server.once('listening',r));
 const upload = root.includes('file-upload'); const shop = root.includes('kizeno-shop'); const basic = root.includes('basic-auth'); const prefix = shop?'/api':'';
 const field = basic?'user':'username';
 for (const payload of [{[field]:{$ne:null},password:'password'}, {[field]:'admin',password:{$ne:null}}]) {
  const res = await request(prefix+'/signup',payload); assert.ok(res.status<500); assert.equal(await mongoose.connection.collection('users').countDocuments({}),0);
 }
 let res = await request(prefix+'/signup',{[field]:'securityuser',password:'safe-password-123',email:'security@example.invalid'});
 assert.equal(res.status,shop?200:302,res.text);
 if(shop) assert.equal('password' in res.json(),false);
 if(upload) await request('/logout',{});
 res=await request(prefix+'/login',{[field]:'securityuser',password:'wrong'});assert.equal(res.status,shop?401:basic?200:302);
 res=await request(prefix+'/login',{[field]:'securityuser',password:'safe-password-123',email:'security@example.invalid'});assert.equal(res.status,shop?200:302,res.text);
 if(!shop) assert.equal(res.headers.get('location'),upload?'/profile':'/');
 if(shop) {
  assert.equal('password' in res.json(),false);
  const user=res.json();
  assert.equal((await request('/api/loggedin')).status,200);
  assert.equal((await request('/api/products/postProduct',{name:'injected'})).status,403);
  assert.equal((await request('/api/products/postProduct',{name:'injected'},'anonymous')).status,401);
  assert.equal((await request('/api/cart/oneCart/000000000000000000000000')).status,403);
  assert.equal((await request('/api/cart/oneCart/'+user._id)).status,200);
  await mongoose.connection.collection('users').updateOne({username:'securityuser'},{$set:{role:'ADMIN'}});
  res=await request('/api/products/postProduct',{name:'allowed',price:10});assert.equal(res.status,200,res.text);
  res=await request('/api/logout',{});assert.equal(res.status,200,res.text);
  assert.equal((await request('/api/loggedin')).status,403);
 } else if(basic) {
  assert.equal((await request('/private')).status,200);
  assert.equal((await request('/logout')).status,302);
  assert.equal((await request('/private')).status,302);
 } else if(upload) {
  assert.equal((await request('/profile')).status,200);
  assert.equal((await request('/logout',{})).status,302);
  assert.equal((await request('/profile')).status,302);
 } else if(!root.includes('roles')) {
  assert.equal((await request('/logout')).status,302);
 }
 console.log('PASS real HTTP, MongoDB, bcrypt and sessions: '+root);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(server)await new Promise(r=>server.close(r));if(mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase().catch(()=>{});await mongoose.disconnect()});
