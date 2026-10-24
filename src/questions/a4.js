// A4 興奮の伝導 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers, assignmentQuestion } from './common.js';
import { membrane, nerveResponse, THRESHOLD_STIM, PHASES, T_END, T_STIM } from '../models/nerve.js';
import { sample } from '../lib/series.js';
import { monotoneCubic } from '../lib/interp.js';

// 静止電位・ピークを変えた活動電位の波形（問題の図用）
function spike(rest, peak) {
  const f = monotoneCubic([[0, rest], [T_STIM, rest], [T_STIM + 0.25, rest + 15], [T_STIM + 0.6, peak], [T_STIM + 1.4, rest], [T_STIM + 1.9, rest - 10], [T_STIM + 4, rest], [T_END, rest]]);
  return sample(f, 0, T_END, 240);
}

export const A4 = [
  {
    id: 'a4-phase-ion',
    stage: 'a4',
    level: 2,
    kind: 'graph',
    make(rng) {
      const ask = rng.pick(['depol', 'repol']);
      const labels = { rest: KATA[0], depol: KATA[1], repol: KATA[2] };
      const at = { rest: 0.5, depol: T_STIM + 0.45, repol: T_STIM + 1.0 };
      return {
        text: `図は、1本の神経繊維の1か所の膜電位の変化を表している。ア〜ウのうち、${ask === 'depol' ? 'Na⁺ が細胞内に急に流入している' : 'K⁺ が細胞外に流出して膜電位がもとにもどりつつある'}時期はどれか。その時期の名称とともに選べ。`,
        chart: {
          x: { min: 0, max: T_END, label: '時間（ミリ秒）', step: 1 },
          y: { min: -100, max: 60, label: '膜電位（mV）', step: 20 },
          series: [{ points: sample((t) => membrane(t, 20), 0, T_END, 300), color: 'c1', width: 3 }],
          texts: Object.keys(labels).map((k) => ({ x: at[k] + (k === 'rest' ? 0 : 0.35), y: membrane(at[k], 20) + (k === 'rest' ? 12 : 0), text: labels[k], color: 'c2' })),
          markers: Object.keys(labels).filter((k) => k !== 'rest').map((k) => ({ x: at[k], y: membrane(at[k], 20), color: 'c2' })),
          alt: '活動電位の波形とア〜ウの時期',
        },
        correct: `${labels[ask]}：${PHASES[ask].name}`,
        wrong: [`${labels.rest}：静止電位`, `${labels[ask === 'depol' ? 'repol' : 'depol']}：${PHASES[ask === 'depol' ? 'repol' : 'depol'].name}`, `${labels[ask]}：${PHASES[ask === 'depol' ? 'repol' : 'depol'].name}`, `${labels[ask === 'depol' ? 'repol' : 'depol']}：${PHASES[ask].name}`, `${labels.rest}：${PHASES[ask].name}`],
        explanation: ask === 'depol'
          ? 'イの時期は脱分極で、電位依存性のナトリウムチャネルが開いて Na⁺ が細胞内に流入するので、膜電位が急に上がって細胞内が正になる。'
          + 'Na⁺ は細胞外に多く細胞内に少ないから、チャネルが開くと濃度の差にしたがって流入する。'
          : 'ウの時期は再分極で、ナトリウムチャネルが閉じ、電位依存性のカリウムチャネルが開いて K⁺ が流出するので、膜電位が下がって静止電位にもどっていく。'
          + 'K⁺ は細胞内に多いから、チャネルが開くと細胞外へ出ていく。',
      };
    },
  },
  {
    id: 'a4-amplitude',
    stage: 'a4',
    level: 1,
    kind: 'calc',
    make(rng) {
      const rest = -rng.pick([60, 65, 70, 75, 80, 90]);
      const peak = rng.pick([20, 30, 35, 40, 50]);
      const ans = peak - rest;
      const d = distinctNumbers(ans, [peak, -rest, peak + rest < 0 ? -(peak + rest) : peak + rest, ans + 10, ans - 20, ans * 2], ' mV', 0);
      return {
        text: `図は、ある神経繊維に閾値以上の刺激を与えたときの膜電位の変化である。静止電位は −${-rest} mV、膜電位の最大値は ＋${peak} mV であった。活動電位の大きさ（静止電位から最大値までの電位の変化の大きさ）は何 mV か。`,
        chart: {
          x: { min: 0, max: T_END, label: '時間（ミリ秒）', step: 1 },
          y: { min: -100, max: 60, label: '膜電位（mV）', step: 20 },
          series: [{ points: spike(rest, peak), color: 'c1', width: 3 }],
          hlines: [{ y: rest, color: 'c3', dash: 'dot', label: `−${-rest} mV`, align: 'right' }, { y: peak, color: 'c2', dash: 'dot', label: `＋${peak} mV`, align: 'right' }],
          alt: '活動電位の波形',
        },
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `活動電位の大きさは ${peak} − (−${-rest}) ＝ ${peak} ＋ ${-rest} ＝ ${ans} mV である。静止電位は負の値なので、引き算では符号に注意して、最大値との差を求めなければならないからである。`,
      };
    },
  },
  {
    id: 'a4-all-or-none',
    stage: 'a4',
    level: 2,
    kind: 'term',
    make(rng) {
      const th = rng.pick([4, 5, 6, 8]);
      const strong = th * rng.pick([2, 3]);
      return {
        text: `ある1本の神経繊維は、強さ ${th} 以上の刺激で興奮する。この神経繊維に強さ ${th} の刺激と強さ ${strong} の刺激をそれぞれ与えたとき、生じる活動電位の大きさについて正しいものはどれか。`,
        correct: '両方とも同じ大きさの活動電位が生じる',
        wrong: [`強さ ${strong} のほうが大きな活動電位が生じる`, `強さ ${th} では活動電位が生じない`, `強さ ${strong} のほうが小さな活動電位が生じる`, '刺激の強さに比例した大きさの活動電位が生じる'],
        ordered: true,
        explanation: '1本の神経繊維では、閾値以上の刺激なら刺激の強さに関係なく同じ大きさの活動電位が生じ、閾値未満では生じない（全か無かの法則）。活動電位は、閾値をこえると電位依存性のナトリウムチャネルが次々に開いて一定の大きさまで脱分極するしくみで生じるからである。',
      };
    },
  },
  {
    id: 'a4-nerve-graph',
    stage: 'a4',
    level: 2,
    kind: 'graph',
    make(rng) {
      const fiberIsA = rng.chance(0.5);
      const lab = fiberIsA ? { fiber: KATA[0], nerve: KATA[1] } : { fiber: KATA[1], nerve: KATA[0] };
      return {
        text: '図のア・イは、1本の神経繊維と、多数の神経繊維が束になった神経のどちらかについて、刺激の強さと興奮の大きさ（最大を100%とする）の関係を表したものである。神経を表すのはどちらか。理由とともに選べ。',
        chart: {
          x: { min: 0, max: 40, label: '刺激の強さ（相対値）', step: 10 },
          y: { min: 0, max: 115, label: '興奮の大きさ（%）', step: 20 },
          series: [
            { points: sample((s) => (s >= THRESHOLD_STIM ? 100 : 0), 0, 40, 400), color: 'c1', width: 3, label: lab.fiber, labelAt: 6, dash: fiberIsA ? 'solid' : 'dash' },
            { points: sample((s) => nerveResponse(s) * 100, 0, 40, 400), color: 'c2', width: 3, label: lab.nerve, labelAt: 22, dash: fiberIsA ? 'dash' : 'solid' },
          ],
          alt: '刺激の強さと興奮の大きさの2本のグラフ',
        },
        correct: `${lab.nerve}：閾値の異なる神経繊維が多数あり、刺激が強いほど興奮する神経繊維の数が増えるから`,
        wrong: [
          `${lab.fiber}：閾値以上で興奮の大きさが一定になるから`,
          `${lab.nerve}：1本1本の神経繊維の活動電位が、刺激が強いほど大きくなるから`,
          `${lab.fiber}：神経では全か無かの法則が成り立つから`,
          `${lab.nerve}：刺激が強いほど伝導速度が大きくなるから`,
        ],
        explanation: `神経を表すのは${lab.nerve}で、刺激を強くすると興奮の大きさが段階的に大きくなり、やがて一定になる。神経は閾値の異なる多数の神経繊維の束なので、刺激が強いほど閾値をこえる神経繊維の数が増えるからであり、1本1本の神経繊維は全か無かの法則にしたがっている。`,
      };
    },
  },
  {
    id: 'a4-velocity',
    stage: 'a4',
    level: 2,
    kind: 'calc',
    make(rng) {
      const v = rng.pick([20, 25, 30, 40, 50, 60]); // m/s ＝ mm/ms
      const tRest = rng.pick([1.5, 2, 2.5, 3]);
      const dB = rng.pick([10, 15, 20, 25, 30]);
      const gap = rng.pick([30, 40, 50, 60]);
      const dA = dB + gap;
      const tA = dA / v + tRest;
      const tB = dB / v + tRest;
      if (!Number.isInteger(Math.round(tA * 100)) || Math.abs(tA * 100 - Math.round(tA * 100)) > 1e-6 || Math.abs(tB * 100 - Math.round(tB * 100)) > 1e-6) return this.make(rng);
      const d = distinctNumbers(v, [v / 10, v * 10, dA / tA, dB / tB, (dA + dB) / (tA + tB), v / 2], ' m/s', 1);
      return {
        text: `カエルの座骨神経と腓腹筋の標本で、筋肉から ${dA / 10} cm 離れた点Aを刺激すると ${fmt(tA, 2)} ミリ秒後に、${dB / 10} cm 離れた点Bを刺激すると ${fmt(tB, 2)} ミリ秒後に筋肉が収縮しはじめた。この神経の伝導速度は何 m/s か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `伝導速度 ＝ (${dA / 10} − ${dB / 10}) cm ÷ (${fmt(tA, 2)} − ${fmt(tB, 2)}) ミリ秒 ＝ ${gap} mm ÷ ${fmt(tA - tB, 2)} ms ＝ ${fmt(v, 1)} m/s となる（1 mm/ms ＝ 1 m/s）。どちらの点を刺激しても、神経筋接合部での伝達と筋肉の収縮開始にかかる時間は同じなので、時間の差がA・B間を興奮が伝わる時間になるからである。`,
      };
    },
  },
  {
    id: 'a4-transmission-time',
    stage: 'a4',
    level: 3,
    kind: 'calc',
    make(rng) {
      const v = rng.pick([20, 25, 40, 50]);
      const tRest = rng.pick([1.5, 2, 2.5, 3, 3.5]);
      const dB = rng.pick([10, 20, 30]);
      const dA = dB + rng.pick([40, 50, 60]);
      const tA = dA / v + tRest;
      const tB = dB / v + tRest;
      if (Math.abs(tA * 100 - Math.round(tA * 100)) > 1e-6 || Math.abs(tB * 100 - Math.round(tB * 100)) > 1e-6) return this.make(rng);
      const d = distinctNumbers(tRest, [tB, tA - tB, tA, dB / v, tRest + 1, tRest / 2], ' ミリ秒', 2);
      return {
        text: `座骨神経と腓腹筋の標本で、筋肉から ${dA} mm の点Aを刺激すると ${fmt(tA, 2)} ミリ秒後、${dB} mm の点Bを刺激すると ${fmt(tB, 2)} ミリ秒後に筋肉が収縮しはじめた。興奮が神経の末端に達してから筋肉が収縮しはじめるまでの時間は何ミリ秒か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `伝導速度は (${dA} − ${dB}) ÷ (${fmt(tA, 2)} − ${fmt(tB, 2)}) ＝ ${v} mm/ms で、点Bから筋肉までの伝導に ${dB} ÷ ${v} ＝ ${fmt(dB / v, 2)} ミリ秒かかる。したがって、残りの ${fmt(tB, 2)} − ${fmt(dB / v, 2)} ＝ ${fmt(tRest, 2)} ミリ秒が、神経筋接合部での伝達と筋肉の収縮開始にかかった時間である。`,
      };
    },
  },
  {
    id: 'a4-resting',
    stage: 'a4',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '静止状態のニューロンで、細胞内が細胞外に対して負の電位（静止電位）になっている主な理由として正しいものはどれか。',
        correct: 'ナトリウムポンプで K⁺ が細胞内に多く保たれ、常に開いているカリウムチャネルから K⁺ が細胞外へ流出するから',
        wrong: [
          'ナトリウムチャネルが常に開いていて、Na⁺ が細胞内へ流入し続けているから',
          'ナトリウムポンプが K⁺ を細胞外へ、Na⁺ を細胞内へ運んでいるから',
          '細胞膜が Na⁺ も K⁺ もまったく通さないから',
        ],
        explanation: 'ナトリウムポンプが Na⁺ を細胞外へ、K⁺ を細胞内へ能動輸送するので、細胞内は K⁺ が多く Na⁺ が少ない。静止状態でも一部のカリウムチャネルは開いていて、K⁺ が濃度の差にしたがって細胞外へ流出するから、細胞内が負になる。',
      };
    },
  },
  {
    id: 'a4-saltatory',
    stage: 'a4',
    level: 1,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '有髄神経繊維の伝導速度が、同じくらいの太さの無髄神経繊維に比べて大きい理由として正しいものはどれか。',
          correct: '興奮がランビエ絞輪からランビエ絞輪へととびとびに伝わる（跳躍伝導）から',
          wrong: ['髄鞘の部分で活動電位が大きくなるから', '髄鞘から神経伝達物質が放出されるから', '有髄神経繊維では全か無かの法則が成り立たないから'],
          explanation: '髄鞘は電気を通しにくいので、興奮は髄鞘のすき間（ランビエ絞輪）でだけ生じ、ランビエ絞輪からランビエ絞輪へとびとびに伝わる。これを跳躍伝導といい、興奮が隣の部分へ順に伝わる無髄神経繊維よりも速く伝わるからである。',
        };
      }
      return {
        text: '軸索の途中の1か所を電気で刺激したとき、興奮の伝わり方として正しいものはどれか。',
        correct: '刺激した部位から両方向へ伝わる',
        wrong: ['細胞体のほうへだけ伝わる', '軸索の末端のほうへだけ伝わる', '刺激した部位から先へは伝わらない'],
        explanation: '興奮した部位と隣の静止部位との間に流れる電流（活動電流）が隣を次々に興奮させるので、軸索の途中を刺激すると興奮は両方向へ伝わる。ただし興奮した直後の部位は不応期になるので、いったん進みはじめた興奮は逆もどりしない。',
      };
    },
  },
  {
    id: 'a4-terms',
    stage: 'a4',
    level: 1,
    kind: 'term',
    make() {
      const q = assignmentQuestion(['ア', 'イ', 'ウ'], ['閾値', '不応期', '跳躍伝導']);
      return {
        text: '次のア〜ウにあてはまる語の組合せとして正しいものはどれか。　ア：活動電位を生じさせるのに必要な最小の刺激の強さ　イ：興奮した直後、刺激を与えても興奮しない短い期間　ウ：有髄神経繊維で、興奮がランビエ絞輪からランビエ絞輪へと伝わること',
        correct: q.correct,
        wrong: q.wrong,
        explanation: 'アは閾値、イは不応期、ウは跳躍伝導である。不応期があるので、興奮は直前に興奮した部位へは逆もどりせず、一方向へ進んでいくからである。',
      };
    },
  },
  {
    id: 'a4-time-calc',
    stage: 'a4',
    level: 1,
    kind: 'calc',
    make(rng) {
      const v = rng.pick([1, 2, 10, 20, 50, 100]);
      const L = rng.pick([0.5, 1, 1.2, 1.5, 2]);
      const ans = (L / v) * 1000; // ms
      const d = distinctNumbers(ans, [ans / 1000, ans * 10, ans / 10, L * v * 1000, (v / L) * 1000], ' ミリ秒', 2);
      return {
        text: `伝導速度が ${v} m/s の神経繊維で、興奮が ${L} m 伝わるのにかかる時間は何ミリ秒か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `時間 ＝ 距離 ÷ 速度 ＝ ${L} ÷ ${v} ＝ ${fmt(L / v, 4)} 秒 ＝ ${fmt(ans, 2)} ミリ秒である。1秒は1000ミリ秒なので、秒で求めた値を1000倍しなければならないからである。`,
      };
    },
  },
];
