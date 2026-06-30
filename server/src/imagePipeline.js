// 图片转码：把上传的 jpeg/png/webp 统一压成体积最小的 WebP（质量可配）。
// 纯 WASM（@jsquash），无原生依赖——与本项目「构建快、镜像小、无原生依赖」一致。
//
// 关键点：Node 的 fetch 不支持 file:// 协议，而 @jsquash 默认用 fetch 加载随包的 .wasm。
// 这里打一个最小补丁：拦截 file:// 读本地文件返回 Response，其它请求原样转发。
// 这样无需逐 codec 手动 init，也不必处理 SIMD / wasm-bindgen 差异。

import { readFile } from 'node:fs/promises';

if (!globalThis.__jsquashFetchPatched) {
  const _fetch = globalThis.fetch;
  globalThis.fetch = async (resource, options) => {
    try {
      const url = resource instanceof URL ? resource
        : (resource && resource.url ? new URL(resource.url) : new URL(String(resource)));
      if (url.protocol === 'file:') {
        const buf = await readFile(url);
        const isWasm = url.pathname.endsWith('.wasm');
        return new Response(buf, {
          status: 200,
          headers: { 'Content-Type': isWasm ? 'application/wasm' : 'application/octet-stream' },
        });
      }
    } catch { /* 读不到就走原 fetch */ }
    return _fetch(resource, options);
  };
  globalThis.__jsquashFetchPatched = true;
}

// 按魔数判断图片类型（比 mimetype 可靠，文件头被改也不怕）
function sniff(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'webp';
  return null;
}

function asArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

// 把 jpeg/png/webp 缓冲转成 WebP（quality 1-100）。
// 不认识的格式（gif/svg/bmp/avif…）或转码失败 → 返回 null，调用方按原文件保存（不丢图）。
export async function toWebp(buffer, quality = 90) {
  const kind = sniff(buffer);
  if (!kind) return null;
  const q = Math.min(100, Math.max(1, Math.round(Number(quality) || 90)));
  try {
    const ab = asArrayBuffer(buffer);
    let imageData;
    if (kind === 'jpeg') {
      const { decode } = await import('@jsquash/jpeg');
      imageData = await decode(ab);
    } else if (kind === 'png') {
      const { decode } = await import('@jsquash/png');
      imageData = await decode(ab);
    } else {
      const { decode } = await import('@jsquash/webp');
      imageData = await decode(ab);
    }
    const { encode } = await import('@jsquash/webp');
    const out = await encode(imageData, { quality: q });
    return Buffer.from(out);
  } catch (e) {
    console.warn('[upload] WebP 转码失败，按原文件保存：', e && e.message);
    return null;
  }
}
