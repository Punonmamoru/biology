// B14 酵素のはたらき（カタラーゼ）の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { simulate, totalO2, O2_PER_ML, T_END } from '../models/catalase.js';

const curve = (opts) => simulate(opts).map((r) => [r.t, r.o2]);

export const B14 = [
  {
    id: 'b14-total-calc',
    stage: 'b14',
    level: 2,
    kind: 'calc',
    make(rng) {
      const v = rng.pick([1, 2, 3]);
      const o = v * O2_PER_ML;
      const k = rng.pick(['sub', 'enz']);
      const m = rng.pick([2, 3]);
      const ans = k === 'sub' ? o * m : o;
      const d = distinctNumbers(ans, k === 'sub' ? [o, o / m, o * m * m, o + m] : [o * m, o / m, o * m * m, o + 10], ' mL', 0);
      return {
        text: `3%過酸化水素水 ${v} mL に肝臓片を加えると、泡が出なくなるまでに酸素が ${o} mL 発生した。${k === 'sub' ? `過酸化水素水を ${v * m} mL にして（肝臓片は同じ量）` : `肝臓片を ${m} 倍の量にして（過酸化水素水は ${v} mL のまま）`}同じ実験をすると、泡が出なくなるまでに発生する酸素は何 mL か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: k === 'sub'
          ? `発生する酸素の総量は分解される過酸化水素（基質）の量に比例するので、${o} × ${m} ＝ ${ans} mL となる。酵素は反応の前後で変化しないので、基質がすべて分解されるまではたらき続けるからである。`
          : `酵素を増やすと反応は速くなるが、発生する酸素の総量は基質（過酸化水素）の量で決まるので ${o} mL のままである。酵素は反応の前後で変化せず、基質がなくなれば反応は止まるからである。`,
      };
    },
  },
  {
    id: 'b14-rate-graph',
    stage: 'b14',
    level: 2,
    kind: 'graph',
    make(rng) {
      const h2o2 = rng.pick([2, 3, 4]);
      const run = simulate({ cat: 'liver', h2o2, amount: rng.pick([0.5, 1]) });
      const ask = rng.pick(['total', 'first']);
      const total = Math.round(run[run.length - 1].o2);
      const first = Math.round(run.find((r) => r.t >= 1 - 1e-9).o2);
      const ans = ask === 'total' ? total : first;
      // グラフの読み取りの誤差（±2 mL 程度）で紛れないよう、正答から離れた値だけを誤答にする
      const d = distinctNumbers(ans, (ask === 'total' ? [total / 2, first, total * 2, h2o2] : [total, first / 2, first * 2, first + 8]).filter((v) => Math.abs(v - ans) >= 5), ' mL', 0);
      return {
        text: `図は、3%過酸化水素水 ${h2o2} mL に肝臓片を加えたときに発生した酸素の量（累計）の変化である。${ask === 'total' ? '泡が出なくなるまでに発生した酸素は全部でおよそ何 mL か。' : 'はじめの1分間に発生した酸素はおよそ何 mL か。'}`,
        chart: {
          x: { min: 0, max: T_END, label: '時間（分）', step: 1 },
          y: { min: 0, max: Math.ceil((total * 1.2) / 5) * 5, label: '発生した酸素の量（mL）', step: 5 },
          series: [{ points: run.map((r) => [r.t, r.o2]), color: 'c1', width: 3 }],
          vlines: ask === 'first' ? [{ x: 1, color: 'muted', dash: 'dot', label: '1分' }] : [],
          alt: '発生した酸素の量の変化のグラフ',
        },
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: ask === 'total'
          ? `グラフが水平になったところの値を読むと、約 ${total} mL である。グラフが水平になるのは、基質の過酸化水素がすべて分解されて反応が止まったからである。`
          : `1分のときのグラフの値を読むと、約 ${first} mL である。はじめは基質が多いので反応が速く、グラフの傾きが最も大きいからである。`,
      };
    },
  },
  {
    id: 'b14-which-curve',
    stage: 'b14',
    level: 2,
    kind: 'graph',
    make(rng) {
      const kinds = rng.shuffle(['enz', 'sub', 'boiled']);
      const opts = { enz: { cat: 'liver', h2o2: 2, amount: 2 }, sub: { cat: 'liver', h2o2: 4, amount: 1 }, boiled: { cat: 'boiled', h2o2: 2, amount: 1 } };
      const ask = rng.pick(['enz', 'sub']);
      const idx = kinds.indexOf(ask);
      const NAME = { enz: '肝臓片の量を2倍にした場合', sub: '過酸化水素水の量を2倍にした場合', boiled: '煮沸した肝臓片を使った場合' };
      const styles = [{ color: 'c2', dash: 'dash' }, { color: 'c1', dash: 'dashdot' }, { color: 'c4', dash: 'dot' }];
      return {
        text: `図の実線は、3%過酸化水素水 2 mL に肝臓片を加えたときに発生した酸素の量（累計）である。ア〜ウは、${Object.values(NAME).join('・')}のいずれかである。${NAME[ask]}はどれか。`,
        chart: {
          x: { min: 0, max: T_END, label: '時間（分）', step: 2 },
          y: { min: 0, max: 50, label: '発生した酸素の量（mL）', step: 10 },
          series: [
            { points: curve({ cat: 'liver', h2o2: 2, amount: 1 }), color: 'fg', width: 3, label: 'もとの実験', labelAt: 9 },
            ...kinds.map((k, i) => ({ points: curve(opts[k]), ...styles[i], width: 3, label: KATA[i], labelAt: k === 'enz' ? 0.8 : k === 'sub' ? 9 : 10 })),
          ],
          alt: 'もとの実験とア〜ウの酸素の発生量のグラフ',
        },
        correct: KATA[idx],
        wrong: KATA.slice(0, 3).filter((_, i) => i !== idx).concat(['どれでもない']),
        explanation: ask === 'enz'
          ? `肝臓片（酵素）を増やすと反応は速くなるが、発生する酸素の総量はもとの実験と同じになるので${KATA[idx]}である。酸素の総量は基質の過酸化水素の量で決まるからである。`
          : `過酸化水素水（基質）を2倍にすると、発生する酸素の総量が2倍になるので${KATA[idx]}である。酵素はくり返しはたらくので、増えた基質もすべて分解されるからである。`,
      };
    },
  },
  {
    id: 'b14-add',
    stage: 'b14',
    level: 2,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '過酸化水素水に肝臓片を入れると泡（酸素）が出て、やがて出なくなった。この試験管に過酸化水素水を追加したときの結果と、そこからわかることの組合せとして正しいものはどれか。',
          correct: '再び泡が出る。酵素は反応の前後で変化せず、くり返しはたらく',
          wrong: ['泡は出ない。酵素は1回の反応で使いきられる', '再び泡が出る。酵素は反応によって新しくつくられる', '泡は出ない。過酸化水素は肝臓片とは反応しない'],
          explanation: '過酸化水素水を追加すると再び泡が出る。泡が止まったのは基質の過酸化水素がなくなったためで、酵素（カタラーゼ）は反応の前後で変化せず残っているからである。',
        };
      }
      return {
        text: '過酸化水素水に肝臓片を入れると泡（酸素）が出て、やがて出なくなった。この試験管に新しい肝臓片を追加したときの結果と、その理由の組合せとして正しいものはどれか。',
        correct: '泡は出ない。基質の過酸化水素がすべて分解されているから',
        wrong: ['再び泡が出る。新しい酵素が加わったから', '泡は出ない。新しい肝臓片の酵素がはたらかないから', '再び泡が出る。肝臓片が過酸化水素をつくるから'],
        explanation: '新しい肝臓片を加えても泡は出ない。泡が止まったのは酵素がなくなったからではなく、基質の過酸化水素がすべて分解されてなくなったからである。',
      };
    },
  },
  {
    id: 'b14-boiled',
    stage: 'b14',
    level: 1,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '煮沸した肝臓片を過酸化水素水に入れても、泡（酸素）はほとんど出なかった。その理由として正しいものはどれか。',
          correct: 'カタラーゼはタンパク質でできていて、高温で変性してはたらきを失ったから',
          wrong: ['煮沸によって肝臓片の中のカタラーゼの量が増えたから', '過酸化水素は高温の肝臓片とは混ざらないから', '煮沸によって肝臓片が無機触媒に変わったから'],
          explanation: '酵素（カタラーゼ）はタンパク質を主成分とするので、高温にすると立体構造が変化して（変性して）はたらきを失う。そのため煮沸した肝臓片では過酸化水素がほとんど分解されない。',
        };
      }
      return {
        text: '酸化マンガン(IV)を加熱してから過酸化水素水に入れると、どうなるか。',
        correct: '加熱しないときと同じように泡（酸素）が出る',
        wrong: ['泡はまったく出ない', '泡は出るが、酸素ではなく二酸化炭素が出る', '過酸化水素が増える'],
        explanation: '酸化マンガン(IV)は無機触媒で、タンパク質ではないので加熱してもはたらきを失わない。そのため加熱したあとでも過酸化水素を分解し、酸素が発生する。',
      };
    },
  },
  {
    id: 'b14-enzyme-term',
    stage: 'b14',
    level: 1,
    kind: 'term',
    make(rng) {
      const Q = [
        { text: '酵素についての説明として正しいものはどれか。', correct: '主成分がタンパク質の生体触媒で、反応の前後で変化しない', wrong: ['主成分が脂質の生体触媒で、反応のたびに使いきられる', '細胞の外では、まったくはたらかない', 'どんな物質にも同じようにはたらく'], explanation: '酵素は、細胞内でつくられるタンパク質を主成分とする触媒（生体触媒）である。反応の前後で変化しないので、少量でもくり返しはたらくことができる。' },
        { text: '酵素が特定の物質にだけはたらく性質を何というか。', correct: '基質特異性', wrong: ['恒常性', '自動性', '最適温度'], explanation: 'この性質を基質特異性という。酵素は活性部位の形に合う特定の物質（基質）とだけ結合するので、決まった反応だけを促進するからである。' },
        { text: '酵素がはたらく相手の物質を何というか。', correct: '基質', wrong: ['生成物', '触媒', '補酵素'], explanation: '酵素がはたらく相手の物質を基質という。カタラーゼの基質は過酸化水素で、酵素が基質と結合することで反応が進むからである。' },
      ];
      return rng.pick(Q);
    },
  },
  {
    id: 'b14-atp',
    stage: 'b14',
    level: 1,
    kind: 'term',
    make(rng) {
      const Q = [
        { text: 'ATP（アデノシン三リン酸）を構成するものの組合せとして正しいものはどれか。', correct: 'アデニン・リボース・3個のリン酸', wrong: ['アデニン・デオキシリボース・3個のリン酸', 'アデニン・リボース・2個のリン酸', 'アミノ酸・リボース・3個のリン酸'], explanation: 'ATP は、塩基のアデニンと糖のリボース（この2つでアデノシン）に、3個のリン酸が結合した物質である。リン酸どうしの結合（高エネルギーリン酸結合）にエネルギーがたくわえられているので、生命活動のエネルギーの受けわたしに使われる。' },
        { text: 'ATP が分解されてエネルギーが取り出されるときの反応として正しいものはどれか。', correct: 'ATP → ADP ＋ リン酸', wrong: ['ADP ＋ リン酸 → ATP', 'ATP → アデニン ＋ リボース', 'ATP → DNA ＋ リン酸'], explanation: 'ATP の末端のリン酸が切り離されて ADP とリン酸になるとき、エネルギーが放出される。このエネルギーが筋肉の収縮や物質の合成などに使われるからである。' },
      ];
      return rng.pick(Q);
    },
  },
  {
    id: 'b14-metabolism',
    stage: 'b14',
    level: 1,
    kind: 'term',
    make(rng) {
      const isAna = rng.chance(0.5);
      return {
        text: isAna ? '代謝のうち、簡単な物質から複雑な物質を合成し、エネルギーを吸収する過程を何というか。また、その例はどれか。' : '代謝のうち、複雑な物質を簡単な物質に分解し、エネルギーを放出する過程を何というか。また、その例はどれか。',
        correct: isAna ? '同化：光合成' : '異化：呼吸',
        wrong: isAna ? ['同化：呼吸', '異化：光合成', '異化：呼吸'] : ['異化：光合成', '同化：呼吸', '同化：光合成'],
        explanation: isAna
          ? '簡単な物質から複雑な物質を合成する過程を同化といい、光合成は光エネルギーを使って二酸化炭素と水から有機物をつくる同化である。同化ではエネルギーが吸収され、有機物の中にたくわえられるからである。'
          : '複雑な物質を分解してエネルギーを取り出す過程を異化といい、呼吸は有機物を二酸化炭素と水に分解する異化である。取り出したエネルギーは ATP の合成に使われるからである。',
      };
    },
  },
  {
    id: 'b14-partial-calc',
    stage: 'b14',
    level: 3,
    kind: 'calc',
    make(rng) {
      const v = rng.pick([2, 3, 4, 5]);
      const frac = rng.pick([0.25, 0.5, 0.75]);
      const ans = v * O2_PER_ML * frac;
      const d = distinctNumbers(ans, [v * O2_PER_ML, v * frac, v * O2_PER_ML * (1 - frac), ans * 2, ans / 2], ' mL', 1);
      return {
        text: `3%過酸化水素水 1 mL がすべて分解されると、酸素が ${O2_PER_ML} mL 発生するとする。3%過酸化水素水 ${v} mL に肝臓片を加え、含まれる過酸化水素の ${fmt(frac * 100, 0)}% が分解された時点で、発生した酸素は何 mL か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `${v} mL がすべて分解されると ${v * O2_PER_ML} mL 発生するので、その ${fmt(frac * 100, 0)}% の ${fmt(ans, 1)} mL となる。発生する酸素の量は、分解された過酸化水素の量に比例するからである。`,
      };
    },
  },
];
