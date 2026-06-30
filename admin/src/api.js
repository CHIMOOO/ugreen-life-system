// 后台接口客户端。token 存于 localStorage，随请求头 x-admin-token 发送。
const BASE = import.meta.env.VITE_API_BASE || '';
// 开发期前台在 41132；生产同源部署时构建前设 VITE_WEB_BASE=（空串）让链接走相对路径 /lottery/:id
const _web = import.meta.env.VITE_WEB_BASE;
export const WEB_BASE = _web === undefined ? 'http://localhost:41132' : _web;

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
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: payload });
  } catch {
    return { ok: false, status: 0, data: null }; // 网络错误 / 后端不可达
  }
  if (res.status === 401 && path !== '/api/admin/login') {
    clearToken();
    if (typeof location !== 'undefined') location.reload(); // token 失效：清掉并回登录页，避免卡在后台
    return { ok: false, status: 401, data: null };
  }
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
  configDefaults: () => req('/api/config/defaults'),
  exportData: () => req('/api/admin/export'),
  importData: (body) => req('/api/admin/import', { method: 'POST', body }),
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
  // 用户库（分页 + 按姓名搜索）
  users: ({ page = 1, q = '' } = {}) =>
    req(`/api/admin/users?page=${Number(page) || 1}&q=${encodeURIComponent(q)}`),
  userDetail: (name) => req('/api/admin/users/' + encodeURIComponent(name)),
  // 账单
  bills: () => req('/api/admin/bills'),
  createBill: (b) => req('/api/admin/bills', { method: 'POST', body: b }),
  updateBill: (id, b) => req('/api/admin/bills/' + id, { method: 'PUT', body: b }),
  deleteBill: (id) => req('/api/admin/bills/' + id, { method: 'DELETE' }),
  simulate: (id) => req('/api/admin/periods/' + id + '/simulate', { method: 'POST', body: {} }),
  draw: (id) => req('/api/admin/periods/' + id + '/draw', { method: 'POST', body: {} }),
  reopen: (id) => req('/api/admin/periods/' + id + '/reopen', { method: 'POST', body: {} }),
  setInvalid: (id, name, invalid) => req('/api/admin/periods/' + id + '/invalid', { method: 'POST', body: { name, invalid } }),
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
