// A11 分子系統と分子時計 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { diffs, distanceMatrix, upgma, pairKey, SPECIES } from '../models/phylo.js';

// 系統樹（クラスターの入れ子）を、グラフ部品の線分で描く
function treeSeries(root, rate) {
  const leaves = [];
  const order = (c) => (c.left ? (order(c.left), order(c.right)) : leaves.push(c.id));
  order(root);
  const xOf = {};
  leaves.forEach((id, i) => (xOf[id] = i + 1));
  const series = [];
  const markers = [];
  const pos = (c) => {
    if (!c.left) return { x: xOf[c.id], y: 0 };
    const a = pos(c.left);
    const b = pos(c.right);
    const y = c.height / rate; // 違いの数の半分 ÷ 1系統あたりの速さ ＝ 分岐年代
    series.push({ points: [[a.x, a.y], [a.x, y], [b.x, y], [b.x, b.y]], color: 'c1', width: 3 });
    markers.push({ x: (a.x + b.x) / 2, y, color: 'c2', shape: 'square', label: `${fmt(y, 0)}` });
    return { x: (a.x + b.x) / 2, y };
  };
  pos(root);
  return { series, markers, leaves };
}

const PAIRS = { AB: ['A', 'B'], AC: ['A', 'C'], BC: ['B', 'C'] };

export const dojo = {
  tasks: [
    { id: 'linear', text: '①で分岐年代を変え、違いの数が分岐年代に比例することを確かめよう（分岐年代を2回以上変える）。', short: '違いの数は年代に比例' },
    { id: 'rate', text: '①で置換の速さを変え、速く変化するタンパク質ほど直線の傾きが大きいことを確かめよう。', short: '分子によって速さが違う' },
    { id: 'pair', text: '②で「最も近い2種」を切り替え、違いの数の表から作られる系統樹の形が変わることを確かめよう。', short: '系統樹の形が変わる' },
    { id: 'close', text: '②で、最も近い2種の分岐年代と、3種目との分岐年代を近づけて、違いの数の差が小さくなることを確かめよう（差を10百万年以下に）。', short: '分岐が近いと差が小さい' },
  ],
  mount(root, ctx) {
    const st = { tab: 'clock', rate: 0.2, t: 200, pair: 'AB', t1: 40, t2: 120, t3: 300, tMoves: 0, rateMoves: 0, pairMoves: 0 };

    const tabs = segmented({ label: '内容', options: [{ value: 'clock', label: '①分子時計' }, { value: 'tree', label: '②違いの数から系統樹' }], value: st.tab, onChange: (v) => { st.tab = v; layout(); } });
    const top = panel(null);
    root.append(tabs.el, top);
    const title = h('h2');
    top.append(title);
    const chart = createChart(top, { label: '分子時計のグラフ', aspect: 0.68 });
    const leg = h('div');
    const table = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, table, note);

    const sRate = slider({ label: '置換の速さ（1つの系統で100万年あたりのアミノ酸の置換数）', min: 0.05, max: 0.5, step: 0.05, value: st.rate, format: (v) => fmt(v, 2), onInput: (v) => { st.rate = v; st.rateMoves++; update(); } });
    const sT = slider({ label: '2種が分岐した年代', min: 0, max: 500, step: 10, value: st.t, format: (v) => `${v} 百万年前`, onInput: (v) => { st.t = v; st.tMoves++; update(); } });
    const ctlClock = h('div', null, sT.el);
    const segP = segmented({ label: '最も近い2種', options: Object.keys(PAIRS).map((k) => ({ value: k, label: `${k[0]} と ${k[1]}` })), value: st.pair, onChange: (v) => { st.pair = v; st.pairMoves++; update(); } });
    const s1 = slider({ label: '最も近い2種の分岐', min: 10, max: 280, step: 10, value: st.t1, format: (v) => `${v} 百万年前`, onInput: (v) => { st.t1 = v; fix('t1'); update(); } });
    const s2 = slider({ label: '3種目との分岐', min: 20, max: 290, step: 10, value: st.t2, format: (v) => `${v} 百万年前`, onInput: (v) => { st.t2 = v; fix('t2'); update(); } });
    const s3 = slider({ label: 'D との分岐', min: 30, max: 300, step: 10, value: st.t3, format: (v) => `${v} 百万年前`, onInput: (v) => { st.t3 = v; fix('t3'); update(); } });
    const ctlTree = h('div', null, segP.el, s1.el, s2.el, s3.el);
    const exp = explainBox();
    root.append(panel('操作', sRate.el, ctlClock, ctlTree), panel('いま何が起きているか', exp.el));

    // t1 ＜ t2 ＜ t3 を保つ
    function fix(changed) {
      if (changed === 't1') { st.t2 = Math.max(st.t2, st.t1 + 10); st.t3 = Math.max(st.t3, st.t2 + 10); }
      if (changed === 't2') { st.t1 = Math.min(st.t1, st.t2 - 10); st.t3 = Math.max(st.t3, st.t2 + 10); }
      if (changed === 't3') { st.t2 = Math.min(st.t2, st.t3 - 10); st.t1 = Math.min(st.t1, st.t2 - 10); }
      s1.set(st.t1, true);
      s2.set(st.t2, true);
      s3.set(st.t3, true);
    }

    function layout() {
      ctlClock.hidden = st.tab !== 'clock';
      ctlTree.hidden = st.tab !== 'tree';
      update();
    }

    function drawClock() {
      const { rate, t } = st;
      const D = diffs(t, rate);
      const ref = 100;
      const Dref = diffs(ref, rate);
      title.replaceChildren('分岐年代とアミノ酸の違いの数 ', modelNote('架空のタンパク質（アミノ酸300個）'));
      chart.draw({
        alt: `分岐 ${t} 百万年前で違い ${fmt(D, 0)} 個`,
        x: { min: 0, max: 500, label: '分岐した年代（百万年前）', step: 100 },
        y: { min: 0, max: 520, label: 'アミノ酸の違いの数', step: 100 },
        series: [
          { points: [[0, 0], [500, diffs(500, 0.5)]], color: 'muted', dash: 'dot', width: 1.5, label: '速さ 0.5', labelAt: 480 },
          { points: [[0, 0], [500, diffs(500, rate)]], color: 'c1', width: 3 },
        ],
        vlines: [{ x: t, color: 'c2', dash: 'dot' }],
        markers: [
          { x: ref, y: Dref, color: 'c3', shape: 'square', label: `基準：${ref} 百万年前・${fmt(Dref, 0)} 個` },
          { x: t, y: D, color: 'c2', label: `${fmt(D, 0)} 個` },
        ],
      });
      leg.replaceChildren(legend([{ label: `いまの置換の速さ（${fmt(rate, 2)}）の直線`, color: 'c1' }, { label: '速さ 0.5（比較）', color: 'muted', dash: 'dot' }]));
      table.replaceChildren();
      note.textContent = 'アミノ酸の数より違いの数が十分に小さい範囲を考えている。非常に古い分岐では、同じ場所で置換がくり返し起こるため、違いの数は直線より少なくなる。';
      exp.set([
        `2種が分岐してから、それぞれの系統で置換が積み重なるので、違いの数 ＝ 2 × ${fmt(rate, 2)} × ${t} ＝ ${fmt(D, 0)} 個。違いの数は分岐してからの時間に比例する（分子時計）。`,
        `化石などで分岐年代がわかっている基準の組（${ref} 百万年前に分岐、違い ${fmt(Dref, 0)} 個）を使うと、違いが ${fmt(D, 0)} 個の組の分岐年代は ${ref} × ${fmt(D, 0)} ÷ ${fmt(Dref, 0)} ＝ ${fmt(t, 0)} 百万年前と推定できる。`,
        '置換の速さは分子によって違う。生存に重要な部分（機能上の制約が大きい部分）では、ほとんどの変異が不利になって集団に残らないので、置換はゆっくり進む。生存に影響しない（中立な）変異は、遺伝的浮動によって一定の速さで蓄積する。',
      ]);
      return {};
    }

    function drawTree() {
      const pair = PAIRS[st.pair];
      const m = distanceMatrix({ pair, t1: st.t1, t2: st.t2, t3: st.t3, rate: st.rate });
      const { root: tr, steps } = upgma(m);
      const tree = treeSeries(tr, st.rate);
      title.replaceChildren('アミノ酸の違いの数から作った系統樹 ', modelNote('架空の生物 A〜D'));
      chart.draw({
        alt: `系統樹：${steps.map((s) => s.members.join('')).join(' → ')}`,
        x: { min: 0.5, max: 4.5, ticks: tree.leaves.map((id, i) => ({ v: i + 1, text: `生物${id}` })), grid: false },
        y: { min: 0, max: 330, label: '分岐した年代（百万年前）', step: 50 },
        series: tree.series,
        markers: tree.markers,
      });
      leg.replaceChildren(legend([{ label: '系統樹（□は分岐した年代、百万年前）', color: 'c1' }]));
      const th = (t) => h('th', null, t);
      table.replaceChildren(
        h('table', { class: 'data' },
          h('thead', null, h('tr', null, th('違いの数'), ...SPECIES.map((s) => th(s)))),
          h('tbody', null, ...SPECIES.map((a) => h('tr', null, h('td', null, a), ...SPECIES.map((b) => h('td', null, a === b ? '—' : String(m[pairKey(a, b)])))))),
        ),
      );
      note.textContent = '違いの数の表から、違いの最も小さい組を順にまとめて系統樹を作った（UPGMA法の考え方）。分岐の高さ ＝ 違いの数 ÷ 2 ÷ 置換の速さ。';
      const first = steps[0];
      const second = steps[1];
      exp.set([
        `違いの数がいちばん小さいのは ${first.a} と ${first.b}（${first.d} 個）なので、この2種が最も近縁で、最も新しく分岐したと考えられる。違いの数は、分岐してからの時間に比例するからである。`,
        `次に、${first.a}${first.b} のまとまりと ${second.a === `(${first.a},${first.b})` ? second.b : second.a} との違いの平均（${fmt(second.d, 1)} 個）が小さいので、これらをまとめる。最後に残った D が最も古く分かれた生物（外群）になる。`,
        'このように、DNAの塩基配列やタンパク質のアミノ酸配列の違いをもとに作った系統樹を分子系統樹という。',
      ]);
      return { diffT: st.t2 - st.t1 };
    }

    function update() {
      const r = st.tab === 'clock' ? drawClock() : drawTree();
      ctx.update({ ...st, ...r });
    }
    layout();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.tab === 'clock' && s.tMoves >= 2;
dojo.tasks[1].check = (s) => s.tab === 'clock' && s.rateMoves >= 1;
dojo.tasks[2].check = (s) => s.tab === 'tree' && s.pairMoves >= 1;
dojo.tasks[3].check = (s) => s.tab === 'tree' && s.diffT <= 10;
