import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  db, nowIso, STYLE_KEYS, DEFAULT_SETTINGS,
  getConfig, getSetting, setSetting,
  countEntries, listEntries,
  productsForPeriod, productRatings, setPeriodProducts, productInPeriod, periodProductsTotal,
  activatePeriod, getActivePeriodRow,
  ledger, billsForPeriod, billShowEffective,
  upsertUser, recordFingerprint, listUsers, userDetail,
  exportAll, importAll,
} from './db.js';
import { computeResult, normalizePrizes } from './lottery.js';
import { toWebp } from './imagePipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 41131;
// 监听地址：默认 0.0.0.0（局域网内其他机器也能访问）；需要只绑本机时设 HOST=127.0.0.1。
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
// 后台凭据 = SHA-256(固定盐 + 管理密码)。前端登录前在本地算好哈希再发送，明文密码绝不出网；
// 该哈希即后续所有 /api/admin/* 请求头 x-admin-token，后端逐请求恒定时比对。
const ADMIN_SALT = 'aiot-life::';
const adminHash = (pw) => crypto.createHash('sha256').update(ADMIN_SALT + String(pw ?? '')).digest('hex');
const HASH_RE = /^[0-9a-f]{64}$/;
// 环境变量密码派生的哈希 —— 作为「从未在后台改过密码」时的默认凭据。
const ENV_ADMIN_TOKEN = adminHash(ADMIN_PASSWORD);
// 当前有效凭据：优先用后台「修改密码」存库的 admin_password_hash（见 PUT change-password），
// 未设置则回退到环境变量密码派生的哈希。每次鉴权/登录都实时读取，改密后立即生效。
function currentAdminToken() {
  const stored = getSetting('admin_password_hash');
  return HASH_RE.test(stored || '') ? stored : ENV_ADMIN_TOKEN;
}

// 恒定时间比较，避免按字符早退泄漏信息（防时序攻击）
function safeEqual(a, b) {
  const ba = Buffer.from(String(a ?? ''));
  const bb = Buffer.from(String(b ?? ''));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 数据导入可能较大
app.use('/uploads', express.static(uploadsDir));

// 主动向浏览器索取 User-Agent Client Hints（高熵信号），后续请求会带上 sec-ch-ua-* 头，
// 服务端据此补全前端 JS 拿不到/不稳定的信息（架构/机型/完整版本等）。
const ACCEPT_CH = [
  'Sec-CH-UA', 'Sec-CH-UA-Platform', 'Sec-CH-UA-Platform-Version', 'Sec-CH-UA-Mobile',
  'Sec-CH-UA-Arch', 'Sec-CH-UA-Bitness', 'Sec-CH-UA-Model', 'Sec-CH-UA-Full-Version-List',
].join(', ');
app.use((req, res, next) => {
  res.setHeader('Accept-CH', ACCEPT_CH);
  res.setHeader('Critical-CH', ACCEPT_CH);
  next();
});

// ---------- helpers ----------

// 服务端补充的指纹信号：来源 IP、UA、语言、以及浏览器发来的 Client Hints 头。
function serverSignals(req) {
  const h = req.headers;
  const xff = (h['x-forwarded-for'] || '').toString().split(',')[0].trim();
  const ip = xff || req.socket?.remoteAddress || req.ip || '';
  const hints = {};
  for (const k of Object.keys(h)) {
    if (k.startsWith('sec-ch-')) hints[k] = h[k];
  }
  return {
    ip,
    ua: h['user-agent'] || '',
    acceptLanguage: h['accept-language'] || '',
    acceptEncoding: h['accept-encoding'] || '',
    referer: h['referer'] || '',
    clientHints: hints,
    serverTime: nowIso(),
  };
}

function getPeriodRow(id) {
  return db.prepare('SELECT * FROM periods WHERE id = ?').get(id);
}

// 容错解析 DB 里的 JSON 文本字段（prizes/result/invalid_names）：损坏时回退默认，
// 避免单条脏数据（如导入的异常备份）让整个接口 500。
function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text ?? '');
  } catch {
    return fallback;
  }
}

// 某一期录入的商品（含本期实际金额），供后台表单回填
function periodProductItems(periodId) {
  return db
    .prepare('SELECT product_id AS id, amount FROM period_products WHERE period_id = ? ORDER BY sort ASC')
    .all(periodId)
    .map((r) => ({ id: r.id, amount: r.amount ?? '' }));
}

function teaPayload(row, extraOpts) {
  if (!row.tea_enabled) return null;
  const ratingOpen = row.tea_close_at ? new Date(row.tea_close_at).getTime() > Date.now() : false;
  return {
    ratingHours: row.tea_rating_hours,
    closeAt: row.tea_close_at,
    ratingOpen,
    products: productsForPeriod(row.id, extraOpts),
  };
}

// 公开端按系统逐字段开关决定商品内部信息曝光；后台端全开。
function teaExtraOpts(adminView) {
  if (adminView) return { channel: true, price: true, qty: true, amount: true };
  return {
    channel: getSetting('tea_show_channel') === '1',
    price: getSetting('tea_show_price') === '1',
    qty: getSetting('tea_show_qty') === '1',
    amount: false,
  };
}

// 对外（公开 & 后台共用）的期数序列化。所有 style 共用同一份契约。
// adminView: 后台端为 true（商品内部字段全开、含本期金额）；公开端为 false（按系统逐字段开关）。
// mask: 公开端为 true，会用「系统级模块开关」遮蔽期数的抽奖/下午茶（关闭则用户彻底看不到，含规则）。后台端为 false，返回真实期数设置。
function serializePeriod(row, { withResult = false, withEntries = false, adminView = false, mask = false } = {}) {
  const sysLottery = getSetting('lottery_module_enabled') !== '0';
  const sysTea = getSetting('tea_module_enabled') !== '0';
  const lotteryEnabled = mask ? sysLottery && !!row.lottery_enabled : !!row.lottery_enabled;
  const teaEnabled = mask ? sysTea && !!row.tea_enabled : !!row.tea_enabled;
  const data = {
    id: row.id,
    title: row.title,
    style: row.style,
    lotteryEnabled,
    teaEnabled,
    isActive: !!row.is_active,
    status: row.status,
    createdAt: row.created_at,
    prizes: normalizePrizes(safeJsonParse(row.prizes, [])),
    participantCount: countEntries(row.id),
    result: null,
    tea: teaEnabled ? teaPayload(row, teaExtraOpts(adminView)) : null,
    bill: { show: billShowEffective(row), ...billsForPeriod(row.id) },
    billShow: row.bill_show || 'inherit',
    invalidNames: safeJsonParse(row.invalid_names, []),
  };
  if (withResult && row.status === 'drawn' && row.result) {
    data.result = safeJsonParse(row.result, null);
  }
  if (withEntries) {
    data.entries = listEntries(row.id);
  }
  return data;
}

function buildResult(row) {
  const entries = db.prepare('SELECT name, number FROM entries WHERE period_id = ?').all(row.id);
  const prizes = normalizePrizes(safeJsonParse(row.prizes, []));
  const invalid = safeJsonParse(row.invalid_names, []);
  return computeResult(entries, prizes, invalid);
}

// 后台单期完整详情：真实开关(adminView) + 参与者 + 结果 + 本期商品(含实际金额与内部字段)。
// 所有「会返回期数」的后台写操作(activate/deactivate/draw/reopen/invalid 及增改)都用它，
// 保证前端表单始终拿到完整、一致的数据（否则操作后商品列表/金额会短暂丢失）。
function adminPeriodDetail(id) {
  const row = getPeriodRow(id);
  if (!row) return null;
  const data = serializePeriod(row, { withResult: true, withEntries: true, adminView: true });
  data.productItems = periodProductItems(row.id);
  data.productIds = data.productItems.map((i) => i.id);
  return data;
}

function adminAuth(req, res, next) {
  if (safeEqual(req.get('x-admin-token'), currentAdminToken())) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

// 公开端是否展示商品内部字段（渠道/价格/数量）

// ================= 公开接口 =================

// 系统配置（站点名、部门名、规则、首页风格模式）
app.get('/api/config', (req, res) => {
  res.json(getConfig());
});

// 规则文案的服务器默认预设（用于后台「恢复默认」）
app.get('/api/config/defaults', (req, res) => {
  res.json({
    rulesLottery: DEFAULT_SETTINGS.rules_lottery,
    rulesTea: DEFAULT_SETTINGS.rules_tea,
  });
});

// 首页：当前进行中的那一期（全局至多一期）
app.get('/api/active', (req, res) => {
  const row = getActivePeriodRow();
  res.json({ period: row ? serializePeriod(row, { withResult: true, mask: true }) : null });
});

// 期数列表（轻量）
app.get('/api/periods', (req, res) => {
  const rows = db.prepare('SELECT * FROM periods ORDER BY id DESC').all();
  res.json(rows.map((r) => serializePeriod(r, { mask: true })));
});

// 单期完整数据（开奖后含 result）
app.get('/api/periods/:id', (req, res) => {
  const row = getPeriodRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(serializePeriod(row, { withResult: true, mask: true }));
});

// 提交抽奖：姓名 + 1~9999 幸运数字，姓名与数字均防重复。
app.post('/api/periods/:id/entries', (req, res) => {
  const row = getPeriodRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  if (!row.lottery_enabled || getSetting('lottery_module_enabled') === '0')
    return res.status(400).json({ error: 'lottery_disabled' });
  if (row.status !== 'open') return res.status(400).json({ error: 'closed' });

  const name = (req.body?.name ?? '').toString().trim();
  const number = Number(req.body?.number);

  if (!name) return res.status(400).json({ error: 'name_required' });
  if (name.length > 30) return res.status(400).json({ error: 'name_too_long' });
  if (!Number.isInteger(number) || number < 1 || number > 9999) {
    return res.status(400).json({ error: 'number_range' });
  }

  if (db.prepare('SELECT 1 FROM entries WHERE period_id = ? AND name = ?').get(row.id, name))
    return res.status(400).json({ error: 'name_taken' });
  if (db.prepare('SELECT 1 FROM entries WHERE period_id = ? AND number = ?').get(row.id, number))
    return res.status(400).json({ error: 'number_taken' });

  try {
    db.prepare('INSERT INTO entries (period_id, name, number, created_at) VALUES (?, ?, ?, ?)').run(
      row.id, name, number, nowIso()
    );
  } catch {
    return res.status(400).json({ error: 'duplicate' });
  }
  upsertUser(name);
  recordFingerprint(name, req.body?.fingerprint, 'lottery', row.id, serverSignals(req));
  res.json({ ok: true, participantCount: countEntries(row.id) });
});

// 姓名是否已提交（只返回是否，**绝不返回号码**，防止凭姓名套取他人幸运数字）
app.get('/api/periods/:id/check', (req, res) => {
  const row = getPeriodRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  const name = (req.query.name ?? '').toString().trim();
  if (!name) return res.json({ exists: false });
  const exists = !!db.prepare('SELECT 1 FROM entries WHERE period_id = ? AND name = ?').get(row.id, name);
  res.json({ exists });
});

// 撤销抽奖：按姓名删除参与记录（开奖前），并记录指纹以便追溯。不回显号码。
app.post('/api/periods/:id/cancel', (req, res) => {
  const row = getPeriodRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  if (row.status !== 'open') return res.status(400).json({ error: 'closed' });
  const name = (req.body?.name ?? '').toString().trim();
  if (!name) return res.status(400).json({ error: 'name_required' });
  const exists = !!db.prepare('SELECT 1 FROM entries WHERE period_id = ? AND name = ?').get(row.id, name);
  recordFingerprint(name, req.body?.fingerprint, 'cancel', row.id, serverSignals(req)); // 无论是否命中都留痕
  if (exists) db.prepare('DELETE FROM entries WHERE period_id = ? AND name = ?').run(row.id, name);
  res.json({ ok: true, canceled: exists, participantCount: countEntries(row.id) });
});

// 下午茶评分：{ productId, level, clientId }。每个浏览器对每个商品只能评一次。
app.post('/api/periods/:id/tea', (req, res) => {
  const row = getPeriodRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  if (!row.tea_enabled || getSetting('tea_module_enabled') === '0')
    return res.status(400).json({ error: 'tea_disabled' });

  const productId = Number(req.body?.productId);
  const level = (req.body?.level ?? '').toString();
  const clientId = (req.body?.clientId ?? '').toString().trim();

  if (!Number.isInteger(productId)) return res.status(400).json({ error: 'bad_product' });
  if (!['bad', 'ok', 'good'].includes(level)) return res.status(400).json({ error: 'bad_level' });
  if (!clientId || clientId.length > 64) return res.status(400).json({ error: 'bad_client' });
  if (!productInPeriod(row.id, productId)) return res.status(400).json({ error: 'product_not_in_period' });

  const open = row.tea_close_at && new Date(row.tea_close_at).getTime() > Date.now();
  if (!open) return res.status(400).json({ error: 'rating_closed' });

  const raterName = (req.body?.name ?? '').toString().trim().slice(0, 30); // 与抽奖入口一致地限长
  try {
    db.prepare(
      'INSERT INTO tea_ratings (period_id, product_id, client_id, level, name, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(row.id, productId, clientId, level, raterName || null, nowIso());
  } catch {
    // UNIQUE(period, product, client) -> 已评过，防止重复刷
    return res.status(409).json({ error: 'already_voted', ratings: productRatings(row.id, productId) });
  }
  if (raterName) upsertUser(raterName);
  recordFingerprint(raterName, req.body?.fingerprint, 'rating', row.id, serverSignals(req));
  res.json({ ok: true, ratings: productRatings(row.id, productId) });
});

// ================= 后台接口 =================

app.post('/api/admin/login', (req, res) => {
  const provided = (req.body?.password ?? '').toString();
  const cur = currentAdminToken();
  // 新前端发来的是 SHA-256(盐+密码)（provided === cur）；为兼容旧前端/脚本也接受明文密码（再哈希一次比对）。
  if (safeEqual(provided, cur) || safeEqual(adminHash(provided), cur)) {
    return res.json({ token: cur });
  }
  return res.status(401).json({ error: 'bad_password' });
});

// 修改管理员密码：验证旧密码 → 把新密码哈希存库（此后登录/鉴权都以库中哈希为准，环境变量密码不再生效）。
// 前端传来的 oldPassword/newPassword 均为 SHA-256(盐+明文)，明文不出网；也兼容传明文（再哈希比对/入库）。
app.post('/api/admin/change-password', adminAuth, (req, res) => {
  const oldPw = (req.body?.oldPassword ?? '').toString();
  const newPw = (req.body?.newPassword ?? '').toString();
  const cur = currentAdminToken();
  if (!(safeEqual(oldPw, cur) || safeEqual(adminHash(oldPw), cur))) {
    return res.status(400).json({ error: 'bad_old_password' });
  }
  // 新密码优先按「已是哈希」处理（前端标准路径）；不是 64 位十六进制则当明文再哈希一次。
  const newHash = HASH_RE.test(newPw) ? newPw : adminHash(newPw);
  if (!newPw) return res.status(400).json({ error: 'bad_new_password' });
  if (safeEqual(newHash, cur)) return res.status(400).json({ error: 'same_password' });
  setSetting('admin_password_hash', newHash);
  res.json({ ok: true, token: newHash }); // 返回新凭据，前端据此更新 x-admin-token 保持登录态
});

// ----- 系统配置 -----
app.get('/api/admin/config', adminAuth, (req, res) => res.json(getConfig()));

app.put('/api/admin/config', adminAuth, (req, res) => {
  const b = req.body || {};
  const map = {
    departmentName: 'department_name',
    siteName: 'site_name',
    namePlaceholder: 'name_placeholder',
    rulesLottery: 'rules_lottery',
    rulesTea: 'rules_tea',
  };
  for (const [camel, key] of Object.entries(map)) {
    if (b[camel] != null) setSetting(key, String(b[camel]));
  }
  if (['follow', 'random', 'fixed'].includes(b.homeStyleMode)) setSetting('home_style_mode', b.homeStyleMode);
  if (STYLE_KEYS.includes(b.homeFixedStyle)) setSetting('home_fixed_style', b.homeFixedStyle);
  if (b.randomThemeTtl !== undefined) {
    const t = parseInt(b.randomThemeTtl, 10);
    // 0 = 关闭缓存；上限 10080 分钟（7 天）防误填超大值
    if (Number.isFinite(t)) {
      const clamped = String(Math.min(10080, Math.max(0, t)));
      // 仅当 TTL 真的变化时才清掉旧锁定：使「关闭再开启 / 改时长」都从新一轮随机开始，
      // 而不会因保存其它无关设置（表单整体提交会带上当前 TTL）就误触发重随。
      if (clamped !== getSetting('random_theme_ttl')) {
        setSetting('random_theme_ttl', clamped);
        setSetting('random_theme_current', '');
        setSetting('random_theme_picked_at', '');
      }
    }
  }
  if (b.teaShowChannel !== undefined) setSetting('tea_show_channel', b.teaShowChannel ? '1' : '0');
  if (b.teaShowPrice !== undefined) setSetting('tea_show_price', b.teaShowPrice ? '1' : '0');
  if (b.teaShowQty !== undefined) setSetting('tea_show_qty', b.teaShowQty ? '1' : '0');
  if (b.lotteryModuleEnabled !== undefined) setSetting('lottery_module_enabled', b.lotteryModuleEnabled ? '1' : '0');
  if (b.teaModuleEnabled !== undefined) setSetting('tea_module_enabled', b.teaModuleEnabled ? '1' : '0');
  if (b.billModuleEnabled !== undefined) setSetting('bill_module_enabled', b.billModuleEnabled ? '1' : '0');
  if (b.periodBillShow !== undefined) setSetting('period_bill_show', b.periodBillShow ? '1' : '0');
  if (b.imageQuality !== undefined) {
    const q = parseInt(b.imageQuality, 10);
    if (Number.isFinite(q)) setSetting('image_quality', String(Math.min(100, Math.max(1, q))));
  }
  res.json(getConfig());
});

// ----- 下午茶商品库 -----
function productAggregate(productId) {
  const rows = db
    .prepare('SELECT level, COUNT(*) AS c FROM tea_ratings WHERE product_id = ? GROUP BY level')
    .all(productId);
  const c = { bad: 0, ok: 0, good: 0 };
  for (const r of rows) if (r.level in c) c[r.level] = r.c;
  const total = c.bad + c.ok + c.good;
  return { ...c, total, goodRate: total === 0 ? 0 : Math.round(((c.good + c.ok) / total) * 100) };
}

function adminProduct(p) {
  return {
    id: p.id,
    name: p.name,
    image: p.image || null,
    desc: p.descr || '',
    channel: p.channel || '',
    price: p.price || '',
    qty: p.qty ?? '',
    createdAt: p.created_at,
    stats: productAggregate(p.id),
  };
}
// 解析商品内部字段（均非必填）
function readProductExtra(body, prev = {}) {
  const channel = body?.channel !== undefined ? String(body.channel || '').trim() : prev.channel || '';
  const price = body?.price !== undefined ? String(body.price || '').trim() : prev.price || '';
  let qty = body?.qty;
  if (qty === undefined) qty = prev.qty ?? null;
  else {
    const n = parseInt(qty, 10);
    qty = Number.isFinite(n) ? n : null;
  }
  return { channel: channel || null, price: price || null, qty };
}

app.get('/api/admin/products', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM tea_products ORDER BY id DESC').all();
  res.json(rows.map(adminProduct));
});

app.post('/api/admin/products', adminAuth, (req, res) => {
  const name = (req.body?.name ?? '').toString().trim();
  if (!name) return res.status(400).json({ error: 'name_required' });
  const image = req.body?.image ? String(req.body.image) : null;
  const desc = (req.body?.desc ?? '').toString();
  const x = readProductExtra(req.body);
  const info = db
    .prepare('INSERT INTO tea_products (name, image, descr, channel, price, qty, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(name, image, desc, x.channel, x.price, x.qty, nowIso());
  res.json(adminProduct(db.prepare('SELECT * FROM tea_products WHERE id = ?').get(info.lastInsertRowid)));
});

app.put('/api/admin/products/:id', adminAuth, (req, res) => {
  const p = db.prepare('SELECT * FROM tea_products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'not_found' });
  const name = (req.body?.name ?? p.name).toString().trim() || p.name;
  const image = req.body?.image !== undefined ? (req.body.image ? String(req.body.image) : null) : p.image;
  const desc = req.body?.desc !== undefined ? String(req.body.desc) : p.descr;
  const x = readProductExtra(req.body, p);
  db.prepare('UPDATE tea_products SET name = ?, image = ?, descr = ?, channel = ?, price = ?, qty = ? WHERE id = ?')
    .run(name, image, desc, x.channel, x.price, x.qty, p.id);
  res.json(adminProduct(db.prepare('SELECT * FROM tea_products WHERE id = ?').get(p.id)));
});

app.delete('/api/admin/products/:id', adminAuth, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM tea_ratings WHERE product_id = ?').run(id);
  db.prepare('DELETE FROM period_products WHERE product_id = ?').run(id);
  db.prepare('DELETE FROM tea_products WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ----- 期数 -----
app.get('/api/admin/periods', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM periods ORDER BY id DESC').all();
  res.json(rows.map((r) => serializePeriod(r, { withResult: true, adminView: true })));
});

app.get('/api/admin/periods/:id', adminAuth, (req, res) => {
  const data = adminPeriodDetail(req.params.id);
  if (!data) return res.status(404).json({ error: 'not_found' });
  res.json(data);
});

function readPeriodInput(body) {
  const title = (body?.title ?? '').toString().trim();
  const style = body?.style === 'random' || STYLE_KEYS.includes(body?.style) ? body.style : 'style1';
  const lotteryEnabled = body?.lotteryEnabled ? 1 : 0;
  const teaEnabled = body?.teaEnabled ? 1 : 0;
  const prizes = JSON.stringify(normalizePrizes(body?.prizes));
  let hours = parseInt(body?.teaRatingHours, 10);
  if (!Number.isFinite(hours) || hours < 1) hours = 24;
  const closeAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  const billShow = ['inherit', 'on', 'off'].includes(body?.billShow) ? body.billShow : 'inherit';
  return { title, style, lotteryEnabled, teaEnabled, prizes, hours, closeAt, billShow };
}

app.post('/api/admin/periods', adminAuth, (req, res) => {
  const i = readPeriodInput(req.body);
  if (!i.title) return res.status(400).json({ error: 'title_required' });
  const info = db
    .prepare(
      `INSERT INTO periods (title, style, lottery_enabled, tea_enabled, status, prizes, tea_rating_hours, tea_close_at, bill_show, created_at)
       VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)`
    )
    .run(i.title, i.style, i.lotteryEnabled, i.teaEnabled, i.prizes, i.hours, i.closeAt, i.billShow, nowIso());
  setPeriodProducts(info.lastInsertRowid, req.body?.products ?? req.body?.productIds);
  if (req.body?.activate) activatePeriod(info.lastInsertRowid);
  res.json(adminPeriodDetail(info.lastInsertRowid));
});

app.put('/api/admin/periods/:id', adminAuth, (req, res) => {
  const row = getPeriodRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  const i = readPeriodInput(req.body);
  if (!i.title) return res.status(400).json({ error: 'title_required' });
  const keepClose = req.body?.teaRatingHours == null && row.tea_close_at ? row.tea_close_at : i.closeAt;
  const keepHours = req.body?.teaRatingHours == null ? row.tea_rating_hours : i.hours;
  db.prepare(
    `UPDATE periods SET title=?, style=?, lottery_enabled=?, tea_enabled=?, prizes=?, tea_rating_hours=?, tea_close_at=?, bill_show=? WHERE id=?`
  ).run(i.title, i.style, i.lotteryEnabled, i.teaEnabled, i.prizes, keepHours, keepClose, i.billShow, row.id);
  if (req.body?.products !== undefined || req.body?.productIds !== undefined)
    setPeriodProducts(row.id, req.body.products ?? req.body.productIds);
  res.json(adminPeriodDetail(row.id));
});

app.delete('/api/admin/periods/:id', adminAuth, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM entries WHERE period_id = ?').run(id);
  db.prepare('DELETE FROM tea_ratings WHERE period_id = ?').run(id);
  db.prepare('DELETE FROM period_products WHERE period_id = ?').run(id);
  db.prepare('DELETE FROM periods WHERE id = ?').run(id);
  res.json({ ok: true });
});

// 设为当前期 / 下线（确保同时只有一期在线）
app.post('/api/admin/periods/:id/activate', adminAuth, (req, res) => {
  const row = getPeriodRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  activatePeriod(row.id);
  res.json(adminPeriodDetail(row.id));
});
app.post('/api/admin/periods/:id/deactivate', adminAuth, (req, res) => {
  const row = getPeriodRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  db.prepare('UPDATE periods SET is_active = 0 WHERE id = ?').run(row.id);
  res.json(adminPeriodDetail(row.id));
});

// 模拟计算（不落库）
app.post('/api/admin/periods/:id/simulate', adminAuth, (req, res) => {
  const row = getPeriodRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  if (countEntries(row.id) === 0) return res.status(400).json({ error: 'no_entries' });
  res.json({ simulated: true, result: buildResult(row) });
});

// 正式开奖（落库）
app.post('/api/admin/periods/:id/draw', adminAuth, (req, res) => {
  const row = getPeriodRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  if (countEntries(row.id) === 0) return res.status(400).json({ error: 'no_entries' });
  const result = buildResult(row);
  db.prepare('UPDATE periods SET status = ?, result = ? WHERE id = ?').run('drawn', JSON.stringify(result), row.id);
  res.json(adminPeriodDetail(row.id));
});

// 撤销开奖
app.post('/api/admin/periods/:id/reopen', adminAuth, (req, res) => {
  const row = getPeriodRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  db.prepare('UPDATE periods SET status = ?, result = NULL WHERE id = ?').run('open', row.id);
  res.json(adminPeriodDetail(row.id));
});

// 判定某人有效/无效；若已开奖则重算（无效者顺延，二名递补一名）
app.post('/api/admin/periods/:id/invalid', adminAuth, (req, res) => {
  const row = getPeriodRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  const name = (req.body?.name ?? '').toString().trim(); // 与 entries 存储的姓名一致地去空白，否则判无效对不上人、名次不顺延
  const makeInvalid = !!req.body?.invalid;
  const set = new Set(safeJsonParse(row.invalid_names, []));
  if (makeInvalid) set.add(name);
  else set.delete(name);
  db.prepare('UPDATE periods SET invalid_names = ? WHERE id = ?').run(JSON.stringify([...set]), row.id);
  // 已开奖则按新的无效名单重算并落库
  if (row.status === 'drawn') {
    const result = buildResult(getPeriodRow(row.id));
    db.prepare('UPDATE periods SET result = ? WHERE id = ?').run(JSON.stringify(result), row.id);
  }
  res.json(adminPeriodDetail(row.id));
});

// 图片上传：内存接收 → 统一转码为体积最小的 WebP（质量由系统设置 image_quality 决定，默认 90）。
// 非图片或转码失败则按原文件落盘，保证不丢图。
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function imageQuality() {
  const n = parseInt(getSetting('image_quality'), 10);
  return Number.isFinite(n) ? Math.min(100, Math.max(1, n)) : 90;
}

app.post('/api/admin/upload', adminAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  const base = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const webp = await toWebp(req.file.buffer, imageQuality());
  if (webp) {
    const filename = `${base}.webp`;
    fs.writeFileSync(path.join(uploadsDir, filename), webp);
    return res.json({ url: `/uploads/${filename}` });
  }
  // 回退：原样保存（gif/svg 等不支持转码的格式，或转码异常时）
  const ext = path.extname(req.file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.png';
  const filename = `${base}${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
  res.json({ url: `/uploads/${filename}` });
});

// ================= 账单 =================
function readBillInput(body) {
  const date = (body?.date ?? '').toString().trim() || new Date().toISOString().slice(0, 10);
  const title = (body?.title ?? '').toString().trim();
  const kind = body?.kind === 'income' ? 'income' : 'expense';
  let amount = parseFloat(body?.amount);
  if (!Number.isFinite(amount)) amount = 0;
  amount = Math.round(amount * 100) / 100;
  const note = (body?.note ?? '').toString();
  let periodId = body?.periodId;
  periodId = periodId === '' || periodId == null ? null : Number(periodId);
  if (periodId != null && !Number.isInteger(periodId)) periodId = null;
  return { date, title, kind, amount, note, periodId };
}

// 公开：总账单流水 + 收入/支出/结余/垫付
app.get('/api/bills', (req, res) => res.json(ledger()));

app.get('/api/admin/bills', adminAuth, (req, res) => res.json(ledger()));

app.post('/api/admin/bills', adminAuth, (req, res) => {
  const i = readBillInput(req.body);
  if (!i.title) return res.status(400).json({ error: 'title_required' });
  db.prepare('INSERT INTO bills (date, title, kind, amount, note, period_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(i.date, i.title, i.kind, i.amount, i.note, i.periodId, nowIso());
  res.json(ledger());
});

app.put('/api/admin/bills/:id', adminAuth, (req, res) => {
  const b = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'not_found' });
  const i = readBillInput({
    date: req.body?.date ?? b.date,
    title: req.body?.title ?? b.title,
    kind: req.body?.kind ?? b.kind,
    amount: req.body?.amount ?? b.amount,
    note: req.body?.note ?? b.note,
    periodId: req.body?.periodId !== undefined ? req.body.periodId : b.period_id,
  });
  db.prepare('UPDATE bills SET date=?, title=?, kind=?, amount=?, note=?, period_id=? WHERE id=?')
    .run(i.date, i.title, i.kind, i.amount, i.note, i.periodId, b.id);
  res.json(ledger());
});

app.delete('/api/admin/bills/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM bills WHERE id = ?').run(Number(req.params.id));
  res.json(ledger());
});

// 账单自动计算：某期商品「实际金额」合计
app.get('/api/admin/periods/:id/bill-auto', adminAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'bad_id' });
  res.json({ total: periodProductsTotal(id) });
});

// ================= 用户库 =================
// ================= 数据备份 =================
app.get('/api/admin/export', adminAuth, (req, res) => res.json(exportAll()));
app.post('/api/admin/import', adminAuth, (req, res) => {
  if (!req.body || typeof req.body !== 'object' || !req.body.tables) {
    return res.status(400).json({ error: 'bad_data' });
  }
  try {
    const counts = importAll(req.body);
    res.json({ ok: true, counts });
  } catch (e) {
    res.status(400).json({ error: 'import_failed', message: String(e && e.message) });
  }
});

app.get('/api/admin/users', adminAuth, (req, res) => res.json(listUsers({
  page: Number(req.query.page) || 1,
  pageSize: Math.min(Number(req.query.pageSize) || 10, 50),
  q: (req.query.q ?? '').toString(),
})));
app.get('/api/admin/users/:name', adminAuth, (req, res) => {
  let name;
  try {
    name = decodeURIComponent(req.params.name);
  } catch {
    return res.status(400).json({ error: 'bad_name' });
  }
  const d = userDetail(name);
  if (!d) return res.status(404).json({ error: 'not_found' });
  res.json(d);
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// 生产部署：同源伺服前台(/)与后台(/admin)的静态文件（由构建注入到 server/public）。
// 开发期不存在 public/，此段不生效，前端仍走各自 Vite dev server。
const webDir = path.join(__dirname, '..', 'public', 'web');
const adminDir = path.join(__dirname, '..', 'public', 'admin');
if (fs.existsSync(adminDir)) {
  app.use('/admin', express.static(adminDir));
  app.get('/admin/*', (req, res) => res.sendFile(path.join(adminDir, 'index.html')));
}
if (fs.existsSync(webDir)) {
  app.use(express.static(webDir));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/admin')) {
      return res.status(404).end();
    }
    res.sendFile(path.join(webDir, 'index.html')); // SPA 回退：/lottery/:id、/bill 等
  });
}

app.listen(PORT, HOST, () => {
  console.log(`生活系统后端已启动: http://localhost:${PORT} (监听 ${HOST}:${PORT})`);
});
