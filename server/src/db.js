import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const DB_FILE = path.join(dataDir, 'data.sqlite');
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

  CREATE INDEX IF NOT EXISTS idx_entries_period ON entries(period_id);
  CREATE INDEX IF NOT EXISTS idx_pp_period ON period_products(period_id);
  CREATE INDEX IF NOT EXISTS idx_ratings_pp ON tea_ratings(period_id, product_id);
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

export function nowIso() {
  return new Date().toISOString();
}

// ---------- 配置 ----------

export const STYLE_KEYS = [
  'style1', 'style2', 'style3', 'style4', 'style5', 'style6',
  'style7', 'style8', 'style9', 'style10', 'style11', 'style12',
];

const DEFAULT_SETTINGS = {
  department_name: 'AIoT客户端组',
  site_name: 'AIoT客户端组生活系统',
  home_style_mode: 'follow', // follow | random | fixed
  home_fixed_style: 'style1',
  tea_show_extra: '0', // 下午茶商品的额外信息（渠道/价格/数量）是否对用户开放展示
  lottery_module_enabled: '1', // 系统级：是否开放抽奖模块（关闭后用户彻底看不到抽奖及其规则）
  tea_module_enabled: '1', // 系统级：是否开放下午茶评分模块
  name_placeholder: '陈老板', // 趣味设置：抽奖姓名输入框的占位提示
  rules_lottery:
    '每人填写姓名与一个 1-9999 的幸运数字（姓名、数字均不可重复）。开奖时把所有幸运数字相加得到 S，参与人数为 N，余数 R = S mod N；把所有人按幸运数字从小到大排序，第 R+1 位即中奖。多个名额时抽出一位后移出奖池，对剩余的人重新求和取余，依次产生下一位。结果公开可复现。',
  rules_tea:
    '每期下午茶包含若干商品，可对每个商品做「不推荐 / 还行 / 推荐」三档评分。每个浏览器对每个商品只能评一次（可把当期所有商品都评一遍）。好评率 =（推荐 + 还行）÷ 总票数。',
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
export function getConfig() {
  return {
    departmentName: getSetting('department_name'),
    siteName: getSetting('site_name'),
    homeStyleMode: getSetting('home_style_mode'),
    homeFixedStyle: getSetting('home_fixed_style'),
    teaShowExtra: getSetting('tea_show_extra') === '1',
    lotteryModuleEnabled: getSetting('lottery_module_enabled') !== '0',
    teaModuleEnabled: getSetting('tea_module_enabled') !== '0',
    namePlaceholder: getSetting('name_placeholder'),
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

// 某一期录入的商品（含统计）。includeExtra=true 时附带内部字段（渠道/价格/数量）。
export function productsForPeriod(periodId, includeExtra = false) {
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
    if (includeExtra) {
      out.extra = { channel: p.channel || '', price: p.price || '', qty: p.qty ?? '' };
      out.amount = p.amount ?? ''; // 本期实际金额（仅后台）
    }
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
