// 轻量浏览器指纹采集（仅供参考统计、可追溯，不追求严谨/唯一）。
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

export function getFingerprint() {
  try {
    const n = navigator;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const ua = n.userAgent || '';
    const browser = (ua.match(/(Edg|Chrome|Firefox|Safari)\/[\d.]+/) || ['UA'])[0];
    const raw = [
      ua, n.language, (n.languages || []).join(','),
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      tz, n.hardwareConcurrency, n.platform, n.deviceMemory || '',
    ].join('|');
    const id = hash(raw);
    const summary = `${n.platform || '?'} · ${browser} · ${screen.width}x${screen.height} · ${tz}`;
    return `${id} · ${summary}`;
  } catch {
    return 'na · 采集失败';
  }
}
