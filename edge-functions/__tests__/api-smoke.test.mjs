// Functions API 冒烟测试：用 mock env 模拟 EdgeOne Pages 运行时调用 handler。
// 不依赖 wrangler / edgeone CLI，本地 Node 22+ 即可跑。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hmacSign } from '../_lib/auth.js';

// 不真正调 GitHub，用一个 stub 注入到模块图。
// 我们对 login / 401 这两条不需要 GitHub 的路径做端到端验证。
const SECRET = 'test-secret-please-ignore';
const PASS = 'correct-horse-battery-staple';
const PASS_HASH = await hmacSign(PASS, SECRET);

const env = {
  GITEE_TOKEN: 'fake-token',
  GITEE_OWNER: 'suwei8',
  GITEE_REPO: '13982.com',
  GITEE_BRANCH: 'master',
  ADMIN_USER: 'admin',
  ADMIN_PASS_HASH: PASS_HASH,
  SESSION_SECRET: SECRET,
};

const loginMod = await import('../api/login.js');
const contentMod = await import('../api/content/index.js');
const siteMod = await import('../api/site.js');

const makeCtx = (request, overrideEnv) => ({ request, env: overrideEnv || env, params: {}, waitUntil: () => {}, passThroughOnException: () => {}, next: async () => new Response('not found', { status: 404 }) });
const jsonReq = (url, body, method = 'POST', headers = {}) => new Request(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body == null ? undefined : JSON.stringify(body) });

test('login: 正确账号密码返回 token + exp', async () => {
  const res = await loginMod.onRequestPost(makeCtx(jsonReq('https://x/api/login', { username: 'admin', password: PASS })));
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.ok(j.token && j.token.includes('.'), '应有签名 token');
  assert.ok(typeof j.exp === 'number' && j.exp > Math.floor(Date.now() / 1000), 'exp 应该是未来时间戳');
});

test('login: 错误密码返回 401 + 错误信息', async () => {
  const res = await loginMod.onRequestPost(makeCtx(jsonReq('https://x/api/login', { username: 'admin', password: 'wrong' })));
  assert.equal(res.status, 401);
  const j = await res.json();
  assert.match(j.error, /Invalid credentials|凭证/);
});

test('login: 缺少环境变量返回 500', async () => {
  const bad = { ...env }; delete bad.ADMIN_PASS_HASH;
  const res = await loginMod.onRequestPost(makeCtx(jsonReq('https://x/api/login', { username: 'admin', password: PASS }), bad));
  assert.equal(res.status, 500);
});

test('content: 无 token 时返回 401', async () => {
  const req = new Request('https://x/api/content?type=cases');
  const res = await contentMod.onRequestGet({ request: req, env, params: {} });
  assert.equal(res.status, 401);
});

test('site: 无 token 时返回 401', async () => {
  const req = new Request('https://x/api/site');
  const res = await siteMod.onRequestGet({ request: req, env, params: {} });
  assert.equal(res.status, 401);
});
