// style key -> 组件。所有 style 共用同一套 props/emits 契约。
import Style1Maximalism from './Style1Maximalism.vue';
import Style2Sketch from './Style2Sketch.vue';
import Style3Bauhaus from './Style3Bauhaus.vue';
import Style4Terminal from './Style4Terminal.vue';
import Style5Material from './Style5Material.vue';
import Style6Academia from './Style6Academia.vue';
import Style7Cyberpunk from './Style7Cyberpunk.vue';
import Style8Geometric from './Style8Geometric.vue';
import Style9Botanical from './Style9Botanical.vue';
import Style10Vaporwave from './Style10Vaporwave.vue';
import Style11Neumorphism from './Style11Neumorphism.vue';
import Style12Retro from './Style12Retro.vue';

export const STYLE_COMPONENTS = {
  style1: Style1Maximalism,
  style2: Style2Sketch,
  style3: Style3Bauhaus,
  style4: Style4Terminal,
  style5: Style5Material,
  style6: Style6Academia,
  style7: Style7Cyberpunk,
  style8: Style8Geometric,
  style9: Style9Botanical,
  style10: Style10Vaporwave,
  style11: Style11Neumorphism,
  style12: Style12Retro,
};

// 后台/首页展示用的中文标签
export const STYLE_LABELS = {
  style1: '极繁主义',
  style2: '手绘随笔',
  style3: '包豪斯',
  style4: '终端',
  style5: 'Material',
  style6: '学院风',
  style7: '赛博朋克',
  style8: '趣味几何',
  style9: '植物自然',
  style10: '蒸汽波',
  style11: '新拟态',
  style12: '复古',
};

export const STYLE_KEYS = Object.keys(STYLE_COMPONENTS);

// 期数风格也可设为 'random'：每次进入随机一种
STYLE_LABELS.random = '随机';

export function randomStyleKey() {
  return STYLE_KEYS[Math.floor(Math.random() * STYLE_KEYS.length)];
}

export function resolveStyle(key) {
  const real = key === 'random' ? randomStyleKey() : key;
  return STYLE_COMPONENTS[real] || Style1Maximalism;
}
