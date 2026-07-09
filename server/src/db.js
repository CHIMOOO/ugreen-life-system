import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

// DB 路径默认 server/data/data.sqlite；可用 CHOUJIANG_DB 覆盖（跑第二实例/隔离测试时用，
// 避免与正在运行的实例共用同一个库文件互相干扰）。
export const DB_FILE = process.env.CHOUJIANG_DB || path.join(dataDir, 'data.sqlite');
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
export const db = new DatabaseSync(DB_FILE);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  -- 系统配置（键值对），便于不同部门复用
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS periods (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    title            TEXT    NOT NULL,
    style            TEXT    NOT NULL DEFAULT 'style1',
    lottery_enabled  INTEGER NOT NULL DEFAULT 1,
    tea_enabled      INTEGER NOT NULL DEFAULT 0,
    is_active        INTEGER NOT NULL DEFAULT 0,   -- 当前期：全局至多一个
    status           TEXT    NOT NULL DEFAULT 'open',  -- open | drawn（开奖状态）
    prizes           TEXT    NOT NULL DEFAULT '[]',
    result           TEXT,
    tea_rating_hours INTEGER DEFAULT 24,
    tea_close_at     TEXT,
    created_at       TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id  INTEGER NOT NULL,
    name       TEXT    NOT NULL,
    number     INTEGER NOT NULL,
    created_at TEXT    NOT NULL,
    UNIQUE (period_id, name),
    UNIQUE (period_id, number)
  );

  -- 下午茶商品库（全局，可在每一期录入）
  CREATE TABLE IF NOT EXISTS tea_products (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    image      TEXT,
    descr      TEXT,
    channel    TEXT,   -- 录入渠道（内部，非必填）
    price      TEXT,   -- 价格（内部，非必填）
    qty        INTEGER,-- 数量（内部，非必填）
    created_at TEXT    NOT NULL
  );

  -- 期 <-> 商品 关联（某一期录入了哪些下午茶商品）
  CREATE TABLE IF NOT EXISTS period_products (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id  INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    sort       INTEGER NOT NULL DEFAULT 0,
    amount     TEXT,   -- 本期该商品的「实际金额」，默认取商品预设价
    UNIQUE (period_id, product_id)
  );

  -- 评分：按 (期, 商品, 浏览器) 唯一，防止同一浏览器重复刷
  CREATE TABLE IF NOT EXISTS tea_ratings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id  INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    client_id  TEXT    NOT NULL,
    level      TEXT    NOT NULL,   -- bad | ok | good
    created_at TEXT    NOT NULL,
    UNIQUE (period_id, product_id, client_id)
  );

  -- 用户库（按姓名聚合，无需账号密码，仅供参考统计）
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE,
    created_at TEXT    NOT NULL,
    updated_at TEXT    NOT NULL
  );

  -- 指纹采集：每次提交/评分/撤销都记一条，便于追溯
  CREATE TABLE IF NOT EXISTS fingerprints (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT,
    fp         TEXT,   -- 指纹摘要（稳定 id · 概要），便于快速查看
    ip         TEXT,   -- 服务端采集的来源 IP
    ua         TEXT,   -- 服务端采集的 User-Agent
    details    TEXT,   -- 全量信号 JSON（前端采集 + 服务端补充）
    kind       TEXT,   -- lottery | rating | cancel
    period_id  INTEGER,
    created_at TEXT    NOT NULL
  );

  -- 账单流水（总账单）。kind: income 入账/收入，expense 支出/消费。可关联某一期。
  CREATE TABLE IF NOT EXISTS bills (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    kind       TEXT    NOT NULL DEFAULT 'expense',
    amount     REAL    NOT NULL DEFAULT 0,
    note       TEXT,
    period_id  INTEGER,
    created_at TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_entries_period ON entries(period_id);
  CREATE INDEX IF NOT EXISTS idx_pp_period ON period_products(period_id);
  CREATE INDEX IF NOT EXISTS idx_ratings_pp ON tea_ratings(period_id, product_id);
  CREATE INDEX IF NOT EXISTS idx_bills_period ON bills(period_id);
`);

// 兼容旧库：缺失的列补上（幂等）
function addColumnIfMissing(table, col, decl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${decl}`);
}
addColumnIfMissing('tea_products', 'channel', 'TEXT');
addColumnIfMissing('tea_products', 'price', 'TEXT');
addColumnIfMissing('tea_products', 'qty', 'INTEGER');
addColumnIfMissing('period_products', 'amount', 'TEXT');
addColumnIfMissing('periods', 'bill_show', "TEXT DEFAULT 'inherit'"); // inherit|on|off：本期账单是否展示
addColumnIfMissing('periods', 'invalid_names', "TEXT DEFAULT '[]'"); // 被判无效的参与者（开奖后顺延用）
addColumnIfMissing('tea_ratings', 'name', 'TEXT'); // 评分者姓名（来自浏览器存储，便于归入用户库）
addColumnIfMissing('fingerprints', 'ip', 'TEXT'); // 指纹：服务端来源 IP
addColumnIfMissing('fingerprints', 'ua', 'TEXT'); // 指纹：服务端 User-Agent
addColumnIfMissing('fingerprints', 'details', 'TEXT'); // 指纹：全量信号 JSON

db.exec('CREATE INDEX IF NOT EXISTS idx_fp_name ON fingerprints(name); CREATE INDEX IF NOT EXISTS idx_ratings_name ON tea_ratings(name);');

export function nowIso() {
  return new Date().toISOString();
}

// ---------- 配置 ----------

export const STYLE_KEYS = [
  'style1', 'style2', 'style3', 'style4', 'style5', 'style6',
  'style7', 'style8', 'style9', 'style10', 'style11', 'style12',
];

export const DEFAULT_SETTINGS = {
  department_name: 'AIoT客户端组',
  site_name: 'AIoT客户端组生活系统',
  home_style_mode: 'follow', // follow | random | fixed
  home_fixed_style: 'style1',
  random_theme_ttl: '0', // 随机主题缓存时长（分钟）。>0 时所有用户在该时长内看到同一个随机主题，过期自动换一个；0=每次进入都随机
  // random_theme_current / random_theme_picked_at 是运行时缓存（当前锁定的随机主题 + 选定时刻），
  // 由 effectiveRandomStyle() 按需写入，不在此列默认值。
  tea_show_channel: '0', // 下午茶商品「录入渠道」是否对用户展示
  tea_show_price: '0', // 下午茶商品「价格」是否对用户展示
  tea_show_qty: '0', // 下午茶商品「数量」是否对用户展示
  lottery_module_enabled: '1', // 系统级：是否开放抽奖模块（关闭后用户彻底看不到抽奖及其规则）
  tea_module_enabled: '1', // 系统级：是否开放下午茶评分模块
  name_placeholder: '陈老板', // 趣味设置：抽奖姓名输入框的占位提示
  bill_module_enabled: '1', // 系统级：首页是否显示「总账单」模块
  period_bill_show: '1', // 系统级：默认是否在下午茶里显示「本期账单」（期数可覆盖）
  image_quality: '90', // 上传图片转 WebP 的压缩质量(1-100)，默认 90；越低体积越小、越糊
  // 规则文案支持 Markdown（前端用 web/src/components/Markdown.vue 渲染：# 标题 / **加粗** / - 列表 / 1. 有序）
  rules_lottery:
    '## 两种参与方式（任选其一）\n\n' +
    '**1. 匿名参与**：可以不填真实姓名（用昵称即可），但**幸运数字要填你的员工工号**，方便开奖后核对身份、发放奖品。\n\n' +
    '**2. 实名参与**：填写你的真实姓名，幸运数字为 **1–9999** 的整数，可**任意填写**、纯凭手气。\n\n' +
    '## 通用规则\n\n' +
    '- 姓名与幸运数字**均不可重复**，同一身份只提交一次。\n' +
    '- ⚠ 请勿冒用他人姓名 / 工号，请勿重复提交；一经发现，本次抽奖判为**无效**。\n\n' +
    '## 开奖算法（公开、可复现）\n\n' +
    '1. 把所有幸运数字相加得到总和 **S**，参与人数记为 **N**。\n' +
    '2. 计算余数 **R = S mod N**；把所有人按幸运数字从小到大排序，第 **R + 1** 位即中奖。\n' +
    '3. 有多个名额时，抽出一位后移出奖池，对剩下的人**重新求和、重新取余**，依次产生下一位。\n' +
    '4. 若中奖者被判无效，则该名额**自动顺延**，由后一位递补。',
  rules_tea:
    '每期下午茶包含若干商品，可对每个商品做「**不推荐 / 还行 / 推荐**」三档评分。\n\n' +
    '- 每个浏览器对每个商品**只能评一次**（可把当期所有商品都评一遍）。\n' +
    '- 好评率 =（**推荐 + 还行**）÷ 总票数。',
};

const _getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
const _setSetting = db.prepare(
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
);

for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
  if (!_getSetting.get(k)) _setSetting.run(k, v);
}

export function getSetting(key) {
  const row = _getSetting.get(key);
  return row ? row.value : DEFAULT_SETTINGS[key] ?? '';
}
export function setSetting(key, value) {
  _setSetting.run(key, String(value ?? ''));
}
// 「随机主题缓存」：TTL>0 时，服务端选定一个随机主题并锁定 random_theme_ttl 分钟，
// 期间所有用户/所有刷新都拿到同一个（即「固定的当前主题」）；过期后下次读取自动换一个。
// 惰性判定：在 getConfig（前台/后台每次拉配置都会走）里按需重选，无需定时器。
// 返回 '' 表示未启用缓存（TTL<=0），此时前端按原行为每次进入自行随机。
// 读边界统一取整 + 夹到 0..10080，令上限不变式对任何写入者（PUT / 直接改库 / 导入备份）都成立。
export function randomThemeTtlMinutes() {
  const raw = Math.floor(Number(getSetting('random_theme_ttl')) || 0);
  return Math.min(10080, Math.max(0, raw));
}

export function effectiveRandomStyle() {
  const ttlMin = randomThemeTtlMinutes();
  if (ttlMin <= 0) return '';
  const now = Date.now();
  const pickedAt = Date.parse(getSetting('random_theme_picked_at') || '');
  const cur = getSetting('random_theme_current');
  const valid = cur && STYLE_KEYS.includes(cur) && Number.isFinite(pickedAt) && (now - pickedAt) < ttlMin * 60000;
  if (valid) return cur;
  const next = STYLE_KEYS[Math.floor(Math.random() * STYLE_KEYS.length)];
  setSetting('random_theme_current', next);
  setSetting('random_theme_picked_at', nowIso());
  return next;
}

export function getConfig() {
  return {
    departmentName: getSetting('department_name'),
    siteName: getSetting('site_name'),
    homeStyleMode: getSetting('home_style_mode'),
    homeFixedStyle: getSetting('home_fixed_style'),
    randomThemeTtl: randomThemeTtlMinutes(),
    randomThemeCurrent: effectiveRandomStyle(), // TTL 内锁定的随机主题；未启用则为 ''
    lotteryModuleEnabled: getSetting('lottery_module_enabled') !== '0',
    teaModuleEnabled: getSetting('tea_module_enabled') !== '0',
    namePlaceholder: getSetting('name_placeholder'),
    teaShowChannel: getSetting('tea_show_channel') === '1',
    teaShowPrice: getSetting('tea_show_price') === '1',
    teaShowQty: getSetting('tea_show_qty') === '1',
    billModuleEnabled: getSetting('bill_module_enabled') !== '0',
    periodBillShow: getSetting('period_bill_show') !== '0',
    imageQuality: Number(getSetting('image_quality')) || 90,
    rulesLottery: getSetting('rules_lottery'),
    rulesTea: getSetting('rules_tea'),
  };
}

// ---------- 抽奖参与者 ----------

export function countEntries(periodId) {
  return db.prepare('SELECT COUNT(*) AS c FROM entries WHERE period_id = ?').get(periodId).c;
}
export function listEntries(periodId) {
  return db
    .prepare('SELECT name, number, created_at FROM entries WHERE period_id = ? ORDER BY number ASC')
    .all(periodId)
    .map((e) => ({ name: e.name, number: e.number, createdAt: e.created_at }));
}

// ---------- 下午茶商品与评分 ----------

// 单个商品在某一期的评分统计；好评率 =（推荐+还行）÷ 总票数
export function productRatings(periodId, productId) {
  const rows = db
    .prepare(
      'SELECT level, COUNT(*) AS c FROM tea_ratings WHERE period_id = ? AND product_id = ? GROUP BY level'
    )
    .all(periodId, productId);
  const counts = { bad: 0, ok: 0, good: 0 };
  for (const r of rows) if (r.level in counts) counts[r.level] = r.c;
  const total = counts.bad + counts.ok + counts.good;
  const goodRate = total === 0 ? 0 : Math.round(((counts.good + counts.ok) / total) * 100);
  return { ...counts, total, goodRate };
}

// 某一期录入的商品（含统计）。opts 按字段控制是否附带内部信息（渠道/价格/数量）+ 本期金额。
export function productsForPeriod(periodId, opts = {}) {
  const { channel = false, price = false, qty = false, amount = false } = opts;
  const rows = db
    .prepare(
      `SELECT p.id, p.name, p.image, p.descr, p.channel, p.price, p.qty, pp.sort, pp.amount
       FROM period_products pp JOIN tea_products p ON p.id = pp.product_id
       WHERE pp.period_id = ? ORDER BY pp.sort ASC, pp.id ASC`
    )
    .all(periodId);
  return rows.map((p) => {
    const out = {
      id: p.id,
      name: p.name,
      image: p.image || null,
      desc: p.descr || '',
      ratings: productRatings(periodId, p.id),
    };
    if (channel || price || qty) {
      out.extra = {};
      if (channel) out.extra.channel = p.channel || '';
      if (price) out.extra.price = p.price || '';
      if (qty) out.extra.qty = p.qty ?? '';
    }
    if (amount) out.amount = p.amount ?? ''; // 本期实际金额（仅后台）
    return out;
  });
}

// 同步某一期的商品列表。items 可为 id 数组，或 [{id, amount}]（amount=本期实际金额，缺省取商品预设价）
export function setPeriodProducts(periodId, items) {
  const list = Array.isArray(items) ? items : [];
  db.prepare('DELETE FROM period_products WHERE period_id = ?').run(periodId);
  const ins = db.prepare(
    'INSERT OR IGNORE INTO period_products (period_id, product_id, sort, amount) VALUES (?, ?, ?, ?)'
  );
  const getPrice = db.prepare('SELECT price FROM tea_products WHERE id = ?');
  const seen = new Set();
  let i = 0;
  for (const it of list) {
    const id = Number(typeof it === 'object' && it !== null ? it.id : it);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    let amount = typeof it === 'object' && it !== null && it.amount != null && it.amount !== '' ? String(it.amount) : null;
    if (amount == null) {
      const p = getPrice.get(id);
      amount = p && p.price ? p.price : null; // 默认套用商品预设价
    }
    ins.run(periodId, id, i++, amount);
  }
}

// 某一期所有商品「实际金额」之和（用于账单自动计算）
export function periodProductsTotal(periodId) {
  const rows = db.prepare('SELECT amount FROM period_products WHERE period_id = ?').all(periodId);
  let sum = 0;
  for (const r of rows) {
    const n = parseFloat(r.amount);
    if (Number.isFinite(n)) sum += n;
  }
  return Math.round(sum * 100) / 100;
}

export function productInPeriod(periodId, productId) {
  return !!db
    .prepare('SELECT 1 FROM period_products WHERE period_id = ? AND product_id = ?')
    .get(periodId, productId);
}

// ---------- 当前期 ----------

export function activatePeriod(id) {
  db.exec('UPDATE periods SET is_active = 0');
  db.prepare('UPDATE periods SET is_active = 1 WHERE id = ?').run(id);
}
export function getActivePeriodRow() {
  return db.prepare('SELECT * FROM periods WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
}

// ---------- 数据备份：导出 / 导入 ----------
const BACKUP_TABLES = [
  'settings', 'periods', 'entries', 'tea_products', 'period_products',
  'tea_ratings', 'bills', 'users', 'fingerprints',
];

export function exportAll() {
  const out = { version: 1, exportedAt: nowIso(), tables: {} };
  for (const t of BACKUP_TABLES) out.tables[t] = db.prepare(`SELECT * FROM ${t}`).all();
  return out;
}

// 用导入数据全量覆盖（事务内）。返回各表导入条数。
export function importAll(data) {
  const tables = data && data.tables ? data.tables : {};
  const counts = {};
  db.exec('BEGIN');
  try {
    for (const t of [...BACKUP_TABLES].reverse()) db.exec(`DELETE FROM ${t}`);
    for (const t of BACKUP_TABLES) {
      const valid = new Set(db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name));
      const rows = Array.isArray(tables[t]) ? tables[t] : [];
      let n = 0;
      for (const row of rows) {
        const cols = Object.keys(row).filter((c) => valid.has(c)); // 只导入本表真实存在的列，兼容跨版本备份
        if (!cols.length) continue;
        const ph = cols.map(() => '?').join(',');
        db.prepare(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${ph})`).run(...cols.map((c) => row[c]));
        n++;
      }
      counts[t] = n;
    }
    db.exec("DELETE FROM sqlite_sequence");
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return counts;
}

// ---------- 账单 ----------

const round2 = (n) => Math.round(n * 100) / 100;

function billRow(b) {
  return {
    id: b.id, date: b.date, title: b.title, kind: b.kind,
    amount: b.amount, note: b.note || '', periodId: b.period_id ?? null, createdAt: b.created_at,
  };
}

// 总账单：全部流水 + 收入/支出/结余。结余<0 即存在垫付。
export function ledger() {
  const rows = db.prepare('SELECT * FROM bills ORDER BY date DESC, id DESC').all();
  let income = 0, expense = 0;
  for (const b of rows) {
    if (b.kind === 'income') income += b.amount;
    else expense += b.amount;
  }
  // 先各自取整，再由取整后的值算结余，保证展示上「收入 - 支出 = 结余」恒成立（否则分位误差会让三者对不上）
  const inc = round2(income);
  const exp = round2(expense);
  const balance = round2(inc - exp);
  return {
    items: rows.map(billRow),
    income: inc,
    expense: exp,
    balance,
    advance: balance < 0 ? round2(-balance) : 0, // 当前垫付金额
  };
}

export function billsForPeriod(periodId) {
  const rows = db.prepare('SELECT * FROM bills WHERE period_id = ? ORDER BY date DESC, id DESC').all(periodId);
  let total = 0;
  for (const b of rows) total += b.kind === 'income' ? -b.amount : b.amount; // 本期净支出
  return { items: rows.map(billRow), total: round2(total) };
}

// ---------- 用户库 & 指纹 ----------

export function upsertUser(name) {
  const nm = String(name || '').trim();
  if (!nm) return;
  db.prepare(
    `INSERT INTO users (name, created_at, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET updated_at = excluded.updated_at`
  ).run(nm, nowIso(), nowIso());
}

// 记录一条指纹。client 可为前端采集对象 { id, summary, details } 或旧版字符串；
// server 为服务端补充信号 { ip, ua, acceptLanguage, clientHints... }。
export function recordFingerprint(name, client, kind, periodId, server) {
  let id = '';
  let summary = '';
  let clientDetails = {};
  if (client && typeof client === 'object') {
    id = client.id || '';
    summary = client.summary || '';
    clientDetails = client.details && typeof client.details === 'object' ? client.details : client;
  } else if (client != null && client !== '') {
    summary = String(client);
  }
  const srv = server && typeof server === 'object' ? server : {};
  const fpStr = [id, summary].filter(Boolean).join(' · ') || summary || '';
  let merged = JSON.stringify({ id, summary, client: clientDetails, server: srv });
  // 公开端可传任意大的 details，做个上限兜底，避免被塞超大 JSON 撑大库。
  // FingerprintJS 全量 components + 字体表 + clientHints 正常在 10~40KB，这里放到 80KB；
  // 超限（多半是被恶意灌大）则只留摘要 + 服务端信号，客户端全量信号丢弃。
  if (merged.length > 80000) merged = JSON.stringify({ id, summary, truncated: true, server: srv });
  db.prepare(
    'INSERT INTO fingerprints (name, fp, ip, ua, details, kind, period_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(String(name || '').trim() || null, fpStr, srv.ip || '', srv.ua || '', merged, kind, periodId ?? null, nowIso());
}

// 用户列表（聚合各模块次数）。支持按姓名搜索 + 分页（默认每页 10）。
export function listUsers({ page = 1, pageSize = 10, q = '' } = {}) {
  const search = String(q || '').trim();
  const where = search ? 'WHERE name LIKE ?' : '';
  const likeArgs = search ? [`%${search}%`] : [];
  const total = db.prepare(`SELECT COUNT(*) AS c FROM users ${where}`).get(...likeArgs).c;
  const size = Math.max(1, pageSize);
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, Number(page) || 1), pages);
  const rows = db
    .prepare(`SELECT name, updated_at FROM users ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
    .all(...likeArgs, size, (p - 1) * size);
  const items = rows.map((u) => ({
    name: u.name,
    updatedAt: u.updated_at,
    lotteryCount: db.prepare('SELECT COUNT(*) c FROM entries WHERE name = ?').get(u.name).c,
    ratingCount: db.prepare('SELECT COUNT(*) c FROM tea_ratings WHERE name = ?').get(u.name).c,
    fpCount: db.prepare('SELECT COUNT(*) c FROM fingerprints WHERE name = ?').get(u.name).c,
  }));
  return { items, total, page: p, pageSize: size, pages };
}

// 单个用户详情：抽奖数字 / 各商品评分次数 / 指纹历史
export function userDetail(name) {
  const nm = String(name || '').trim();
  if (!db.prepare('SELECT 1 FROM users WHERE name = ?').get(nm)) return null;
  const lottery = db
    .prepare(
      `SELECT e.period_id AS periodId, p.title AS periodTitle, e.number, e.created_at AS createdAt
       FROM entries e LEFT JOIN periods p ON p.id = e.period_id
       WHERE e.name = ? ORDER BY e.id DESC`
    )
    .all(nm);
  const ratings = db
    .prepare(
      `SELECT pr.name AS product, COUNT(*) AS count
       FROM tea_ratings r JOIN tea_products pr ON pr.id = r.product_id
       WHERE r.name = ? GROUP BY r.product_id ORDER BY count DESC`
    )
    .all(nm);
  const fingerprints = db
    .prepare('SELECT fp, ip, ua, details, kind, period_id AS periodId, created_at AS createdAt FROM fingerprints WHERE name = ? ORDER BY id DESC')
    .all(nm)
    .map((f) => {
      let details = null;
      try {
        details = f.details ? JSON.parse(f.details) : null;
      } catch {
        details = null;
      }
      return { fp: f.fp, ip: f.ip || '', ua: f.ua || '', details, kind: f.kind, periodId: f.periodId, createdAt: f.createdAt };
    });
  return { name: nm, lottery, ratings, fingerprints };
}

// 本期账单是否展示：期数级 bill_show（inherit|on|off）覆盖系统级 period_bill_show
export function billShowEffective(row) {
  const v = row.bill_show || 'inherit';
  if (v === 'on') return true;
  if (v === 'off') return false;
  return getSetting('period_bill_show') !== '0';
}
