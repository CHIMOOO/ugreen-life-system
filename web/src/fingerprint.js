// 浏览器指纹采集（仅供参考统计、可追溯，不追求严谨/唯一）。
//
// 核心引擎用开源库 @fingerprintjs/fingerprintjs（MIT，纯前端，随包打包无需 CDN）：
//   - 产出稳定的 visitorId（同一浏览器多次访问保持一致，作为「指纹 id」）；
//   - 产出 components —— 全量原始信号（canvas/audio/字体/WebGL/屏幕/时区/语言…），
//     即后台「原始全量信号 JSON」里能看到的东西。
// 我们在其之上再补一层高熵 UA-Client-Hints（架构/机型/完整版本），FPJS 默认不采这些；
// 前端拿不到或不稳定的（来源 IP、UA、语言头、sec-ch-* 头）由后端落库时补全（见 server serverSignals）。
//
// 信号是异步采集的：进入页面即 initFingerprint() 预热，提交时 await getFingerprint() 取结果。
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// FNV-1a 32 位 → 用于把 canvas 等长值折成短 hash 便于后台一眼比对（原始值仍完整存在 details 里）。
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
function hash16(str) {
  return (hash(str) + hash('salt:' + str)).slice(0, 16);
}

// 安全读取 FPJS component 的 value（component 可能是 {value} 或 {error}）。
function cv(components, key) {
  const c = components && components[key];
  return c && 'value' in c ? c.value : undefined;
}

// 高熵 User-Agent Client Hints（FPJS 不采），需要安全上下文；拿不到就返回 null。
async function clientHints() {
  try {
    const uad = navigator.userAgentData;
    if (!uad) return null;
    const out = {
      brands: (uad.brands || []).map((b) => `${b.brand} ${b.version}`),
      mobile: uad.mobile,
      platform: uad.platform,
    };
    try {
      const high = await uad.getHighEntropyValues([
        'architecture', 'bitness', 'model', 'platformVersion', 'uaFullVersion', 'fullVersionList', 'formFactors', 'wow64',
      ]);
      Object.assign(out, high);
      if (Array.isArray(out.fullVersionList)) {
        out.fullVersionList = out.fullVersionList.map((b) => `${b.brand} ${b.version}`);
      }
    } catch {
      /* 高熵值被拒绝/不支持，保留低熵部分 */
    }
    return out;
  } catch {
    return null;
  }
}

// 从 FPJS components 里提炼后台「关键信号一览」需要的规范化字段（读不到就退到 navigator/screen）。
function normalizeSignals(components, ch) {
  const d = {};
  try {
    const n = navigator;
    d.userAgent = n.userAgent || '';
    // languages：FPJS 是 string[][]，拍平成逗号串
    const langs = cv(components, 'languages');
    d.languages = Array.isArray(langs) ? langs.flat().join(',') : (n.languages || []).join(',');
    d.language = n.language || '';
    d.platform = cv(components, 'platform') || n.platform || '';
    d.vendor = cv(components, 'vendor') || n.vendor || '';
    d.osCpu = cv(components, 'osCpu') || '';
    d.hardwareConcurrency = cv(components, 'hardwareConcurrency') ?? n.hardwareConcurrency ?? '';
    d.deviceMemory = cv(components, 'deviceMemory') ?? n.deviceMemory ?? '';
    d.touch = (() => { const t = cv(components, 'touchSupport'); return t ? t.maxTouchPoints > 0 || t.touchEvent : (n.maxTouchPoints || 0) > 0; })();

    // 屏幕：FPJS screenResolution 是方向无关的 [a, b]
    const sr = cv(components, 'screenResolution');
    d.screen = Array.isArray(sr) ? sr.join('x') : `${screen.width}x${screen.height}`;
    d.colorDepth = cv(components, 'colorDepth') ?? screen.colorDepth;
    d.devicePixelRatio = window.devicePixelRatio || 1;

    d.timezone = cv(components, 'timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || '';

    // WebGL（GPU 渲染器/厂商）——FPJS webGlBasics 里带 renderer/vendor
    const gl = cv(components, 'webGlBasics');
    if (gl && typeof gl === 'object') {
      d.webgl = { vendor: gl.vendor || '', renderer: gl.renderer || '', version: gl.version || '' };
    }

    d.fonts = cv(components, 'fonts') || [];

    // canvas/audio：原始值较长，折成短 hash 便于后台比对（完整值仍在 fingerprintjs 原始信号里）
    const canvas = cv(components, 'canvas');
    d.canvasHash = canvas ? hash16(JSON.stringify(canvas)) : '';
    const audio = cv(components, 'audio');
    d.audioHash = (audio || audio === 0) ? hash16(String(audio)) : '';

    d.clientHints = ch;
  } catch {
    /* 尽量保留已采集的部分 */
  }
  return d;
}

async function compute() {
  let visitorId = '';
  let confidence = null;
  let fpVersion = '';
  let components = {};
  try {
    const agent = await FingerprintJS.load({ monitoring: false }); // 不发安装统计请求
    const r = await agent.get();
    visitorId = r.visitorId || '';
    confidence = r.confidence || null;
    fpVersion = r.version || '';
    components = r.components || {};
  } catch {
    /* FPJS 采集失败：下面仍会用 navigator 兜底出一份可用的 details */
  }

  const ch = await clientHints();
  const details = normalizeSignals(components, ch);

  // 稳定 id：优先用 FPJS 的 visitorId；万一 FPJS 失败，用规范化信号折一个兜底 id。
  const stable = [
    details.canvasHash, details.audioHash, JSON.stringify(details.webgl || ''),
    (details.fonts || []).join(','), details.screen, details.colorDepth, details.timezone,
    details.languages, details.platform, details.hardwareConcurrency, details.deviceMemory,
    details.vendor, JSON.stringify(details.clientHints || ''),
  ].join('|');
  const id = visitorId || hash16(stable);

  details.visitorId = visitorId;
  details.confidence = confidence;
  details.fpVersion = fpVersion;
  details.fingerprintjs = components; // 全量原始信号（后台可展开查看）

  const plat = (ch && ch.platform) || details.platform || '?';
  const rend = (details.webgl && details.webgl.renderer) || '';
  const summary = [
    plat,
    `${details.screen}@${details.devicePixelRatio}x`,
    details.timezone,
    rend ? String(rend).slice(0, 48) : '',
  ].filter(Boolean).join(' · ');

  return { id, summary, details };
}

let cached = null;
let inflight = null;

// 进入页面即预热（不阻塞渲染）
export function initFingerprint() {
  if (cached || inflight) return;
  inflight = compute()
    .then((r) => { cached = r; inflight = null; return r; })
    .catch(() => { inflight = null; return null; });
}

// 提交时取指纹；首次会等待采集完成，之后走缓存。
// 加超时兜底：个别环境下采集偏慢，避免「提交」按钮长时间转圈。预热通常已让它命中缓存。
export async function getFingerprint() {
  if (cached) return cached;
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 2500));
  try {
    const r = await Promise.race([inflight || compute(), timeout]);
    if (r) {
      cached = r;
      return r;
    }
  } catch {
    /* 落到下面的占位兜底 */
  }
  // 超时/失败：返回占位但不缓存，预热的采集完成后下次提交即用完整指纹
  return cached || { id: 'na', summary: '采集中', details: {} };
}
