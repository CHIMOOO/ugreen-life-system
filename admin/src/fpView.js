// 指纹信号的读取 / 展示辅助，后台「用户管理」与「评价管理」共用。
// 消费的是 recordFingerprint 落库的 details.client.* 规范化字段（形状见 web/src/fingerprint.js），
// 改指纹落库形状时要同步这里。

export const fmtTime = (t) => (t || '').replace('T', ' ').slice(0, 19);

// 指纹动作 kind → 标签 + 配色（lottery 抽奖 / rating 评分 / cancel 撤销 / review 评价）
export function kindMeta(k) {
  switch (k) {
    case 'cancel':
      return { label: '撤销', cls: 'bg-rose-100 text-rose-700' };
    case 'rating':
      return { label: '评分', cls: 'bg-amber-100 text-amber-700' };
    case 'review':
      return { label: '评价', cls: 'bg-sky-100 text-sky-700' };
    default:
      return { label: '抽奖', cls: 'bg-indigo-100 text-indigo-700' };
  }
}

// 旧版本记录（指纹增强前）：details 为空，除了姓名/时间没有可展示的信号。
export function isLegacy(f) {
  const d = f && f.details;
  if (!d || typeof d !== 'object') return true;
  return !d.client && !d.server && !d.visitorId;
}

// 从一条指纹记录里抽取便于阅读的关键信号
export function fpView(f) {
  const d = (f && f.details) || {};
  const c = d.client || {};
  const s = d.server || {};
  const ch = c.clientHints || {};
  const conf = c.confidence || {};
  const browser = (Array.isArray(ch.fullVersionList) && ch.fullVersionList[0])
    || (Array.isArray(ch.brands) && ch.brands[ch.brands.length - 1])
    || '';
  const os = ch.platform ? `${ch.platform} ${ch.platformVersion || ''}`.trim() : (c.osCpu || c.platform || '');
  return {
    // visitorId 优先取 client 里 FPJS 的稳定 id，退到顶层 id（recordFingerprint 会回填）
    visitorId: c.visitorId || d.id || '',
    confidence: typeof conf.score === 'number' ? Math.round(conf.score * 100) : null,
    fpVersion: c.fpVersion || '',
    ip: (f && f.ip) || s.ip || '—',
    ua: (f && f.ua) || s.ua || '',
    browser,
    os,
    arch: ch.architecture ? `${ch.architecture}${ch.bitness ? '/' + ch.bitness : ''}` : '',
    screen: c.screen ? `${c.screen}${c.devicePixelRatio ? ' @' + c.devicePixelRatio + 'x' : ''}` : '',
    timezone: c.timezone || '',
    lang: c.languages || s.acceptLanguage || '',
    gpu: (c.webgl && c.webgl.renderer) || '',
    fonts: Array.isArray(c.fonts) ? c.fonts.length : 0,
    canvas: c.canvasHash || '',
    audio: c.audioHash || '',
    cores: c.hardwareConcurrency,
    mem: c.deviceMemory,
  };
}
