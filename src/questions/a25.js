// A25 自然選択と遺伝子頻度 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { trajectory, fitness, lethalQ, nextQ } from '../models/selection.js';

export const A25 = [
  {
    id: 'a25-lethal-calc',
    stage: 'a25',
    level: 2,
    kind: 'calc',
    make(rng) {
      const q0 = rng.pick([0.5, 0.25, 0.2, 0.1]);
      const n = rng.pick([1, 2, 3]);
      const ans = lethalQ(q0, n);
      const d = distinctNumbers(ans, [q0 / (n + 1), Math.pow(q0, n + 1), q0 / Math.pow(2, n), q0 * (1 - n * q0 / 2), q0 / (1 + q0), q0 * q0, q0, 2 * ans, q0 * (1 - q0)].filter((v) => v >= 0.001), '', 3);
      return {
        text: `ある集団で、潜性の致死遺伝子 a の遺伝子頻度が ${q0} である。aa の個体は生まれてもすぐに死んで子を残さず、それ以外の条件ではハーディー・ワインベルグの法則が成り立つとする。このとき、a の遺伝子頻度は1世代ごとに q から q ÷ (1 ＋ q) に変わる。${n} 世代後の a の遺伝子頻度はいくらか（小数第3位まで）。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `q ÷ (1 ＋ q) を${n}回くり返すと、${[0, 1, 2, 3].slice(0, n + 1).map((k) => fmt(lethalQ(q0, k), 3)).join(' → ')} となり、答えは ${fmt(ans, 3)} である（まとめると q₀ ÷ (1 ＋ n·q₀) ＝ ${q0} ÷ (1 ＋ ${n} × ${q0})）。aa だけが除かれ、Aa の中の a は次の世代に伝わるので、a はなかなかなくならないからである。`,
      };
    },
  },
  {
    id: 'a25-onegen-calc',
    stage: 'a25',
    level: 2,
    kind: 'calc',
    make(rng) {
      const p = rng.pick([0.6, 0.7, 0.8, 0.5]);
      const q = 1 - p;
      const N = 100;
      const AA = Math.round(N * p * p);
      const Aa = Math.round(N * 2 * p * q);
      const aa = N - AA - Aa;
      const ans = Aa / (2 * (AA + Aa));
      const d = distinctNumbers(ans, [q, (Aa + 2 * aa) / (2 * N), Aa / (AA + Aa), q / 2, q * q, Aa / (2 * N)], '', 3);
      return {
        text: `ある集団の個体数は、AA が ${AA}、Aa が ${Aa}、aa が ${aa} であった。aa の個体がすべて子を残さずに死んだとき、残った個体がもつ遺伝子のうち、a の遺伝子頻度はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `残るのは AA ${AA} 個体と Aa ${Aa} 個体で、遺伝子は全部で 2 × ${AA + Aa} ＝ ${2 * (AA + Aa)} 個、そのうち a は Aa がもつ ${Aa} 個なので、${Aa} ÷ ${2 * (AA + Aa)} ＝ ${fmt(ans, 3)} となる。aa が除かれても、Aa がもつ a は残るからである。`,
      };
    },
  },
  {
    id: 'a25-pheno-calc',
    stage: 'a25',
    level: 1,
    kind: 'calc',
    make(rng) {
      const q = rng.pick([0.1, 0.2, 0.3, 0.4, 0.6, 0.7]);
      const ask = rng.pick(['rec', 'dom']);
      const ans = ask === 'rec' ? q * q * 100 : (1 - q * q) * 100;
      const d = distinctNumbers(ans, [q * 100, (1 - q) * 100, 2 * q * (1 - q) * 100, (1 - q) * (1 - q) * 100, 100 - q * 100 / 2], ' %', 0);
      return {
        text: `工業地帯のガの集団で、明色型の遺伝子 c（潜性）の遺伝子頻度が ${q}、暗色型の遺伝子 C（顕性）の遺伝子頻度が ${fmt(1 - q, 1)} になった。自由に交配して生まれた次の世代で、${ask === 'rec' ? '明色型（cc）' : '暗色型（CC と Cc）'}の個体は何 % か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: ask === 'rec'
          ? `明色型は cc なので、その割合は q² ＝ ${q}² ＝ ${fmt(q * q, 2)}、つまり ${fmt(ans, 0)} % となる。自由交配では、遺伝子型の頻度がハーディー・ワインベルグの法則にしたがって決まるからである。`
          : `暗色型は CC と Cc で、明色型 cc（q² ＝ ${fmt(q * q, 2)}）以外のすべてなので、1 − ${fmt(q * q, 2)} ＝ ${fmt(1 - q * q, 2)}、つまり ${fmt(ans, 0)} % となる。C は顕性なので、ヘテロ接合体 Cc も暗色型になるからである。`,
      };
    },
  },
  {
    id: 'a25-strength-graph',
    stage: 'a25',
    level: 2,
    kind: 'graph',
    make(rng) {
      const strengths = rng.shuffle([0.1, 0.2, 0.4]);
      const strongest = strengths.indexOf(0.4);
      const weakest = strengths.indexOf(0.1);
      const ask = rng.pick(['strong', 'weak']);
      const styles = [{ color: 'c1', dash: 'solid' }, { color: 'c2', dash: 'dash' }, { color: 'c3', dash: 'dot' }];
      const series = strengths.map((s, i) => {
        const tr = trajectory(0.99, fitness('industrial', s), 60);
        return { points: tr.map((q, g) => [g, 1 - q * q]), ...styles[i], width: 3 };
      });
      const idx = ask === 'strong' ? strongest : weakest;
      return {
        text: `図は、ガの集団で、明色型（潜性）が鳥に食べられる割合を3通りに変えたときの、暗色型（顕性）の個体の割合の変化をシミュレーションしたものである（ア：実線、イ：破線、ウ：点線）。明色型が食べられる割合が最も${ask === 'strong' ? '大きい' : '小さい'}のはどれか。`,
        chart: {
          x: { min: 0, max: 60, label: '世代', step: 10 },
          y: { min: 0, max: 1, label: '暗色型の割合', step: 0.2, digits: 1 },
          series,
          alt: '暗色型の割合の変化（ア：実線、イ：破線、ウ：点線）',
        },
        correct: KATA[idx],
        wrong: [KATA[0], KATA[1], KATA[2], 'ア〜ウで差はない'],
        explanation: `明色型が食べられる割合が${ask === 'strong' ? '大きい' : '小さい'}ほど、暗色型の遺伝子が増える速さが${ask === 'strong' ? '大きくなる' : '小さくなる'}ので、暗色型の割合が最も${ask === 'strong' ? '早く' : 'ゆっくり'}増える${KATA[idx]}である。自然選択の強さが、遺伝子頻度の変化の速さを決めるからである。`,
      };
    },
  },
  {
    id: 'a25-selection-term',
    stage: 'a25',
    level: 1,
    kind: 'term',
    make(rng) {
      const which = rng.pick(['selection', 'industrial']);
      if (which === 'selection') {
        return {
          text: '同じ種の個体の間にある遺伝的な変異のうち、その環境で生存や繁殖に有利な形質をもつ個体がより多くの子を残すことで、集団の遺伝子頻度が変化すること。これを何というか。',
          correct: '自然選択',
          wrong: ['遺伝的浮動', '突然変異', '隔離', '用不用'],
          explanation: 'これは自然選択である。有利な形質を決める遺伝子が次の世代により多く伝わるので、世代を重ねると、その遺伝子の頻度が集団の中で高くなる。',
        };
      }
      return {
        text: 'イギリスの工業地帯で、樹皮がすすで黒くなるとともに、オオシモフリエダシャクの暗色型が増えた。この理由として最も適当なものはどれか。',
        correct: '黒い樹皮の上では明色型が鳥に見つかりやすく、暗色型のほうが多く生き残って子を残したから',
        wrong: ['すすを浴びたガの体の色が黒くなり、その形質が子に遺伝したから', '黒い樹皮に合わせて、ガが自分で体の色を変えようとしたから', '大気汚染によって、暗色型の遺伝子の突然変異が毎世代多く起こったから'],
        explanation: '暗色型と明色型はもともと集団の中にあった遺伝的な変異で、黒い樹皮では明色型が鳥に食べられやすくなった。そのため暗色型が多く子を残し、暗色型の遺伝子の頻度が高くなった（工業暗化）。',
      };
    },
  },
  {
    id: 'a25-factor-term',
    stage: 'a25',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '集団の遺伝子頻度を変化させる要因のうち、環境に適応する方向に遺伝子頻度を変化させるものはどれか。',
        correct: '自然選択',
        wrong: ['遺伝的浮動', 'びん首効果', '創始者効果'],
        explanation: '自然選択は、その環境で生存や繁殖に有利な形質の遺伝子を増やすので、集団は環境に適応する方向へ変化する。遺伝的浮動やびん首効果・創始者効果は偶然による変化なので、有利・不利に関係なく遺伝子頻度が変わる。',
      };
    },
  },
  {
    id: 'a25-recessive-term',
    stage: 'a25',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '生存に不利な潜性の遺伝子は、自然選択がはたらいても、集団からなかなかなくならない。その理由として最も適当なものはどれか。',
        correct: 'その遺伝子の多くは、表現型に現れないヘテロ接合体の中にあり、選択を受けないから',
        wrong: ['潜性の遺伝子は、顕性の遺伝子より突然変異で生じやすいから', '潜性の遺伝子は、減数分裂で配偶子に入りやすいから', '不利な形質をもつ個体ほど、多くの子を残すから'],
        explanation: '潜性の遺伝子の頻度が小さいと、その多くはヘテロ接合体（Aa）の中にあり、顕性の形質を示すので選択を受けない。選択を受けるのは q² の割合の aa だけなので、q が小さくなるほど減り方がゆっくりになる。',
      };
    },
  },
  {
    id: 'a25-hetero-term',
    stage: 'a25',
    level: 3,
    kind: 'term',
    make() {
      return {
        text: '【発展】鎌状赤血球貧血症の原因となる遺伝子は、ホモ接合体では重い貧血を起こすのに、マラリアが多く発生する地域では高い頻度で見られる。この理由として最も適当なものはどれか。',
        correct: 'ヘテロ接合体はマラリアにかかりにくく、その地域では最も生存に有利だから',
        wrong: ['その地域では、この遺伝子の突然変異が特に起こりやすいから', 'マラリアの病原体が、この遺伝子を人から人へ運ぶから', 'ホモ接合体は貧血を起こすが、マラリアの地域では貧血が有利になるから'],
        explanation: 'マラリアの多い地域では、正常型のホモ接合体はマラリアに、鎌状のホモ接合体は貧血に苦しむので、ヘテロ接合体が最も多く子を残す。そのため両方の遺伝子が集団に残り、鎌状赤血球の遺伝子も高い頻度で保たれる。',
      };
    },
  },
  {
    id: 'a25-next-calc',
    stage: 'a25',
    level: 3,
    kind: 'calc',
    make(rng) {
      const q = rng.pick([0.4, 0.5, 0.6, 0.8]);
      const surv = rng.pick([0.5, 0.25]);
      const w = { AA: 1, Aa: 1, aa: surv };
      const ans = nextQ(q, w);
      const p = 1 - q;
      const d = distinctNumbers(ans, [q, q * surv, (q - q * q * (1 - surv)), q / (1 + q), q * q * surv, nextQ(q, { AA: 1, Aa: surv, aa: surv })], '', 3);
      return {
        text: `ガの集団で、明色型の遺伝子 c（潜性）の遺伝子頻度が ${q} である。自由交配で生まれた子のうち、明色型（cc）は ${fmt(surv * 100, 0)}% しか生き残れず、暗色型（CC・Cc）はすべて生き残るとする。生き残った個体の集団での c の遺伝子頻度はいくらか（小数第3位まで）。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `生まれた子は CC ${fmt(p * p, 2)}・Cc ${fmt(2 * p * q, 2)}・cc ${fmt(q * q, 2)} の割合で、cc は ${fmt(q * q * surv, 3)} だけ残るので、c の頻度は（Cc のもつ c は半分なので ${fmt(p * q, 2)}、これに cc の ${fmt(q * q * surv, 3)} を加えて）(${fmt(p * q, 2)} ＋ ${fmt(q * q * surv, 3)}) ÷ (${fmt(p * p + 2 * p * q, 2)} ＋ ${fmt(q * q * surv, 3)}) ＝ ${fmt(ans, 3)} となる。明色型が多く食べられるので、c の頻度が ${q} より小さくなるからである。`,
      };
    },
  },
];
