import { ref } from 'vue';
import { api } from './api.js';
import {
  submitErrorText, getClientId, setStoredName, getStoredName,
  alreadyJoined, markJoined, joinedName, hasVotedProduct, markVotedProduct,
} from './useLottery.js';
import { getFingerprint } from './fingerprint.js';

// 抽奖提交 + 下午茶评分的共享逻辑，供首页与 /lottery/:id 复用。
// periodRef 是一个 ref，指向当前展示的 period 对象（含 id、tea.products 等）。
export function usePeriodShell(periodRef) {
  const submitting = ref(false);
  const submitState = ref({ status: 'idle', message: '' }); // idle|success|joined|error
  const votedProducts = ref({}); // { [productId]: true }
  const ratingBusy = ref({});
  const nameStatus = ref({ exists: false, checking: false }); // 当前姓名是否已提交
  let checkTimer = null;
  let checkSeq = 0; // 查重请求序号：只采纳最后一次的结果，避免慢请求覆盖快请求

  function syncLocal() {
    const p = periodRef.value;
    if (!p) return;
    if (alreadyJoined(p.id)) submitState.value = { status: 'joined', message: '' };
    const voted = {};
    for (const prod of p.tea?.products || []) {
      if (hasVotedProduct(p.id, prod.id)) voted[prod.id] = true;
    }
    votedProducts.value = voted;
  }

  async function onSubmit(payload) {
    const p = periodRef.value;
    if (!p) return;
    submitting.value = true;
    submitState.value = { status: 'idle', message: '' };
    const { ok, data } = await api.submit(p.id, { ...payload, fingerprint: await getFingerprint() });
    submitting.value = false;
    if (ok && data?.ok) {
      p.participantCount = data.participantCount;
      submitState.value = { status: 'success', message: '提交成功，请等待开奖！' };
      setStoredName(payload.name); // 记住姓名，之后各页自动回填
      markJoined(p.id, payload.name); // 记下本期提交姓名，供「已参与」面板撤销使用
      clearTimeout(checkTimer); // 提交成功后取消未落定的查重，避免迟到结果刷新状态
      nameStatus.value = { exists: false, checking: false };
    } else {
      submitState.value = { status: 'error', message: submitErrorText(data?.error) };
    }
  }

  async function onRate({ productId, level }) {
    const p = periodRef.value;
    if (!p || votedProducts.value[productId] || ratingBusy.value[productId]) return;
    ratingBusy.value = { ...ratingBusy.value, [productId]: true };
    const { ok, status, data } = await api.rateTea(p.id, {
      productId, level, clientId: getClientId(),
      name: getStoredName(), fingerprint: await getFingerprint(),
    });
    ratingBusy.value = { ...ratingBusy.value, [productId]: false };
    if ((ok || status === 409) && data?.ratings) {
      const prod = (p.tea?.products || []).find((x) => x.id === productId);
      if (prod) prod.ratings = data.ratings;
      votedProducts.value = { ...votedProducts.value, [productId]: true };
      markVotedProduct(p.id, productId);
    }
  }

  // 防抖检查姓名是否已提交（输入姓名/数字时调用）
  function onNameInput(name) {
    const nm = String(name || '').trim();
    clearTimeout(checkTimer);
    if (!nm) {
      nameStatus.value = { exists: false, checking: false };
      return;
    }
    nameStatus.value = { ...nameStatus.value, checking: true };
    const seq = ++checkSeq;
    checkTimer = setTimeout(async () => {
      const p = periodRef.value;
      if (!p) return;
      const { data } = await api.checkName(p.id, nm);
      if (seq !== checkSeq) return; // 已有更新的查重发出，丢弃这条过期结果
      nameStatus.value = { exists: !!data?.exists, checking: false };
    }, 400);
  }

  // 撤销抽奖：按姓名删除（开奖前），记录指纹追溯，绝不回显号码
  // name 可为空（「已参与」面板的撤销按钮不带参数）：回退到本期提交时记下的姓名。
  async function onCancel(name) {
    const p = periodRef.value;
    if (!p) return;
    const nm = String(name || joinedName(p.id) || '').trim();
    if (!nm) return;
    const { ok, data } = await api.cancelEntry(p.id, { name: nm, fingerprint: await getFingerprint() });
    if (ok && data?.ok) {
      p.participantCount = data.participantCount;
      nameStatus.value = { exists: false, checking: false };
      if (['joined', 'success'].includes(submitState.value.status)) {
        submitState.value = { status: 'idle', message: '' };
      }
      try {
        localStorage.removeItem('joined_' + p.id);
      } catch {
        /* ignore */
      }
    }
  }

  return {
    submitting, submitState, votedProducts, ratingBusy, nameStatus,
    onSubmit, onRate, onNameInput, onCancel, syncLocal,
  };
}
