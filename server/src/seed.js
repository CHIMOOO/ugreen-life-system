// 初始化演示数据：商品库 + 三期（三种 style）+ 当前期 + 评分。
import { db, nowIso, setSetting, activatePeriod, setPeriodProducts } from './db.js';
import { computeResult, normalizePrizes } from './lottery.js';

db.exec('DELETE FROM entries; DELETE FROM tea_ratings; DELETE FROM period_products; DELETE FROM tea_products; DELETE FROM periods; DELETE FROM bills;');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('periods','entries','tea_ratings','tea_products','period_products','bills');");

// 系统配置
setSetting('department_name', 'AIoT客户端组');
setSetting('site_name', 'AIoT客户端组生活系统');
setSetting('home_style_mode', 'follow');
setSetting('home_fixed_style', 'style1');

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
  for (const e of entries) insEntry.run(pid, e.name, e.number, nowIso());
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

// ---- 账单流水 ----
const insBill = db.prepare(
  'INSERT INTO bills (date, title, kind, amount, note, period_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
insBill.run(day(-30), '部门下午茶基金充值', 'income', 1000, '每人 100 共 10 人', null, nowIso());
insBill.run(day(-20), '第一期下午茶采购', 'expense', 86, '提拉米苏 + 芝士 + 草莓', p1, nowIso());
insBill.run(day(-10), '第二期下午茶采购', 'expense', 120, '咖啡 + 千层 + 蛋挞', p2, nowIso());
insBill.run(day(-5), '阿强垫付一次性纸杯', 'expense', 35, '阿强先垫，待报销', null, nowIso());

// 当前期（同时只有一期在线）
activatePeriod(p1);

console.log('演示数据已写入。当前期 = 第一期。期数：');
for (const r of db.prepare('SELECT id, title, style, status, is_active FROM periods ORDER BY id').all()) {
  console.log(`  #${r.id}  ${r.title}  [${r.style}]  ${r.status}${r.is_active ? '  ← 当前期' : ''}`);
}
