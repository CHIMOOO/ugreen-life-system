// 抽奖核心算法 —— 纯函数，无副作用，便于「真实开奖」与「模拟计算」共用。
//
// 规则：把当前奖池里所有人的幸运数字相加，除以总人数取余数。
// 把所有人按幸运数字「从小到大」排序，余数 0 指定第 1 个（最小），余数 1 指定第 2 个……
// 即 winner = sortedPool[ sum % poolSize ]。
//
// 当存在多个奖品 / 多个名额时：每抽出一位中奖者后将其移出奖池，
// 对「剩余的人」重新求和、重新取余，继续指定下一位。
// 这样每一步都使用同一条规则，结果可解释、可复现。

const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

/** 默认奖品名：一等奖、二等奖…… 超过十用「第N等奖」。 */
export function defaultPrizeName(index) {
  const n = index + 1;
  if (n <= 10) return `${CN_NUM[index]}等奖`;
  return `第${n}等奖`;
}

/** 规范化奖品数组：补默认名称、数量至少为 1、图片缺省为 null。 */
export function normalizePrizes(prizes) {
  const list = Array.isArray(prizes) ? prizes : [];
  if (list.length === 0) {
    // 没填奖品时，默认给一个一等奖（1 名）。
    return [{ name: defaultPrizeName(0), qty: 1, image: null }];
  }
  return list.map((p, i) => {
    const name = (p && typeof p.name === 'string' ? p.name.trim() : '') || defaultPrizeName(i);
    let qty = parseInt(p && p.qty, 10);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    const image = p && p.image ? String(p.image) : null;
    return { name, qty, image };
  });
}

/**
 * 计算开奖结果。
 * @param {{name:string, number:number}[]} entries 全部参与者
 * @param {{name:string, qty:number, image:string|null}[]} prizes 已规范化的奖品
 * @returns 结果对象（含每一步推导，供结果页主体展示算法过程）
 */
export function computeResult(entries, prizes) {
  const sorted = [...entries].sort((a, b) => a.number - b.number);
  const totalSum = sorted.reduce((s, e) => s + e.number, 0);

  const pool = sorted.map((e) => ({ name: e.name, number: e.number }));
  const steps = [];
  const winners = [];

  for (let pi = 0; pi < prizes.length; pi++) {
    const prize = prizes[pi];
    for (let slot = 1; slot <= prize.qty; slot++) {
      if (pool.length === 0) break;
      const poolSum = pool.reduce((s, e) => s + e.number, 0);
      const n = pool.length;
      const remainder = poolSum % n;
      const winner = pool[remainder];

      steps.push({
        prizeName: prize.name,
        prizeIndex: pi,
        slot,
        slotTotal: prize.qty,
        image: prize.image,
        poolSize: n,
        poolSum,
        remainder,
        winnerSortIndex: remainder, // 在当前升序奖池中的位置（0 基）
        pool: pool.map((e) => ({ name: e.name, number: e.number })),
        winner: { name: winner.name, number: winner.number },
      });
      winners.push({
        prizeName: prize.name,
        prizeIndex: pi,
        slot,
        image: prize.image,
        name: winner.name,
        number: winner.number,
      });
      pool.splice(remainder, 1);
    }
  }

  return {
    totalSum,
    participantCount: sorted.length,
    sorted: sorted.map((e) => ({ name: e.name, number: e.number })),
    steps,
    winners,
  };
}
