// A8 生存曲線と生命表 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { TYPES, survivors, LIFESPAN } from '../models/survival.js';
import { sample } from '../lib/series.js';

const TYPE_IDS = ['late', 'mid', 'early'];

function curveChart(order) {
  const styles = [['c1', 'solid'], ['c3', 'dash'], ['c2', 'dot']];
  return {
    x: { min: 0, max: LIFESPAN, label: '相対年齢', step: 20 },
    y: { min: 1, max: 1000, log: true, label: '生存数（対数目盛り）' },
    series: order.map((id, i) => ({ points: sample((x) => survivors(x, TYPES[id].k), 0, LIFESPAN, 200), color: styles[i][0], dash: styles[i][1], width: 3, label: KATA[i], labelAt: id === 'early' ? 6 : id === 'mid' ? 45 : 80 })),
    alt: '3本の生存曲線ア〜ウ',
  };
}

// 生命表（区分ごとの はじめの生存数）を作る：死亡率の列を指定して整数で作る
function tableFrom(start, rates) {
  const lx = [start];
  for (const r of rates) lx.push(Math.round(lx[lx.length - 1] * (1 - r)));
  return lx;
}

export const A8 = [
  {
    id: 'a8-type-graph',
    stage: 'a8',
    level: 1,
    kind: 'graph',
    make(rng) {
      const order = rng.shuffle(TYPE_IDS);
      const ask = rng.pick(TYPE_IDS);
      const idx = order.indexOf(ask);
      const desc = {
        late: '若いうちの死亡が少なく、老齢になってから多くが死ぬ（ヒトなど）',
        mid: 'どの年齢でも死亡率がほぼ一定である（鳥類など）',
        early: '生まれてすぐの時期に大部分が死ぬ（魚類など）',
      }[ask];
      return {
        text: `図のア〜ウは、3種類の動物の生存曲線である（縦軸は対数目盛り）。${desc}動物の生存曲線はどれか。`,
        chart: curveChart(order),
        correct: `${KATA[idx]}（${TYPES[ask].name}）`,
        // 誤答：ほかの曲線を同じ型とするもの、正しい曲線を別の型とするもの
        wrong: [0, 1, 2].flatMap((i) => TYPE_IDS.filter((t) => (i === idx) !== (t === ask)).map((t) => `${KATA[i]}（${TYPES[t].name}）`)),
        explanation: `${TYPES[ask].name}は${KATA[idx]}である。${ask === 'late' ? '若いうちは曲線がほぼ水平で、老齢で急に下がるのは、若い時期の死亡率が低く、老齢で死亡率が高くなるからである' : ask === 'mid' ? '対数目盛りで直線になるのは、どの年齢でも一定の割合で死ぬ（死亡率が一定）からである' : '生まれてすぐに曲線が急に下がるのは、卵や幼生の時期の死亡率がきわめて高いからである'}。`,
      };
    },
  },
  {
    id: 'a8-type-species',
    stage: 'a8',
    level: 1,
    kind: 'term',
    make(rng) {
      const t = rng.pick(TYPE_IDS);
      const animals = { late: 'ヒト・ゾウなどの大形の哺乳類', mid: 'シジュウカラなどの鳥類', early: 'マイワシなどの魚類・カキなどの貝類' };
      return {
        text: `一般に、${animals[t]}の生存曲線はどの型に近いか。`,
        correct: TYPES[t].name,
        wrong: TYPE_IDS.filter((x) => x !== t).map((x) => TYPES[x].name).concat(['どの型にもあてはまらない']),
        explanation: t === 'late'
          ? '晩死型である。産む子の数は少ないが、親が子を保護するので若いうちの死亡率が低く、多くが老齢まで生きるからである。'
          : t === 'mid'
            ? '平均型に近い。鳥類では、ひなの時期から成鳥まで、どの年齢でも死亡率がほぼ一定であるからである。'
            : '早死型である。多数の卵を産むが、親が卵や子を保護しないので、生まれてすぐの時期の死亡率がきわめて高いからである。',
      };
    },
  },
  {
    id: 'a8-mortality',
    stage: 'a8',
    level: 2,
    kind: 'calc',
    make(rng) {
      const start = rng.pick([1000, 500, 800]);
      const rates = [rng.pick([0.1, 0.2, 0.3]), rng.pick([0.2, 0.25, 0.4]), rng.pick([0.25, 0.5, 0.6]), rng.pick([0.5, 0.75, 0.8])];
      const lx = tableFrom(start, rates);
      const i = rng.int(1, 3);
      const deaths = lx[i] - lx[i + 1];
      const ans = deaths / lx[i];
      const d = distinctNumbers(ans * 100, [(deaths / start) * 100, (lx[i + 1] / lx[i]) * 100, (deaths / lx[i + 1]) * 100, ((lx[i - 1] - lx[i]) / lx[i - 1]) * 100, (1 - lx[i + 1] / start) * 100], ' %', 1);
      const ages = ['0〜1歳', '1〜2歳', '2〜3歳', '3〜4歳'];
      return {
        text: `ある動物の生命表で、各年齢の区分のはじめに生きている個体数（生存数）は、0歳 ${lx[0]}、1歳 ${lx[1]}、2歳 ${lx[2]}、3歳 ${lx[3]}、4歳 ${lx[4]} であった。${ages[i]}の区分の死亡率は何%か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `${ages[i]}の死亡数は ${lx[i]} − ${lx[i + 1]} ＝ ${deaths} で、死亡率 ＝ 死亡数 ÷ その区分のはじめの生存数 ＝ ${deaths} ÷ ${lx[i]} ≒ ${fmt(ans * 100, 1)}% となる。死亡率は「その区分のはじめに生きていた個体のうち何割が死んだか」を表すので、最初の個体数（${start}）ではなく、その区分のはじめの生存数で割るからである。`,
      };
    },
  },
  {
    id: 'a8-deaths',
    stage: 'a8',
    level: 1,
    kind: 'calc',
    make(rng) {
      const start = rng.pick([1000, 2000, 500]);
      const r = rng.pick([0.1, 0.2, 0.3, 0.4, 0.5]);
      const r2 = rng.pick([0.2, 0.4, 0.5, 0.6]);
      const l1 = Math.round(start * (1 - r));
      const ans = Math.round(l1 * r2);
      if (r === r2) return this.make(rng); // 同じ割合だと誤答が重なりやすい
      const d = distinctNumbers(ans, [Math.round(start * r2), l1 - ans, start - l1, Math.round(start * r * r2), l1, ans * 2, Math.round(ans / 2), Math.round((start - l1) * r2), start - ans, Math.round(start * (1 - r2))], ' 個体', 0);
      return {
        text: `ある動物の ${start} 個体が生まれ、1歳になるまでに ${start - l1} 個体が死んだ。1〜2歳の区分の死亡率が ${r2 * 100}% のとき、1〜2歳の間に死んだ個体数はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `1歳のはじめの生存数は ${start} − ${start - l1} ＝ ${l1} なので、1〜2歳の死亡数は ${l1} × ${r2} ＝ ${ans} 個体となる。死亡率はその区分のはじめの生存数に対する割合なので、生まれた数（${start}）ではなく ${l1} にかけるからである。`,
      };
    },
  },
  {
    id: 'a8-type-from-table',
    stage: 'a8',
    level: 3,
    kind: 'calc',
    make(rng) {
      const t = rng.pick(TYPE_IDS);
      const rates = {
        late: [0.02, 0.03, 0.1, 0.5, 0.9],
        mid: rng.pick([[0.5, 0.5, 0.5, 0.5, 0.5], [0.4, 0.4, 0.4, 0.4, 0.4]]),
        early: [0.9, 0.5, 0.2, 0.2, 0.2],
      }[t];
      const lx = tableFrom(1000, rates);
      return {
        text: `ある動物の生命表で、各区分のはじめの生存数は ${lx.map((l, i) => `区分${i + 1} ${l}`).join('、')} であった（区分の長さはすべて同じ）。各区分の死亡率を計算すると、この動物の生存曲線はどの型か。`,
        correct: TYPES[t].name,
        wrong: TYPE_IDS.filter((x) => x !== t).map((x) => TYPES[x].name).concat(['どの型にもあてはまらない']),
        explanation: `死亡率（死亡数 ÷ はじめの生存数）は、区分1から順に ${rates.slice(0, 4).map((r) => fmt(r, 2)).join('、')} となる。${t === 'mid' ? '死亡率が年齢によらず一定なので平均型であり、対数目盛りの生存曲線は直線になる' : t === 'late' ? '若いうちの死亡率が低く、年齢が進むと急に高くなるので晩死型である' : '最初の区分の死亡率がきわめて高く、その後は低いので早死型である'}。`,
      };
    },
  },
  {
    id: 'a8-why-many-eggs',
    stage: 'a8',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '早死型の生存曲線を示す動物の多くが、一度に非常に多くの卵を産む理由として最も適当なものはどれか。',
        correct: '親が卵や子を保護しないので初期の死亡率が高く、多数の卵を産むことで、生き残って繁殖する子を残せるから',
        wrong: [
          '親が子を保護するので、多くの子を育てられるから',
          '卵の数が多いほど、1個体あたりの死亡率が下がるから',
          'どの年齢でも死亡率が一定なので、卵の数で寿命が決まるから',
        ],
        explanation: '早死型の動物は親が卵や子を保護しないことが多く、卵や幼生の時期に大部分が食べられたりして死ぬ。そのため多数の卵を産むことで、少数でも生き残って繁殖する個体を残しているからである。',
      };
    },
  },
  {
    id: 'a8-log-axis',
    stage: 'a8',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '平均型の生存曲線が、縦軸を対数目盛りにしたグラフで直線になる理由として正しいものはどれか。',
        correct: '一定の期間ごとに、生存している個体のうち同じ割合が死ぬから',
        wrong: ['一定の期間ごとに、同じ数の個体が死ぬから', '老齢になるほど死亡率が高くなるから', '生まれてすぐの死亡率が最も高いから'],
        explanation: '対数目盛りでは、同じ割合で減ると同じ幅だけ下がる。平均型では死亡率（割合）がどの年齢でもほぼ一定なので、生存曲線は直線になるからである。',
      };
    },
  },
  {
    id: 'a8-survival-rate',
    stage: 'a8',
    level: 2,
    kind: 'graph',
    make(rng) {
      const t = rng.pick(['late', 'mid']);
      const k = TYPES[t].k;
      const a = rng.pick([20, 30, 40]);
      const b = a + rng.pick([20, 30]);
      const la = Math.round(survivors(a, k));
      const lb = Math.round(survivors(b, k));
      const ans = (lb / la) * 100;
      const d = distinctNumbers(ans, [(lb / 1000) * 100, ((la - lb) / la) * 100, (la / 1000) * 100, ((la - lb) / 1000) * 100, (lb / (la + lb)) * 100, ans / 2, (la / lb) * 10, ((la - lb) / lb) * 100], ' %', 1);
      return {
        text: `図はある動物の生存曲線（出生数 1000、縦軸は対数目盛り）で、相対年齢 ${a} の生存数は ${la}、${b} の生存数は ${lb} であった。相対年齢 ${a} まで生き残った個体のうち、相対年齢 ${b} まで生き残るのは何%か。`,
        chart: {
          x: { min: 0, max: LIFESPAN, label: '相対年齢', step: 10 },
          y: { min: 1, max: 1000, log: true, label: '生存数（対数目盛り）' },
          series: [{ points: sample((x) => survivors(x, k), 0, LIFESPAN, 200), color: 'c1', width: 3 }],
          markers: [{ x: a, y: la, color: 'c2', label: String(la) }, { x: b, y: lb, color: 'c2', shape: 'square', label: String(lb) }],
          alt: '生存曲線と2つの年齢の生存数',
        },
        correct: d.correct,
        wrong: d.wrong,
        explanation: `${lb} ÷ ${la} × 100 ≒ ${fmt(ans, 1)}% である。「年齢 ${a} まで生き残った個体のうち」の割合なので、出生数 1000 ではなく年齢 ${a} の生存数 ${la} を基準にして割るからである。`,
      };
    },
  },
  {
    id: 'a8-life-table-term',
    stage: 'a8',
    level: 1,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '同時に生まれた個体群について、年齢ごとの生存数・死亡数・死亡率などをまとめた表を何というか。',
          correct: '生命表',
          wrong: ['生存曲線', '齢構成', '個体群ピラミッド', '成長曲線'],
          explanation: 'これを生命表という。生命表の生存数を、縦軸を対数目盛りにしてグラフに表したものが生存曲線で、年齢による死亡のしかたを比べるのに使われるからである。',
        };
      }
      return {
        text: '生まれた個体数を一定（例えば1000）として、年齢にともなう生存数の変化をグラフに表したものを何というか。',
        correct: '生存曲線',
        wrong: ['生命表', '成長曲線', '年齢ピラミッド', '光合成曲線'],
        explanation: 'これを生存曲線という。生まれた数をそろえて表すので、異なる種の間で、どの年齢で多く死ぬかを比べられるからである。',
      };
    },
  },
];
