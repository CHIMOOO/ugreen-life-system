import { ref, computed, watch } from 'vue';
import { useLotteryForm, winnersByPrize, skippedInvalids } from './useLottery.js';

// 12 套 style 的「交互逻辑」完全一致，只有配色与模板不同。
// 这里把抽奖表单/规则确认弹窗/评分/撤销与全部派生状态收敛到一处：
// 每套 style 只负责自己的视觉（ACCENTS / 模板 / 主题专属小工具），
// 逻辑改一处即可全量生效（如「撤销后不再重复弹确认框」不必再改 12 个文件）。
//
// 用法（在 style 的 <script setup> 里）：
//   const { name, number, showForm, doSubmit, doCancel, ... } = useStyleShell(props, emit);
// props 需含 period/config/submitting/submitState/votedProducts/ratingBusy/nameStatus；
// emit 需声明 ['submit','rate','name-input','cancel']。
export function useStyleShell(props, emit) {
  const { name, number, validate } = useLotteryForm();
  const localError = ref('');
  const showConfirm = ref(false); // 提交前的规则确认弹窗
  const pending = ref(null); // 待确认提交的 { name, number }
  const confirmCancel = ref(false); // 「已参与」面板两步撤销的确认态

  const isDrawn = computed(() => props.period.status === 'drawn');
  const lotteryOn = computed(() => props.period.lotteryEnabled);
  const teaOn = computed(() => props.period.teaEnabled && props.period.tea?.products?.length);
  const joined = computed(() => ['success', 'joined'].includes(props.submitState.status));
  const showForm = computed(() => lotteryOn.value && !isDrawn.value && !joined.value);
  const result = computed(() => props.period.result);
  const prizeGroups = computed(() => (result.value ? winnersByPrize(result.value) : []));
  // 被判无效而触发顺延递补的参与者（有则在结果页展示「无效顺延」规则块）
  const skipped = computed(() => (result.value ? skippedInvalids(result.value) : []));
  const errorMsg = computed(
    () => localError.value || (props.submitState.status === 'error' ? props.submitState.message : '')
  );

  function doSubmit() {
    localError.value = '';
    const r = validate();
    if (r.error) { localError.value = r.error; return; }
    pending.value = { name: r.name, number: r.number };
    showConfirm.value = true; // 先弹规则确认，确认后才真正提交
  }
  function confirmSubmit() {
    if (props.submitting || !pending.value) return;
    emit('submit', pending.value);
  }
  function doRate(productId, level) { emit('rate', { productId, level }); }
  // 「已参与」面板撤销：两步确认，避免误点丢失幸运数字（数字不可找回）。
  // 撤销后清空号码与本地错误，回到干净的重填状态。
  function doCancel() { emit('cancel'); confirmCancel.value = false; localError.value = ''; number.value = ''; }

  // 提交出错时关闭弹窗，让错误信息回到表单展示；成功/已参与也复位 showConfirm，
  // 否则「已参与」整块卸载后 showConfirm 仍为 true，撤销回到表单会立刻重现确认框。
  watch(() => props.submitState.status, (s) => {
    if (['error', 'success', 'joined'].includes(s)) showConfirm.value = false;
  });

  return {
    name, number, localError, showConfirm, pending, confirmCancel,
    isDrawn, lotteryOn, teaOn, joined, showForm, result, prizeGroups, skipped, errorMsg,
    doSubmit, confirmSubmit, doRate, doCancel,
  };
}
