<script setup>
/*
 * 极简 Markdown 渲染（供规则文案用）。支持：# / ## / ### 标题、**加粗**、*斜体*、
 * - / * 无序列表、1. 有序列表、空行分段、单行内换行(<br>)。先转义 HTML 再套我们自己的标签，
 * 输入为后台可编辑文案（非匿名用户输入），安全性足够。样式见下方 :deep 基础排版，
 * 颜色继承父级（各主题的规则卡片各自设文字色），故 12 套主题都能自适应。
 */
import { computed } from 'vue';

const props = defineProps({ source: { type: String, default: '' } });

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// 行内：**加粗** / *斜体*（作用在已转义的文本上）
function inline(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
function render(md) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let list = null; // 'ul' | 'ol'
  let para = [];
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const flushPara = () => { if (para.length) { out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; } };
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) { flushPara(); closeList(); continue; }
    let m;
    if ((m = t.match(/^(#{1,3})\s+(.*)$/))) {
      flushPara(); closeList();
      const lvl = m[1].length;
      out.push(`<h${lvl}>${inline(escapeHtml(m[2]))}</h${lvl}>`);
    } else if ((m = t.match(/^[-*]\s+(.*)$/))) {
      flushPara();
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push('<li>' + inline(escapeHtml(m[1])) + '</li>');
    } else if ((m = t.match(/^\d+\.\s+(.*)$/))) {
      flushPara();
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push('<li>' + inline(escapeHtml(m[1])) + '</li>');
    } else {
      closeList();
      para.push(escapeHtml(t));
    }
  }
  flushPara(); closeList();
  return out.join('');
}
const rendered = computed(() => render(props.source));
</script>

<template>
  <div class="md" v-html="rendered"></div>
</template>

<style scoped>
/* 基础排版：颜色/字体继承父级，仅给间距与列表符号，令各主题自适应 */
.md :deep(h1), .md :deep(h2), .md :deep(h3) { font-weight: 800; line-height: 1.3; margin: 0.7em 0 0.3em; }
.md :deep(h1) { font-size: 1.15em; }
.md :deep(h2) { font-size: 1.08em; }
.md :deep(h3) { font-size: 1em; }
.md :deep(p) { margin: 0.45em 0; line-height: 1.7; }
.md :deep(ul), .md :deep(ol) { margin: 0.45em 0; padding-left: 1.4em; }
.md :deep(ul) { list-style: disc; }
.md :deep(ol) { list-style: decimal; }
.md :deep(li) { margin: 0.2em 0; line-height: 1.7; }
.md :deep(strong) { font-weight: 800; }
.md :deep(em) { font-style: italic; }
.md :deep(> :first-child) { margin-top: 0; }
.md :deep(> :last-child) { margin-bottom: 0; }
</style>
