// 统一接口客户端。开发期经 Vite 代理到后端，用相对路径即可。
const API_BASE = import.meta.env.VITE_API_BASE || '';

async function req(path, opts) {
  const res = await fetch(API_BASE + path, opts);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* 忽略非 JSON 响应 */
  }
  return { ok: res.ok, status: res.status, data };
}

function jsonPost(path, body) {
  return req(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function assetUrl(p) {
  if (!p) return '';
  if (/^https?:\/\//.test(p)) return p;
  return API_BASE + p;
}

export const api = {
  config: () => req('/api/config'),
  active: () => req('/api/active'),
  periods: () => req('/api/periods'),
  period: (id) => req('/api/periods/' + id),
  submit: (id, body) => jsonPost('/api/periods/' + id + '/entries', body),
  // body: { productId, level, clientId }
  rateTea: (id, body) => jsonPost('/api/periods/' + id + '/tea', body),
};
