// 浏览器指纹采集（仅供参考统计、可追溯，不追求严谨/唯一）。
// 综合多类高熵信号：Canvas / WebGL / Audio / 字体 / 屏幕 / 时区 / Client Hints / 网络 等，
// 前端拿不到或不稳定的（来源 IP、完整 UA 版本、机型架构…）由后端在落库时补全（见 server serverSignals）。
// 信号是异步采集的：进入页面即 initFingerprint() 预热缓存，提交时 await getFingerprint() 取结果。

function hash(str) {
  // FNV-1a 32 位
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

function canvasFp() {
  try {
    const c = document.createElement('canvas');
    c.width = 260;
    c.height = 60;
    const ctx = c.getContext('2d');
    if (!ctx) return '';
    ctx.textBaseline = 'top';
    ctx.font = "16px 'Arial'";
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('生活系统 Fingerprint 😃 0123', 2, 15);
    ctx.fillStyle = 'rgba(102,204,0,0.7)';
    ctx.fillText('生活系统 Fingerprint 😃 0123', 4, 17);
    return c.toDataURL();
  } catch {
    return '';
  }
}

function webglFp() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return null;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
      glsl: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxViewport: (gl.getParameter(gl.MAX_VIEWPORT_DIMS) || []).join('x'),
      extensions: (gl.getSupportedExtensions() || []).length,
    };
  } catch {
    return null;
  }
}

async function audioFp() {
  try {
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Ctx) return '';
    const ctx = new Ctx(1, 44100, 44100);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 10000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -50;
    comp.knee.value = 40;
    comp.ratio.value = 12;
    comp.attack.value = 0;
    comp.release.value = 0.25;
    osc.connect(comp);
    comp.connect(ctx.destination);
    osc.start(0);
    const buf = await ctx.startRendering();
    const data = buf.getChannelData(0);
    let sum = 0;
    for (let i = 4500; i < 5000; i++) sum += Math.abs(data[i]);
    return sum.toString();
  } catch {
    return '';
  }
}

function fontsFp() {
  try {
    if (!document.body) return [];
    const base = ['monospace', 'sans-serif', 'serif'];
    const test = [
      'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Tahoma', 'Helvetica',
      'Comic Sans MS', 'Segoe UI', 'Roboto', 'Microsoft YaHei', '微软雅黑', 'SimSun', '宋体',
      'SimHei', '黑体', 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans CJK SC', 'WenQuanYi Micro Hei',
    ];
    const span = document.createElement('span');
    span.style.cssText = 'position:absolute;left:-9999px;top:-9999px;font-size:72px;line-height:normal;visibility:hidden';
    span.textContent = 'mmmmmmmmmlli微软雅黑';
    document.body.appendChild(span);
    const baseSize = {};
    for (const b of base) {
      span.style.fontFamily = b;
      baseSize[b] = { w: span.offsetWidth, h: span.offsetHeight };
    }
    const available = [];
    for (const f of test) {
      let detected = false;
      for (const b of base) {
        span.style.fontFamily = `'${f}',${b}`;
        if (span.offsetWidth !== baseSize[b].w || span.offsetHeight !== baseSize[b].h) {
          detected = true;
          break;
        }
      }
      if (detected) available.push(f);
    }
    document.body.removeChild(span);
    return available;
  } catch {
    return [];
  }
}

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

async function mediaKinds() {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return null;
    const list = await navigator.mediaDevices.enumerateDevices();
    const counts = {};
    for (const d of list) counts[d.kind] = (counts[d.kind] || 0) + 1;
    return counts;
  } catch {
    return null;
  }
}

async function compute() {
  const n = navigator;
  const details = {};
  try {
    details.userAgent = n.userAgent || '';
    details.language = n.language || '';
    details.languages = (n.languages || []).join(',');
    details.platform = n.platform || '';
    details.vendor = n.vendor || '';
    details.hardwareConcurrency = n.hardwareConcurrency ?? '';
    details.deviceMemory = n.deviceMemory ?? '';
    details.maxTouchPoints = n.maxTouchPoints ?? '';
    details.touch = 'ontouchstart' in window || (n.maxTouchPoints || 0) > 0;
    details.cookieEnabled = n.cookieEnabled;
    details.doNotTrack = n.doNotTrack || window.doNotTrack || '';
    details.pdfViewerEnabled = n.pdfViewerEnabled ?? '';
    details.webdriver = n.webdriver ?? '';

    details.screen = `${screen.width}x${screen.height}`;
    details.availScreen = `${screen.availWidth}x${screen.availHeight}`;
    details.colorDepth = screen.colorDepth;
    details.pixelDepth = screen.pixelDepth;
    details.devicePixelRatio = window.devicePixelRatio || 1;
    details.orientation = screen.orientation?.type || '';

    const dtf = Intl.DateTimeFormat().resolvedOptions();
    details.timezone = dtf.timeZone || '';
    details.locale = dtf.locale || '';
    details.timezoneOffset = new Date().getTimezoneOffset();

    details.storage = {
      local: (() => { try { return !!window.localStorage; } catch { return false; } })(),
      session: (() => { try { return !!window.sessionStorage; } catch { return false; } })(),
      indexedDB: !!window.indexedDB,
    };

    const conn = n.connection || n.mozConnection || n.webkitConnection;
    if (conn) {
      details.network = { effectiveType: conn.effectiveType, downlink: conn.downlink, rtt: conn.rtt, saveData: conn.saveData };
    }

    details.canvasHash = (() => { const c = canvasFp(); return c ? hash16(c) : ''; })();
    details.webgl = webglFp();
    const audio = await audioFp();
    details.audioHash = audio ? hash16(audio) : '';
    details.fonts = fontsFp();
    details.clientHints = await clientHints();
    details.mediaKinds = await mediaKinds();
  } catch {
    /* 尽量保留已采集的部分 */
  }

  // 稳定子集 → 稳定 id（同一浏览器多次提交保持一致，便于追溯）
  const stable = [
    details.canvasHash, details.audioHash, JSON.stringify(details.webgl || ''),
    (details.fonts || []).join(','), details.screen, details.colorDepth, details.timezone,
    details.languages, details.platform, details.hardwareConcurrency, details.deviceMemory,
    details.vendor, JSON.stringify(details.clientHints || ''),
  ].join('|');
  const id = hash16(stable);

  const ch = details.clientHints;
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
// 加 1.5s 超时兜底：个别环境下 Audio/WebGL 采集偏慢，避免「提交」按钮长时间转圈。
export async function getFingerprint() {
  if (cached) return cached;
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
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
