import { ref } from 'vue';

// ---------- 抽奖提交：错误码 -> 文案 ----------
export const SUBMIT_ERRORS = {
  name_required: '请填写姓名',
  name_too_long: '姓名过长（最多 30 字）',
  number_range: '幸运数字需为 1 - 9999 的整数',
  name_taken: '该姓名已被使用，请换一个',
  number_taken: '该幸运数字已被占用，请换一个',
  closed: '本期已开奖，无法再参与',
  lottery_disabled: '本期未开启抽奖',
  duplicate: '提交重复，请重试',
};
export function submitErrorText(code) {
  return SUBMIT_ERRORS[code] || '提交失败，请稍后再试';
}

// 单步开奖的中文解释，所有 style 共用同一套措辞。
export function stepExplain(step) {
  return (
    `本轮共 ${step.poolSize} 人，幸运数字之和为 ${step.poolSum}，` +
    `${step.poolSum} ÷ ${step.poolSize} 余 ${step.remainder}；` +
    `按数字从小到大第 ${step.remainder + 1} 位是 ${step.winner.name}（幸运数字 ${step.winner.number}），` +
    `中得「${step.prizeName}」。`
  );
}

// 中奖者按奖品名分组
export function winnersByPrize(result) {
  const map = new Map();
  for (const w of result.winners) {
    if (!map.has(w.prizeName)) map.set(w.prizeName, { prizeName: w.prizeName, image: w.image, list: [] });
    map.get(w.prizeName).list.push(w);
  }
  return [...map.values()];
}

// 被判无效、且落在「中奖区间」内因而触发顺延的参与者（供结果页展示「无效顺延」规则）。
// 逻辑：按抽取排名 ranking 从前往后数「有效者」，凑够 winners.length 个名额即停；
// 期间遇到的无效者就是被跳过、导致后一位递补的人。返回 [{rank,name,number}...]，无则空数组。
// 若某无效者排在名额填满之后（本来也中不了），不算顺延、不列出。
export function skippedInvalids(result) {
  if (!result || !Array.isArray(result.ranking) || !Array.isArray(result.winners)) return [];
  const totalSlots = result.winners.length;
  let valid = 0;
  const skipped = [];
  for (const r of result.ranking) {
    if (valid >= totalSlots) break; // 名额已满，之后的无效者本就中不了，不算顺延
    if (r.invalid) skipped.push({ rank: r.rank, name: r.name, number: r.number });
    else valid++;
  }
  return skipped;
}

// 姓名记忆：用户填过一次后存浏览器，之后各页自动回填
export function getStoredName() {
  try {
    return localStorage.getItem('user_name') || '';
  } catch {
    return '';
  }
}
export function setStoredName(name) {
  try {
    localStorage.setItem('user_name', String(name || '').trim());
  } catch {
    /* ignore */
  }
}

// ---------- 抽奖表单 ----------
export function useLotteryForm() {
  const name = ref(getStoredName()); // 自动回填上次填写的姓名
  const number = ref('');
  function validate() {
    const nm = String(name.value || '').trim();
    const n = Number(number.value);
    if (!nm) return { error: '请填写姓名' };
    if (!Number.isInteger(n) || n < 1 || n > 9999) return { error: '幸运数字需为 1 - 9999 的整数' };
    return { name: nm, number: n };
  }
  function reset() { name.value = ''; number.value = ''; }
  return { name, number, validate, reset };
}

// 商品内部字段（渠道/价格/数量）的展示文案；仅当后台开启「对用户开放」时 prod.extra 才会下发。
export function teaExtraText(prod) {
  const e = prod && prod.extra;
  if (!e) return '';
  const parts = [];
  if (e.channel) parts.push(`渠道：${e.channel}`);
  if (e.price !== '' && e.price != null) parts.push(`¥${e.price}`);
  if (e.qty !== '' && e.qty != null) parts.push(`数量 ${e.qty}`);
  return parts.join(' · ');
}

// ---------- 下午茶评分 ----------
export const TEA_LEVELS = [
  { key: 'bad', label: '不推荐', emoji: '😕' },
  { key: 'ok', label: '还行', emoji: '🙂' },
  { key: 'good', label: '推荐', emoji: '😍' },
];

// 浏览器唯一标识（用于「每个浏览器每个商品只能评一次」+ 防重复刷）
export function getClientId() {
  try {
    let id = localStorage.getItem('client_id');
    if (!id) {
      id = 'c-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('client_id', id);
    }
    return id;
  } catch {
    return 'c-anon';
  }
}

// ---------- 本地参与/评分记录 ----------
// joined_<id> 存「本期提交时用的姓名」，撤销时据此精确删除对应记录。
// 旧版本只存标记位 '1'，此处对任意非空值都视为已参与，并在取名时回退到全局姓名。
export function alreadyJoined(periodId) {
  try { return !!localStorage.getItem('joined_' + periodId); } catch { return false; }
}
export function markJoined(periodId, name) {
  try { localStorage.setItem('joined_' + periodId, String(name || '').trim() || '1'); } catch { /* ignore */ }
}
// 本期提交时用的姓名：用于撤销。兼容旧标记位 '1'（回退到全局记忆的姓名）。
export function joinedName(periodId) {
  try {
    const v = localStorage.getItem('joined_' + periodId);
    return v && v !== '1' ? v : getStoredName();
  } catch { return getStoredName(); }
}
export function hasVotedProduct(periodId, productId) {
  try { return localStorage.getItem(`tea_${periodId}_${productId}`) === '1'; } catch { return false; }
}
export function markVotedProduct(periodId, productId) {
  try { localStorage.setItem(`tea_${periodId}_${productId}`, '1'); } catch { /* ignore */ }
}
