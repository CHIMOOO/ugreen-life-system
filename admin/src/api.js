// 后台接口客户端。token 存于 localStorage，随请求头 x-admin-token 发送。
const BASE = import.meta.env.VITE_API_BASE || '';
export const WEB_BASE = import.meta.env.VITE_WEB_BASE || 'http://localhost:41132';

const TOKEN_KEY = 'admin_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export function assetUrl(p) {
  if (!p) return '';
  if (/^https?:\/\//.test(p)) return p;
  return BASE + p;
}

async function req(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = { 'x-admin-token': getToken() };
  let payload;
  if (isForm) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, data };
}

export const admin = {
  login: (password) => req('/api/admin/login', { method: 'POST', body: { password } }),
  // 系统配置
  getConfig: () => req('/api/admin/config'),
  saveConfig: (body) => req('/api/admin/config', { method: 'PUT', body }),
  // 商品库
  products: () => req('/api/admin/products'),
  createProduct: (body) => req('/api/admin/products', { method: 'POST', body }),
  updateProduct: (id, body) => req('/api/admin/products/' + id, { method: 'PUT', body }),
  deleteProduct: (id) => req('/api/admin/products/' + id, { method: 'DELETE' }),
  // 期数
  list: () => req('/api/admin/periods'),
  get: (id) => req('/api/admin/periods/' + id),
  create: (p) => req('/api/admin/periods', { method: 'POST', body: p }),
  update: (id, p) => req('/api/admin/periods/' + id, { method: 'PUT', body: p }),
  remove: (id) => req('/api/admin/periods/' + id, { method: 'DELETE' }),
  activate: (id) => req('/api/admin/periods/' + id + '/activate', { method: 'POST', body: {} }),
  deactivate: (id) => req('/api/admin/periods/' + id + '/deactivate', { method: 'POST', body: {} }),
  billAuto: (id) => req('/api/admin/periods/' + id + '/bill-auto'),
  // 账单
  bills: () => req('/api/admin/bills'),
  createBill: (b) => req('/api/admin/bills', { method: 'POST', body: b }),
  updateBill: (id, b) => req('/api/admin/bills/' + id, { method: 'PUT', body: b }),
  deleteBill: (id) => req('/api/admin/bills/' + id, { method: 'DELETE' }),
  simulate: (id) => req('/api/admin/periods/' + id + '/simulate', { method: 'POST', body: {} }),
  draw: (id) => req('/api/admin/periods/' + id + '/draw', { method: 'POST', body: {} }),
  reopen: (id) => req('/api/admin/periods/' + id + '/reopen', { method: 'POST', body: {} }),
  upload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return req('/api/admin/upload', { method: 'POST', body: fd, isForm: true });
  },
};

export const STYLE_OPTIONS = [
  { v: 'random', label: '🎲 随机（每次进入随机一种风格）' },
  { v: 'style1', label: '极繁主义 · Maximalism' },
  { v: 'style2', label: '手绘随笔 · Sketch' },
  { v: 'style3', label: '包豪斯 · Bauhaus' },
  { v: 'style4', label: '终端 · Terminal' },
  { v: 'style5', label: 'Material Design' },
  { v: 'style6', label: '学院风 · Academia' },
  { v: 'style7', label: '赛博朋克 · Cyberpunk' },
  { v: 'style8', label: '趣味几何 · Playful Geometric' },
  { v: 'style9', label: '植物自然 · Botanical' },
  { v: 'style10', label: '蒸汽波 · Vaporwave' },
  { v: 'style11', label: '新拟态 · Neumorphism' },
  { v: 'style12', label: '复古 · Retro' },
];
