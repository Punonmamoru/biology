// A7 遺伝子発現の調節（ラクトースオペロン）の問題
import { fmt } from '../lib/format.js';
import { distinctNumbers, assignmentQuestion } from './common.js';
import { operonState, diauxie, glucoseOutTime, DIAUXIE, codingBases } from '../models/operon.js';

const RUN = diauxie();
const T_GLC = glucoseOutTime(RUN);

export const A7 = [
  {
    id: 'a7-parts',
    stage: 'a7',
    level: 1,
    kind: 'term',
    make() {
      const q = assignmentQuestion(['ア', 'イ', 'ウ'], ['プロモーター', 'オペレーター', '調節遺伝子']);
      return {
        text: 'ラクトースオペロンについて、次のア〜ウにあてはまる語の組合せとして正しいものはどれか。　ア：RNAポリメラーゼが結合して転写を始める領域　イ：リプレッサーが結合する領域　ウ：リプレッサーをつくる遺伝子',
        correct: q.correct,
        wrong: q.wrong,
        explanation: 'アはプロモーター、イはオペレーター、ウは調節遺伝子である。なお、オペレーターはプロモーターと構造遺伝子の間にあり、リプレッサーが結合するとRNAポリメラーゼがプロモーターに結合できなくなるので、転写が起こらない。',
      };
    },
  },
  {
    id: 'a7-no-lactose',
    stage: 'a7',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: 'グルコースがなく、ラクトースもない培地で大腸菌を培養したとき、ラクトースオペロンの構造遺伝子が転写されない理由として正しいものはどれか。',
        correct: 'リプレッサーがオペレーターに結合し、RNAポリメラーゼによる転写が妨げられるから',
        wrong: [
          'リプレッサーがRNAポリメラーゼを分解するから',
          'ラクトースがオペレーターに結合し、転写が妨げられるから',
          '調節遺伝子が転写されず、リプレッサーがつくられないから',
        ],
        explanation: 'ラクトースがないとき、調節遺伝子からつくられたリプレッサーはオペレーターに結合する。そのためRNAポリメラーゼがプロモーターに結合できずに転写が起こらないので、不要な酵素をつくらずにすむ。',
      };
    },
  },
  {
    id: 'a7-inducer',
    stage: 'a7',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '培地にラクトースを加えると、ラクトースオペロンの構造遺伝子の転写が始まる。このしくみとして正しいものはどれか（グルコースはないものとする）。',
        correct: 'ラクトースからできる物質がリプレッサーに結合し、リプレッサーがオペレーターに結合できなくなる',
        wrong: [
          'ラクトースからできる物質がオペレーターに結合し、リプレッサーを押しのける',
          'ラクトースが調節遺伝子に結合し、リプレッサーの合成を止める',
          'ラクトースがRNAポリメラーゼに結合し、転写を始めさせる',
        ],
        explanation: 'ラクトースからできる物質がリプレッサーに結合すると、リプレッサーの立体構造が変わってオペレーターに結合できなくなる。オペレーターが空くので、RNAポリメラーゼがプロモーターに結合して構造遺伝子を転写できるようになる。',
      };
    },
  },
  {
    id: 'a7-mutant',
    stage: 'a7',
    level: 3,
    kind: 'term',
    make(rng) {
      const m = rng.pick(['noRepressor', 'operator', 'noInducer']);
      const lacOff = operonState({ lactose: false, glucose: false, mutant: m }).level !== 'off';
      const lacOn = operonState({ lactose: true, glucose: false, mutant: m }).level !== 'off';
      const desc = {
        noRepressor: '調節遺伝子に変異が起こり、リプレッサーがつくられなくなった',
        operator: 'オペレーターの塩基配列に変異が起こり、リプレッサーが結合できなくなった',
        noInducer: '調節遺伝子に変異が起こり、ラクトースからできる物質と結合できないリプレッサー（オペレーターには結合できる）がつくられるようになった',
      }[m];
      const opts = {
        both: 'ラクトースの有無にかかわらず転写される',
        none: 'ラクトースの有無にかかわらず転写されない',
        normal: 'ラクトースがあるときだけ転写される',
        reverse: 'ラクトースがないときだけ転写される',
      };
      const key = lacOff && lacOn ? 'both' : !lacOff && !lacOn ? 'none' : lacOn ? 'normal' : 'reverse';
      return {
        text: `大腸菌のある変異株では、${desc}。グルコースのない培地で、この変異株のラクトースオペロンの構造遺伝子はどうなるか。`,
        correct: opts[key],
        wrong: Object.values(opts),
        ordered: false,
        explanation: key === 'both'
          ? `${m === 'noRepressor' ? 'リプレッサーがないので' : 'リプレッサーがオペレーターに結合できないので'}、ラクトースがなくても転写を止めるものがない。そのため、ラクトースの有無にかかわらず構造遺伝子が転写される。`
          : 'この変異株のリプレッサーはラクトースからできる物質と結合できないので、ラクトースがあってもオペレーターに結合したままになる。そのため、ラクトースの有無にかかわらず構造遺伝子は転写されない。',
      };
    },
  },
  {
    id: 'a7-glucose',
    stage: 'a7',
    level: 3,
    kind: 'term',
    make() {
      return {
        text: '（発展）グルコースとラクトースの両方を含む培地で大腸菌を培養すると、ラクトースがあるにもかかわらず、ラクトースオペロンの転写はわずかしか起こらない。この理由として最も適当なものはどれか。',
        correct: 'グルコースがあると、転写を促進するタンパク質がはたらかないから',
        wrong: [
          'グルコースがリプレッサーに結合して、オペレーターへの結合を強めるから',
          'グルコースがあると、調節遺伝子が転写されなくなるから',
          'グルコースがオペレーターに結合して、RNAポリメラーゼを妨げるから',
        ],
        explanation: 'ラクトースがあるのでリプレッサーはオペレーターから外れているが、ラクトースオペロンが十分に転写されるには、グルコースがないときにプロモーター付近に結合して転写を促進するタンパク質（CRP）が必要である。グルコースがあるとこのタンパク質がはたらかないので、大腸菌は利用しやすいグルコースを先に使うのである。',
      };
    },
  },
  {
    id: 'a7-diauxie',
    stage: 'a7',
    level: 3,
    kind: 'graph',
    make(rng) {
      const ask = rng.pick(['enzyme', 'lag']);
      return {
        text: ask === 'enzyme'
          ? '（発展）図は、グルコースとラクトースを両方含む培地で大腸菌を培養したときの、菌の数（実線・対数目盛り）とβ-ガラクトシダーゼ（ラクトースを分解する酵素）の量（破線）の変化である。β-ガラクトシダーゼが増えはじめる時期について正しいものはどれか。'
          : '（発展）図は、グルコースとラクトースを両方含む培地で大腸菌を培養したときの、菌の数（実線・対数目盛り）とβ-ガラクトシダーゼの量（破線）の変化である。途中で菌の数がしばらく増えなくなる理由として最も適当なものはどれか。',
        chart: {
          x: { min: 0, max: DIAUXIE.T, label: '時間（時間）', step: 2 },
          y: { min: 1, max: 1000, log: true, label: '菌の数（相対値）' },
          y2: { min: 0, max: 1.2, label: '酵素の量（相対値）', step: 0.2, digits: 1 },
          series: [
            { points: RUN.map((r) => [r.t, r.N]), color: 'c1', width: 3, label: '菌の数', labelAt: 2 },
            { points: RUN.map((r) => [r.t, r.E]), color: 'c2', dash: 'dash', width: 3, axis: 'y2', label: '酵素の量', labelAt: 10 },
          ],
          alt: '二段階の増殖曲線と酵素の量',
        },
        correct: ask === 'enzyme'
          ? 'グルコースを使い切ったあとで増えはじめる'
          : 'グルコースを使い切ったあと、ラクトースを分解する酵素がつくられるまで時間がかかるから',
        wrong: ask === 'enzyme'
          ? ['培養を始めた直後から増えはじめる', 'ラクトースを使い切ったあとで増えはじめる', 'グルコースとラクトースを両方使い切ったあとで増えはじめる']
          : ['ラクトースを使い切ったから', 'グルコースがリプレッサーとしてはたらくから', '菌の数が環境収容力に達したから'],
        explanation: ask === 'enzyme'
          ? `グルコースがある間はラクトースオペロンがほとんど転写されず、酵素はほとんどない。約${fmt(T_GLC, 0)}時間でグルコースがなくなると転写がオンになり、β-ガラクトシダーゼが増えはじめるから、その後ラクトースを使って再び増殖できる。`
          : `約${fmt(T_GLC, 0)}時間でグルコースを使い切ると、ラクトースオペロンの転写が始まるが、β-ガラクトシダーゼなどの酵素がそろうまでには時間がかかる。その間はラクトースを利用できないので増殖が止まり、酵素がそろうと再び増える（二段階の増殖）。`,
      };
    },
  },
  {
    id: 'a7-mrna-length',
    stage: 'a7',
    level: 2,
    kind: 'calc',
    make(rng) {
      const z = rng.pick([1020, 1021, 1023, 1024]);
      const y = rng.pick([417, 400, 420]);
      const ask = rng.pick(['z', 'zy']);
      const ans = ask === 'z' ? codingBases(z) : codingBases(z) + codingBases(y);
      const base = ask === 'z' ? z : z + y;
      const d = distinctNumbers(ans, [base * 3, ask === 'z' ? z : z + y, base * 3 - 3, ans * 2, ask === 'z' ? z * 2 : (z + y) * 2, base * 3 + 6], ' 塩基', 0);
      return {
        text: ask === 'z'
          ? `β-ガラクトシダーゼは ${z.toLocaleString('ja-JP')} 個のアミノ酸からなるポリペプチドとしてつくられるものとする。この遺伝子のmRNAのうち、開始コドンから終止コドンまで（終止コドンを含む）の塩基数はいくらか。`
          : `ラクトースオペロンでは、構造遺伝子が1本のmRNAとしてまとめて転写される。最初の2つの遺伝子がそれぞれ ${z.toLocaleString('ja-JP')} 個・${y} 個のアミノ酸からなるポリペプチドを指定するとき、この2つの遺伝子の、開始コドンから終止コドンまで（終止コドンを含む）の塩基数の合計はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: ask === 'z'
          ? `アミノ酸1個は3塩基（コドン1つ）で指定され、最後に終止コドンが1つあるので、(${z} ＋ 1) × 3 ＝ ${ans} 塩基である。終止コドンはアミノ酸を指定しないから、アミノ酸の数とは別に3塩基を加えなければならない。`
          : `それぞれの遺伝子に終止コドンがあるので、(${z} ＋ 1) × 3 ＋ (${y} ＋ 1) × 3 ＝ ${ans} 塩基である。1本のmRNAに複数の遺伝子が並んでいても、遺伝子ごとに開始コドンから終止コドンまでが翻訳されるからである。`,
      };
    },
  },
  {
    id: 'a7-induction-ratio',
    stage: 'a7',
    level: 3,
    kind: 'calc',
    make(rng) {
      const off = rng.pick([1, 2, 5]);
      const low = off * rng.pick([10, 20, 25]);
      const high = off * rng.pick([500, 800, 1000, 1200]);
      const ask = rng.pick(['high-off', 'high-low']);
      const ans = ask === 'high-off' ? high / off : high / low;
      const d = distinctNumbers(ans, [high / low, high / off, low / off, high - off, high - low, ans / 10], ' 倍', 0);
      return {
        text: `（発展）大腸菌を3種類の培地で培養し、β-ガラクトシダーゼの活性（相対値）を測定したところ、グルコースのみ ${off}、グルコースとラクトース ${low}、ラクトースのみ ${high} であった。ラクトースのみの培地での活性は、${ask === 'high-off' ? 'グルコースのみの培地' : 'グルコースとラクトースを両方含む培地'}の何倍か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `${high} ÷ ${ask === 'high-off' ? off : low} ＝ ${fmt(ans, 0)}倍である。${ask === 'high-off' ? 'ラクトースがないとリプレッサーがオペレーターに結合して転写がほとんど起こらないが、ラクトースだけがあると転写がさかんになるからである' : 'グルコースがあると転写を促進するタンパク質がはたらかず、ラクトースがあっても転写はわずかしか起こらないからである'}。`,
      };
    },
  },
  {
    id: 'a7-operon-def',
    stage: 'a7',
    level: 1,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '原核生物で、関連するはたらきをもつ複数の遺伝子が隣り合って並び、まとめて1本のmRNAとして転写調節を受ける単位を何というか。',
          correct: 'オペロン',
          wrong: ['オペレーター', 'プロモーター', 'イントロン', 'リプレッサー'],
          explanation: 'これをオペロンという。なお、ラクトースオペロンでは、ラクトースの分解と取り込みにはたらく複数の構造遺伝子が1つのプロモーターから続けて転写されるので、必要なときにまとめて発現させられる。',
        };
      }
      return {
        text: '遺伝子の転写を調節するタンパク質で、ラクトースオペロンではオペレーターに結合して転写を抑制するものを何というか。',
        correct: 'リプレッサー',
        wrong: ['RNAポリメラーゼ', 'オペレーター', 'β-ガラクトシダーゼ', '基本転写因子'],
        explanation: 'これはリプレッサー（抑制因子）で、調節遺伝子からつくられる調節タンパク質の一種である。なお、リプレッサーがオペレーターに結合するとRNAポリメラーゼがプロモーターに結合できなくなるので、転写が抑制される。',
      };
    },
  },
];
