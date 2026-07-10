// 初始化演示数据：商品库 + 三期（三种 style）+ 当前期 + 评分 + 指纹样例。
import { db, nowIso, setSetting, activatePeriod, setPeriodProducts, upsertUser, recordFingerprint, DEFAULT_SETTINGS } from './db.js';
import { computeResult, normalizePrizes } from './lottery.js';

db.exec('DELETE FROM entries; DELETE FROM tea_ratings; DELETE FROM reviews; DELETE FROM period_products; DELETE FROM tea_products; DELETE FROM periods; DELETE FROM bills; DELETE FROM fingerprints; DELETE FROM users;');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('periods','entries','tea_ratings','reviews','tea_products','period_products','bills','fingerprints','users');");

// 系统配置
setSetting('department_name', 'AIoT客户端组');
setSetting('site_name', 'AIoT客户端组生活系统');
setSetting('home_style_mode', 'follow');
setSetting('home_fixed_style', 'style1');
// 规则文案：跟随服务器默认（Markdown），使 reseed 后套用最新版规则
setSetting('rules_lottery', DEFAULT_SETTINGS.rules_lottery);
setSetting('rules_tea', DEFAULT_SETTINGS.rules_tea);

// ---- 下午茶商品库 ----
const insProduct = db.prepare(
  'INSERT INTO tea_products (name, image, descr, channel, price, qty, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const products = {};
for (const [key, name, desc, channel, price, qty] of [
  ['tiramisu', '提拉米苏', '招牌马斯卡彭，可可粉手指饼', '楼下甜品店', '32', 10],
  ['cheese', '海盐芝士奶盖', '海盐芝士盖在冷萃之上', '美团外卖', '26', 12],
  ['strawberry', '草莓蛋糕', '当季草莓 + 轻奶油', '楼下甜品店', '28', 15],
  ['coffee', '手冲耶加雪菲', '柑橘与花香的浅烘豆', '咖啡角', '20', 8],
  ['matcha', '抹茶千层', '宇治抹茶千层可丽饼', '京东', '35', 6],
  ['eggtart', '葡式蛋挞', '现烤酥皮蛋挞', '肯德基', '8', 20],
]) {
  products[key] = insProduct.run(name, null, desc, channel, price, qty, nowIso()).lastInsertRowid;
}

// ---- 期数 ----
const insPeriod = db.prepare(
  `INSERT INTO periods (title, style, lottery_enabled, tea_enabled, status, prizes, result, tea_rating_hours, tea_close_at, created_at)
   VALUES (@title, @style, @lottery, @tea, @status, @prizes, @result, @hours, @closeAt, @createdAt)`
);
const insEntry = db.prepare('INSERT INTO entries (period_id, name, number, created_at) VALUES (?, ?, ?, ?)');
const insRating = db.prepare(
  'INSERT OR IGNORE INTO tea_ratings (period_id, product_id, client_id, level, created_at) VALUES (?, ?, ?, ?, ?)'
);
const future = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

function seedRatings(periodId, productId, { good = 0, ok = 0, bad = 0 }) {
  let i = 0;
  const put = (lvl, n) => { for (let k = 0; k < n; k++) insRating.run(periodId, productId, `seed-${productId}-${i++}`, lvl, nowIso()); };
  put('good', good); put('ok', ok); put('bad', bad);
}

function seedPeriod({ title, style, lottery, tea, status, prizes, entries, productKeys = [], ratings = {}, hours = 24 }) {
  const normPrizes = normalizePrizes(prizes);
  const result = status === 'drawn' ? JSON.stringify(computeResult(entries, normPrizes)) : null;
  const pid = insPeriod.run({
    title, style, lottery: lottery ? 1 : 0, tea: tea ? 1 : 0, status,
    prizes: JSON.stringify(normPrizes), result, hours, closeAt: future(hours), createdAt: nowIso(),
  }).lastInsertRowid;
  // 与真实提交(/api/periods/:id/entries)一致：参与者同步进用户库，
  // 否则演示数据下「用户管理」会是空的（提交抽奖看似没进用户库）。
  for (const e of entries) {
    insEntry.run(pid, e.name, e.number, nowIso());
    upsertUser(e.name);
  }
  if (tea) {
    setPeriodProducts(pid, productKeys.map((k) => products[k]));
    for (const k of productKeys) if (ratings[k]) seedRatings(pid, products[k], ratings[k]);
  }
  return pid;
}

const p1 = seedPeriod({
  title: '第一期 · 开工大吉',
  style: 'style1',
  lottery: true,
  tea: true,
  status: 'open',
  prizes: [
    { name: '一等奖 · 蓝牙音箱', qty: 1 },
    { name: '二等奖 · 保温杯', qty: 2 },
    { name: '', qty: 3 },
  ],
  entries: [
    { name: '小明', number: 88 }, { name: '小红', number: 1234 }, { name: '阿强', number: 502 },
    { name: '丽丽', number: 67 }, { name: '老王', number: 3001 }, { name: '阿珍', number: 999 },
  ],
  productKeys: ['tiramisu', 'cheese', 'strawberry'],
  ratings: {
    tiramisu: { good: 9, ok: 3, bad: 1 },
    cheese: { good: 5, ok: 6, bad: 2 },
    strawberry: { good: 12, ok: 2, bad: 0 },
  },
});

const p2 = seedPeriod({
  title: '第二期 · 手绘随笔',
  style: 'style2',
  lottery: true,
  tea: true,
  status: 'drawn',
  prizes: [
    { name: '头奖 · 机械键盘', qty: 1 },
    { name: '安慰奖 · 奶茶券', qty: 2 },
  ],
  entries: [
    { name: 'Tom', number: 1500 }, { name: 'Jerry', number: 320 }, { name: '阿May', number: 7777 },
    { name: '大雄', number: 45 }, { name: '静香', number: 2048 }, { name: '胖虎', number: 600 },
    { name: '小夫', number: 911 },
  ],
  productKeys: ['coffee', 'matcha', 'eggtart'],
  ratings: {
    coffee: { good: 14, ok: 4, bad: 1 },
    matcha: { good: 8, ok: 7, bad: 3 },
    eggtart: { good: 10, ok: 5, bad: 1 },
  },
});

seedPeriod({
  title: '第三期 · 包豪斯',
  style: 'style3',
  lottery: true,
  tea: false,
  status: 'open',
  prizes: [{ name: '', qty: 1 }, { name: '', qty: 2 }],
  entries: [
    { name: '赵一', number: 12 }, { name: '钱二', number: 888 }, { name: '孙三', number: 4096 },
    { name: '李四', number: 256 }, { name: '周五', number: 1357 },
  ],
});

// ---- 评价 / 建议 ----
// 开启第一、二期的评价模块，并写入几条示例（含匿名 + 两种类型），让前台评价墙 / 后台评价管理有内容可看。
db.prepare('UPDATE periods SET review_enabled = 1 WHERE id IN (?, ?)').run(p1, p2);
const insReview = db.prepare(
  'INSERT INTO reviews (period_id, kind, name, content, created_at) VALUES (?, ?, ?, ?, ?)'
);
const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
// 捕获每条留言的 id，后面「指纹样例」按 review_id 给部分留言（含匿名）补一条对应指纹，演示指纹↔评价关联。
const reviewIds = [
  [p1, 'review', '小明', '这期奖品很给力，蓝牙音箱种草了！组织得也很用心 👍', 8],
  [p1, 'review', '', '下午茶的提拉米苏太好吃了，可惜手慢没抢到评分名额～', 26],
  [p1, 'suggestion', '阿珍', '建议下一期把开奖时间提前到周五下午，周一大家都很忙。', 42],
  [p1, 'suggestion', '', '下次能不能加点咸口的点心？甜的吃多了有点腻。', 73],
  [p2, 'review', 'Jerry', '机械键盘手感绝了，这波中奖血赚，感谢部门！', 15],
  [p2, 'suggestion', '静香', '建议下一期奖品加一个「神秘大奖」，增加点悬念感。', 55],
].map(([pid, kind, name, content, ago]) => insReview.run(pid, kind, name || null, content, minsAgo(ago)).lastInsertRowid);

// ---- 账单流水 ----
const insBill = db.prepare(
  'INSERT INTO bills (date, title, kind, amount, note, period_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
insBill.run(day(-30), '部门下午茶基金充值', 'income', 1000, '每人 100 共 10 人', null, nowIso());
insBill.run(day(-20), '第一期下午茶采购', 'expense', 86, '提拉米苏 + 芝士 + 草莓', p1, nowIso());
insBill.run(day(-10), '第二期下午茶采购', 'expense', 120, '咖啡 + 千层 + 蛋挞', p2, nowIso());
insBill.run(day(-5), '阿强垫付一次性纸杯', 'expense', 35, '阿强先垫，待报销', null, nowIso());

// ---- 指纹样例 ----
// 真实指纹由浏览器 FingerprintJS 采集（visitorId + 全量 components），演示数据里无法跑浏览器，
// 这里按同一套 { id, summary, details } 结构造几条贴近真实的样例，让后台「用户管理 → 指纹模块」
// 有东西可看（关键信号一览 + 原始全量信号 JSON）。字段形状与 web/src/fingerprint.js 保持一致。
function sampleClient({ visitorId, platform, osCpu, screen, dpr, tz, gpu, fonts, ua, ch }) {
  const details = {
    userAgent: ua,
    languages: 'zh-CN,zh,en',
    language: 'zh-CN',
    platform,
    vendor: 'Google Inc.',
    osCpu,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    touch: false,
    screen,
    colorDepth: 24,
    devicePixelRatio: dpr,
    timezone: tz,
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: gpu, version: 'WebGL 1.0' },
    fonts,
    canvasHash: visitorId.slice(0, 16),
    audioHash: visitorId.slice(4, 20),
    clientHints: ch,
    visitorId,
    confidence: { score: 0.94, comment: 'Suitable for most use cases' },
    fpVersion: '5.2.0',
    // 原始全量信号（截取部分典型 components，展示「原始全量信号 JSON」）
    fingerprintjs: {
      fonts: { value: fonts, duration: 41 },
      screenResolution: { value: screen.split('x').map(Number), duration: 0 },
      timezone: { value: tz, duration: 1 },
      platform: { value: platform, duration: 0 },
      canvas: { value: { winding: true, geometry: 'data:hash…', text: 'data:hash…' }, duration: 33 },
      audio: { value: 124.0434808, duration: 12 },
      webGlBasics: { value: { version: 'WebGL 1.0', vendor: 'Google Inc. (NVIDIA)', renderer: gpu }, duration: 8 },
      languages: { value: [['zh-CN'], ['zh'], ['en']], duration: 0 },
      deviceMemory: { value: 8, duration: 0 },
      hardwareConcurrency: { value: 8, duration: 0 },
    },
  };
  return { id: visitorId, summary: `${platform} · ${screen}@${dpr}x · ${tz} · ${gpu.slice(0, 40)}`, details };
}
function sampleServer(ip, ua) {
  return {
    ip, ua, acceptLanguage: 'zh-CN,zh;q=0.9,en;q=0.8', acceptEncoding: 'gzip, deflate, br',
    referer: 'http://localhost/', clientHints: { 'sec-ch-ua-platform': '"Windows"' }, serverTime: nowIso(),
  };
}

const winPC = {
  visitorId: 'a1b2c3d4e5f60718', platform: 'Win32', osCpu: '', screen: '1920x1080', dpr: 1,
  tz: 'Asia/Shanghai', gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)',
  fonts: ['Arial', 'Calibri', 'Consolas', 'Microsoft YaHei', 'SimSun', 'SimHei', 'Segoe UI'],
  ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  ch: { platform: 'Windows', platformVersion: '15.0.0', architecture: 'x86', bitness: '64', model: '', fullVersionList: ['Chromium 126.0.6478.127', 'Google Chrome 126.0.6478.127'] },
};
const mac = {
  visitorId: 'f0e1d2c3b4a59687', platform: 'MacIntel', osCpu: '', screen: '1512x982', dpr: 2,
  tz: 'Asia/Shanghai', gpu: 'ANGLE (Apple, Apple M2, OpenGL 4.1)',
  fonts: ['Arial', 'Helvetica', 'PingFang SC', 'Hiragino Sans GB', 'Menlo', 'Times New Roman'],
  ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  ch: null,
};
const android = {
  visitorId: '9a8b7c6d5e4f3021', platform: 'Linux armv8l', osCpu: '', screen: '915x412', dpr: 2.625,
  tz: 'Asia/Shanghai', gpu: 'Adreno (TM) 730',
  fonts: ['Roboto', 'Noto Sans CJK SC', 'Droid Sans'],
  ua: 'Mozilla/5.0 (Linux; Android 14; PGT-AN10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  ch: { platform: 'Android', platformVersion: '14.0.0', architecture: '', bitness: '', model: 'PGT-AN10', fullVersionList: ['Chromium 126.0.6478.127'] },
};

// 给几个演示用户各记一条（不同设备/动作），覆盖 lottery / rating / cancel 三种 kind。
recordFingerprint('小明', sampleClient(winPC), 'lottery', p1, sampleServer('10.12.3.45', winPC.ua));
recordFingerprint('小红', sampleClient(mac), 'lottery', p1, sampleServer('10.12.3.51', mac.ua));
recordFingerprint('小红', sampleClient(mac), 'rating', p1, sampleServer('10.12.3.51', mac.ua));
recordFingerprint('阿强', sampleClient(android), 'lottery', p1, sampleServer('172.20.8.9', android.ua));
recordFingerprint('阿强', sampleClient(android), 'cancel', p1, sampleServer('172.20.8.9', android.ua));
recordFingerprint('Tom', sampleClient(winPC), 'lottery', p2, sampleServer('10.12.3.77', winPC.ua));
// 评价对应的指纹（第 6 个参数 = 关联的 review_id）：含一条匿名留言(reviewIds[1])，演示匿名也能在「评价管理」反查设备。
recordFingerprint('小明', sampleClient(winPC), 'review', p1, sampleServer('10.12.3.45', winPC.ua), reviewIds[0]);
recordFingerprint('', sampleClient(mac), 'review', p1, sampleServer('10.12.3.51', mac.ua), reviewIds[1]);
recordFingerprint('Jerry', sampleClient(android), 'review', p2, sampleServer('172.20.8.9', android.ua), reviewIds[4]);

// 当前期（同时只有一期在线）
activatePeriod(p1);

console.log('演示数据已写入。当前期 = 第一期。期数：');
for (const r of db.prepare('SELECT id, title, style, status, is_active FROM periods ORDER BY id').all()) {
  console.log(`  #${r.id}  ${r.title}  [${r.style}]  ${r.status}${r.is_active ? '  ← 当前期' : ''}`);
}
