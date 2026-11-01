// A10 筋収縮 の問題
import { fmt } from '../lib/format.js';
import { distinctNumbers, assignmentQuestion } from './common.js';
import { tension, stimulusTimes, contractionType, TYPE_NAME, sarcomereTension, bands } from '../models/muscle.js';
import { sample } from '../lib/series.js';

export const A10 = [
  {
    id: 'a10-type-graph',
    stage: 'a10',
    level: 1,
    kind: 'graph',
    make(rng) {
      const f = rng.pick([3, 4, 15, 20, 25, 60, 80, 100]);
      const type = contractionType(f).type;
      const st = stimulusTimes(f, 0.6);
      const names = { single: '単収縮', incomplete: '不完全強縮', complete: '完全強縮' };
      return {
        text: '図は、カエルの腓腹筋に一定の間隔で刺激を与え続けたときの、筋肉の張力の変化を表している。このような収縮を何というか。',
        chart: {
          x: { min: 0, max: 0.6, label: '時間（秒）', step: 0.1, digits: 1 },
          y: { min: 0, max: 1.05, label: '張力（相対値）', step: 0.2, digits: 1 },
          series: [{ points: sample((t) => tension(t, st), 0, 0.6, 700), color: 'c1', width: 3 }],
          alt: '張力の時間変化',
        },
        correct: type === 'single' ? '単収縮（のくり返し）' : names[type],
        wrong: ['単収縮（のくり返し）', '不完全強縮', '完全強縮', '筋疲労'],
        explanation: {
          single: '1回の刺激ごとに収縮がもとにもどっているので、単収縮のくり返しである。刺激の間隔が単収縮にかかる時間（約0.1秒）より長いからである。',
          incomplete: '収縮が重なって張力が大きくなっているが、ぎざぎざが残っているので不完全強縮である。収縮がもとにもどりきらないうちに次の刺激が来るからである。',
          complete: '張力がなめらかに大きく保たれているので完全強縮である。刺激の間隔がとても短く、収縮が完全に重なり合うからである。',
        }[type],
      };
    },
  },
  {
    id: 'a10-interval',
    stage: 'a10',
    level: 1,
    kind: 'calc',
    make(rng) {
      const f = rng.pick([5, 8, 20, 25, 40, 50]);
      const ms = 1000 / f;
      const d = distinctNumbers(ms, [f, ms / 10, ms * 10, 1000 * f / 100, 100 / f], ' ミリ秒', 1);
      return {
        text: `筋肉に1秒間に ${f} 回の割合で刺激を与えた。刺激と刺激の間隔は何ミリ秒か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `1秒 ＝ 1000 ミリ秒を ${f} 回に分けるので、間隔は 1000 ÷ ${f} ＝ ${fmt(ms, 1)} ミリ秒である。${ms < 100 ? '単収縮にかかる時間（約100ミリ秒）より短いので、収縮が重なり合って強縮が起こる' : '単収縮にかかる時間（約100ミリ秒）より長いので、収縮は重ならず単収縮がくり返される'}からである。`,
      };
    },
  },
  {
    id: 'a10-bands',
    stage: 'a10',
    level: 2,
    kind: 'calc',
    make(rng) {
      const L = rng.pick([2.2, 2.4, 2.5, 2.6, 2.8, 3.0]);
      const ask = rng.pick(['I', 'H']);
      const b = bands(L);
      const ans = b[ask];
      const d = distinctNumbers(ans, [b.A, L - 1.0, L - 2 * 1.6, L / 2 - 1.0, L - 1.6 / 2, ans / 2, ans * 2, L], ' μm', 2);
      return {
        text: `ある骨格筋の太いフィラメント（ミオシンフィラメント）の長さは 1.6 μm、細いフィラメント（アクチンフィラメント）は Z膜から 1.0 μm ずつのびている。サルコメアの長さが ${L} μm のとき、${ask === 'I' ? '1つのサルコメアに含まれる明帯の長さの合計' : 'H帯の長さ'}は何 μm か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: ask === 'I'
          ? `暗帯は太いフィラメントの長さ 1.6 μm なので、明帯の合計 ＝ サルコメアの長さ − 暗帯 ＝ ${L} − 1.6 ＝ ${fmt(ans, 2)} μm となる。明帯は細いフィラメントだけがある部分で、サルコメアのうち太いフィラメントがない部分だからである。`
          : `H帯は太いフィラメントのうち細いフィラメントと重なっていない部分なので、${L} − 1.0 × 2 ＝ ${fmt(ans, 2)} μm となる。両側の Z膜から細いフィラメントが 1.0 μm ずつのびていて、その間のすき間がH帯にあたるからである。`,
      };
    },
  },
  {
    id: 'a10-sliding',
    stage: 'a10',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '骨格筋が収縮してサルコメアが短くなるとき、長さが変わらないものはどれか。',
        correct: '暗帯',
        wrong: ['明帯', 'H帯', 'サルコメア（Z膜とZ膜の間）'],
        explanation: '収縮するとき、細いフィラメントが太いフィラメントの間に滑り込むので、明帯とH帯は短くなる。フィラメントそのものの長さは変わらないから、太いフィラメントの長さにあたる暗帯の長さは変わらない（滑り説）。',
      };
    },
  },
  {
    id: 'a10-length-tension',
    stage: 'a10',
    level: 2,
    kind: 'graph',
    make(rng) {
      const L = rng.pick([2.8, 3.0, 3.2]);
      return {
        text: `図は、カエルの骨格筋で、サルコメアの長さと、強縮させたときの張力の関係を表したものである。サルコメアの長さが 2.2 μm から ${L} μm へと長くなると張力が小さくなる理由として最も適当なものはどれか。`,
        chart: {
          x: { min: 1.2, max: 3.8, label: 'サルコメアの長さ（μm）', step: 0.4, digits: 1 },
          y: { min: 0, max: 115, label: '張力（最大＝100）', step: 20 },
          series: [{ points: sample((x) => sarcomereTension(x) * 100, 1.2, 3.8, 400), color: 'c1', width: 3 }],
          markers: [{ x: L, y: sarcomereTension(L) * 100, color: 'c2', label: `${L} μm` }],
          alt: 'サルコメアの長さと張力',
        },
        correct: '太いフィラメントと細いフィラメントの重なりが減り、アクチンと結合できるミオシン頭部の数が減るから',
        wrong: ['細いフィラメントどうしが重なり合い、互いにじゃまをするから', '太いフィラメントが Z膜にぶつかるから', 'サルコメアが長くなるとATPが分解されなくなるから'],
        explanation: 'サルコメアが長くなると、細いフィラメントが太いフィラメントの間から引き出され、両者の重なりが小さくなる。張力はアクチンと結合して引っぱるミオシン頭部の数で決まるので、重なりが減るほど張力は小さくなり、重なりがなくなると0になる。',
      };
    },
  },
  {
    id: 'a10-filament-length',
    stage: 'a10',
    level: 3,
    kind: 'calc',
    make(rng) {
      const actin = rng.pick([0.9, 1.0, 1.1]);
      const myosin = rng.pick([1.5, 1.6, 1.7]);
      const bare = 0.2;
      const lo = 2 * actin;
      const hi = 2 * actin + bare;
      const zero = 2 * actin + myosin;
      const ask = rng.pick(['myosin', 'actin']);
      const ans = ask === 'myosin' ? zero - lo : lo / 2;
      const d = distinctNumbers(ans, ask === 'myosin' ? [zero - hi, zero / 2, zero - actin, lo, hi - lo] : [lo, hi / 2, zero / 2, (zero - myosin), zero - lo], ' μm', 2);
      return {
        text: `ある骨格筋で、サルコメアの長さと張力の関係を調べたところ、張力は ${fmt(lo, 2)}〜${fmt(hi, 2)} μm で最大となり、それより長いと直線的に小さくなって ${fmt(zero, 2)} μm で0になった。${ask === 'myosin' ? '太いフィラメント（ミオシンフィラメント）' : '1本の細いフィラメント（アクチンフィラメント、Z膜から片側にのびる部分）'}の長さは何 μm と考えられるか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: ask === 'myosin'
          ? `${fmt(lo, 2)} μm は両側の細いフィラメントの先端どうしがちょうど接する長さなので、細いフィラメント2本分 ＝ ${fmt(lo, 2)} μm である。張力が0になる ${fmt(zero, 2)} μm では細いフィラメントと太いフィラメントがちょうど重ならなくなるから、太いフィラメントの長さは ${fmt(zero, 2)} − ${fmt(lo, 2)} ＝ ${fmt(ans, 2)} μm となる。`
          : `張力が最大になる範囲の下限 ${fmt(lo, 2)} μm は、両側から来た細いフィラメントの先端どうしがちょうど接する長さである。これより短いと細いフィラメントどうしが重なって張力が下がるから、細いフィラメント1本は ${fmt(lo, 2)} ÷ 2 ＝ ${fmt(ans, 2)} μm となる。`,
      };
    },
  },
  {
    id: 'a10-calcium',
    stage: 'a10',
    level: 2,
    kind: 'term',
    make() {
      const q = assignmentQuestion(['ア', 'イ', 'ウ'], ['筋小胞体', 'トロポニン', 'ミオシン頭部']);
      return {
        text: '筋収縮のしくみについて、次のア〜ウにあてはまる語の組合せとして正しいものはどれか。　運動神経からの興奮が筋繊維に伝わると、（ア）から Ca²⁺ が放出される。Ca²⁺ が細いフィラメント上の（イ）に結合するとトロポミオシンの位置が変わり、（ウ）がアクチンと結合できるようになる。',
        correct: q.correct,
        wrong: q.wrong,
        explanation: 'アは筋小胞体、イはトロポニン、ウはミオシン頭部である。Ca²⁺ がトロポニンに結合すると、アクチンの結合部位をふさいでいたトロポミオシンがずれるので、ミオシン頭部がアクチンと結合し、ATPのエネルギーを使ってアクチンをたぐり寄せる。',
      };
    },
  },
  {
    id: 'a10-atp',
    stage: 'a10',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '筋収縮でのATPのはたらきとして正しいものはどれか。',
        correct: 'ミオシン頭部がATPを分解し、そのエネルギーで細いフィラメントをたぐり寄せる',
        wrong: ['アクチンがATPを分解し、太いフィラメントを押し出す', 'ATPが Z膜を縮めて、サルコメアを短くする', 'ATPが筋小胞体に結合して、Ca²⁺ を放出させる'],
        explanation: 'ミオシン頭部はATPを分解する酵素（ATPアーゼ）としてはたらく。ATPの分解で得たエネルギーで、アクチンと結合したミオシン頭部が首を振るように動くので、細いフィラメントが太いフィラメントの間に滑り込む。',
      };
    },
  },
  {
    id: 'a10-tetanus-why',
    stage: 'a10',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '刺激の頻度を高くすると、単収縮よりも大きな張力が生じる。この理由として最も適当なものはどれか。',
        correct: '収縮がもとにもどる前に次の刺激による収縮が起こり、収縮が重なり合うから',
        wrong: ['刺激の頻度が高いと、1回ごとの活動電位が大きくなるから', '刺激の頻度が高いと、筋繊維が太くなるから', '刺激の頻度が高いと、全か無かの法則が成り立たなくなるから'],
        explanation: '1回の単収縮は約0.1秒かかるので、それより短い間隔で刺激すると、収縮がもとにもどる前に次の収縮が重なる。収縮が重なり合って張力が加算されるので、単収縮より大きな張力が生じる（強縮）。',
      };
    },
  },
];
