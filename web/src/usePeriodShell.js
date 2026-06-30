import { ref } from 'vue';
import { api } from './api.js';
import {
  submitErrorText, getClientId, setStoredName, getStoredName,
  alreadyJoined, markJoined, hasVotedProduct, markVotedProduct,
} from './useLottery.js';
import { getFingerprint } from './fingerprint.js';

// 抽奖提交 + 下午茶评分的共享逻辑，供首页与 /lottery/:id 复用。
// periodRef 是一个 ref，指向当前展示的 period 对象（含 id、tea.products 等）。
export function usePeriodShell(periodRef) {
  const submitting = ref(false);
  const submitState = ref({ status: 'idle', message: '' }); // idle|success|joined|error
  const votedProducts = ref({}); // { [productId]: true }
  const ratingBusy = ref({});

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
    const { ok, data } = await api.submit(p.id, { ...payload, fingerprint: getFingerprint() });
    submitting.value = false;
    if (ok && data?.ok) {
      p.participantCount = data.participantCount;
      submitState.value = { status: 'success', message: '提交成功，请等待开奖！' };
      setStoredName(payload.name); // 记住姓名，之后各页自动回填
      markJoined(p.id);
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
      name: getStoredName(), fingerprint: getFingerprint(),
    });
    ratingBusy.value = { ...ratingBusy.value, [productId]: false };
    if ((ok || status === 409) && data?.ratings) {
      const prod = (p.tea?.products || []).find((x) => x.id === productId);
      if (prod) prod.ratings = data.ratings;
      votedProducts.value = { ...votedProducts.value, [productId]: true };
      markVotedProduct(p.id, productId);
    }
  }

  return { submitting, submitState, votedProducts, ratingBusy, onSubmit, onRate, syncLocal };
}
