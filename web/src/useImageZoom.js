import { ref } from 'vue';

// 通用「点击放大图片」预览：模块级单例，任意组件 openZoom(src) 即可弹出全屏预览。
const zoomSrc = ref('');

export function openZoom(src) {
  if (src) zoomSrc.value = src;
}
export function closeZoom() {
  zoomSrc.value = '';
}
export function useImageZoom() {
  return { zoomSrc, openZoom, closeZoom };
}
