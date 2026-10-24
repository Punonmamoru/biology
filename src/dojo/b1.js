// B1 細胞周期とDNA量 の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend, tokenColor } from '../lib/chart.js';
import { slider, explainBox, panel, modelNote } from './common.js';
import { cycleLength, phaseAt, dnaAt, dnaSeries, mSubphase, phaseLengthsFromCounts, PHASES, PHASE_NAMES } from '../models/cellcycle.js';

const TEXT = {
  G1: 'DNAを複製する準備をしている。DNA量は2（複製前）。',
  S: 'DNAを複製している最中。DNA量が2から4へしだいに増える。',
  G2: 'DNAの複製が終わり、分裂の準備をしている。DNA量は4。',
};
const M_TEXT = {
  前期: '前期：染色体が凝縮して太く短いひも状になり、やがて核膜が消える。',
  中期: '中期：染色体が細胞の中央（赤道面）に並ぶ。染色体の観察に適した時期。',
  後期: '後期：各染色体が縦に裂けるように分かれ、両極へ移動する。',
  終期: '終期：核膜が再び現れ、細胞質分裂が起こる。後期に両極へ分かれた染色体がそれぞれの細胞に入るので、細胞1個あたりのDNA量は4から2に戻る。',
};

// 細胞の模式図
function drawCell(canvas, phase, frac) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const S = 120;
  canvas.width = S * dpr;
  canvas.height = S * dpr;
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, S, S);
  const fg = tokenColor('fg');
  const c1 = tokenColor('c1');
  const c2 = tokenColor('c2');
  const muted = tokenColor('muted');
  g.lineWidth = 2;
  g.strokeStyle = fg;
  const sub = phase === 'M' ? mSubphase(frac) : null;

  // 細胞膜
  g.beginPath();
  if (sub === '終期') {
    const pinch = 20 * Math.min(1, (frac - 0.75) / 0.25);
    g.moveTo(60, 14 + pinch);
    g.bezierCurveTo(10, 0, 10, 120, 60, 106 - pinch);
    g.bezierCurveTo(110, 120, 110, 0, 60, 14 + pinch);
  } else {
    g.ellipse(60, 60, 50, 46, 0, 0, Math.PI * 2);
  }
  g.stroke();

  const chrom = (x, y, ang, color, doubled) => {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.strokeStyle = color;
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.beginPath();
    if (doubled) {
      g.moveTo(-3, -9); g.lineTo(-1, 0); g.lineTo(-3, 9);
      g.moveTo(3, -9); g.lineTo(1, 0); g.lineTo(3, 9);
    } else {
      g.moveTo(0, -9); g.lineTo(0, 9);
    }
    g.stroke();
    g.restore();
  };

  if (!sub || sub === '前期') {
    // 核
    g.setLineDash(sub === '前期' ? [4, 4] : []);
    g.strokeStyle = muted;
    g.beginPath();
    g.arc(60, 60, phase === 'G2' ? 28 : 24, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    if (sub === '前期') {
      chrom(50, 52, 0.4, c1, true);
      chrom(68, 56, -0.5, c2, true);
      chrom(58, 70, 1.3, c1, true);
      chrom(66, 70, 0.2, c2, true);
    } else {
      // クロマチン（細い糸）
      const n = phase === 'G1' ? 1 : phase === 'S' ? 1 + frac : 2;
      g.lineWidth = 1.2;
      for (let k = 0; k < Math.round(n * 4); k++) {
        g.strokeStyle = k % 2 ? c1 : c2;
        g.beginPath();
        const a = (k * 1.7) % (Math.PI * 2);
        g.moveTo(60 + 14 * Math.cos(a), 60 + 14 * Math.sin(a));
        g.quadraticCurveTo(60 + 4 * Math.cos(a + 1), 60 + 4 * Math.sin(a + 2), 60 + 16 * Math.cos(a + 2.4), 60 + 14 * Math.sin(a + 2.4));
        g.stroke();
      }
    }
  } else if (sub === '中期') {
    g.setLineDash([3, 4]);
    g.strokeStyle = muted;
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(60, 20); g.lineTo(60, 100); g.stroke();
    g.setLineDash([]);
    [38, 52, 66, 80].forEach((y, i) => chrom(60, y, Math.PI / 2, i % 2 ? c2 : c1, true));
  } else {
    const sep = sub === '後期' ? 8 + 24 * ((frac - 0.5) / 0.25) : 32;
    [42, 56, 66, 78].forEach((y, i) => {
      const col = i % 2 ? c2 : c1;
      chrom(60 - sep, y, Math.PI / 2 + 0.2, col, false);
      chrom(60 + sep, y, Math.PI / 2 - 0.2, col, false);
    });
    if (sub === '終期') {
      g.strokeStyle = muted;
      g.setLineDash([4, 4]);
      g.lineWidth = 1.5;
      g.beginPath(); g.arc(28, 60, 18, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(92, 60, 18, 0, Math.PI * 2); g.stroke();
      g.setLineDash([]);
    }
  }
}

export const dojo = {
  tasks: [
    { id: 'play', text: '再生ボタンで、細胞周期を1周以上ながめよう。', short: '1周を再生' },
    { id: 'dna3', text: 'DNA量がちょうど3（複製の途中）になる時刻に「現在時刻」を合わせよう。', short: 'DNA量3を発見' },
    { id: 'metaphase', text: '染色体が赤道面に並ぶ時期（M期の中期）を表示させよう。', short: '中期を表示' },
    { id: 'calc', text: '計算ツールで、観察した細胞数から各期の長さを求めよう。', short: '各期の長さを計算' },
  ],
  mount(root, ctx) {
    const p = { G1: 10, S: 8, G2: 4, M: 2 };
    let t = 3;
    let playing = false;
    let played = 0;
    let raf = 0;
    let last = 0;
    const flags = { calc: false };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, 'DNA量の変化 ', modelNote()));
    const chart = createChart(top, { label: '細胞1個あたりのDNA量の変化のグラフ' });
    top.append(legend([{ label: 'DNA量（細胞1個あたり）', color: 'c1' }, { label: '現在時刻', color: 'c2', dash: 'dash' }]));

    const cellCanvas = h('canvas', { role: 'img', 'aria-label': '細胞の模式図' });
    const cellCaption = h('div', { class: 'small' });
    const exp = explainBox();
    top.append(h('div', { class: 'cell-view', style: { marginTop: '8px' } }, cellCanvas, h('div', { class: 'grow' }, cellCaption)), h('p', { class: 'small muted' }, 'M期の前期・中期・後期・終期は模式的に等しい長さで表示している（実際には前期が最も長い）。'));

    const playBtn = h('button', { type: 'button', class: 'btn primary', onclick: () => toggle() }, '▶ 再生');

    const sT = slider({ label: '現在時刻', min: 0, max: 48, step: 0.1, value: t, format: (v) => fmt(v, 1) + ' 時間', onInput: (v) => { t = v; update(); } });
    const mk = (key, label, min, max, step) =>
      slider({ label, min, max, step, value: p[key], format: (v) => fmt(v, 1) + ' 時間', onInput: (v) => { p[key] = v; update(); } });
    const sl = { G1: mk('G1', 'G1期の長さ', 2, 20, 0.5), S: mk('S', 'S期の長さ', 2, 12, 0.5), G2: mk('G2', 'G2期の長さ', 1, 8, 0.5), M: mk('M', 'M期の長さ', 0.5, 4, 0.5) };

    root.append(
      panel('操作', h('div', { class: 'row' }, playBtn), sT.el, sl.G1.el, sl.S.el, sl.G2.el, sl.M.el),
      panel('いま何が起きているか', exp.el),
    );

    // 計算ツール（間期の G1・S・G2 は顕微鏡では区別できないので、DNA量の測定で見分ける）
    const COUNT_LABEL = { G1: 'G1期：DNA量2の細胞数', S: 'S期：DNA量2〜4の細胞数', G2: 'G2期：DNA量4で間期の細胞数', M: 'M期：分裂期の細胞数（顕微鏡で数える）' };
    const inputs = {};
    const totalIn = h('input', { type: 'number', inputmode: 'decimal', min: 1, step: 'any', value: 24 });
    const defaults = { G1: 40, S: 32, G2: 16, M: 12 };
    const grid = h('div', { class: 'calc-grid' }, h('label', null, '全周期（時間）', totalIn));
    for (const k of PHASES) {
      inputs[k] = h('input', { type: 'number', inputmode: 'numeric', min: 0, step: 1, value: defaults[k] });
      grid.append(h('label', null, COUNT_LABEL[k], inputs[k]));
    }
    const result = h('div', { 'aria-live': 'polite' });
    const applyBtn = h('button', { type: 'button', class: 'btn', onclick: () => applyCalc() }, '求めた長さをグラフに反映');
    root.append(
      panel('計算ツール：細胞数の割合から各期の長さを求める',
        h('p', { class: 'small muted' }, '細胞が各時期にばらばらに分布している組織では、各期の細胞数の割合は、その期にかかる時間の割合に等しいとみなせる。固定・染色して顕微鏡で観察すると間期と分裂期（前期〜終期）は区別できるが、間期のG1期・S期・G2期は見分けられないので、細胞1個あたりのDNA量を測定して数える（DNA量2＝G1期、2〜4＝S期、4＝G2期とM期）。'),
        h('p', { class: 'small' }, h('b', null, '各期の時間 ＝ 全周期の時間 × （その期の細胞数 ÷ 調べた細胞の総数）')),
        grid,
        h('div', { class: 'row', style: { marginTop: '8px' } }, h('button', { type: 'button', class: 'btn primary', onclick: () => calc(true) }, '計算する'), applyBtn),
        result,
      ),
    );

    let lastCalc = null;
    function calc(byUser) {
      const total = Number(totalIn.value);
      const counts = {};
      for (const k of PHASES) counts[k] = Math.max(0, Math.floor(Number(inputs[k].value) || 0));
      const n = PHASES.reduce((a, k) => a + counts[k], 0);
      if (!(total > 0) || n === 0) {
        result.replaceChildren(h('p', { class: 'small' }, '全周期の時間と、細胞数（合計1個以上）を入力してください。'));
        lastCalc = null;
        return;
      }
      const L = phaseLengthsFromCounts(total, counts);
      lastCalc = L;
      result.replaceChildren(
        h('table', { class: 'data' },
          h('thead', null, h('tr', null, h('th', null, '時期'), h('th', null, '細胞数'), h('th', null, '割合'), h('th', null, '長さ'))),
          h('tbody', null, ...PHASES.map((k) => h('tr', null, h('td', null, k + '期'), h('td', null, counts[k]), h('td', null, fmt(counts[k] / n, 3)), h('td', null, fmt(L[k], 2) + ' 時間')))),
        ),
        h('p', { class: 'small' }, `例：M期 ＝ ${fmt(total, 2)} × ${counts.M}/${n} ＝ ${fmt(L.M, 2)} 時間。間期（G1＋S＋G2）は ${fmt(L.G1 + L.S + L.G2, 2)} 時間で、観察される細胞の大部分が間期なのは、間期が長いからである。`),
      );
      if (byUser) {
        flags.calc = true;
        ctx.update(state());
      }
    }
    function applyCalc() {
      if (!lastCalc) calc(true);
      if (!lastCalc) return;
      for (const k of PHASES) {
        const s = sl[k];
        const v = Math.min(Number(s.input.max), Math.max(Number(s.input.min), Math.round(lastCalc[k] * 2) / 2));
        p[k] = v;
        s.set(v, true);
      }
      update();
    }

    function toggle() {
      playing = !playing;
      playBtn.textContent = playing ? '❚❚ 一時停止' : '▶ 再生';
      if (playing) {
        played = 0;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      } else cancelAnimationFrame(raf);
    }
    function tick(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const T = cycleLength(p);
      const adv = (T / 8) * dt; // 1周期を約8秒で
      t += adv;
      played += adv;
      if (t > 2 * T) t -= 2 * T;
      sT.set(Math.round(t * 10) / 10, true);
      update();
      if (playing) raf = requestAnimationFrame(tick);
    }

    function state() {
      const info = phaseAt(t, p);
      return { t, p: { ...p }, info, dna: dnaAt(t, p), playedFull: played >= cycleLength(p), calc: flags.calc };
    }

    function update() {
      const T = cycleLength(p);
      const tMax = 2 * T;
      sT.setRange(0, Math.round(tMax * 10) / 10);
      if (t > tMax) t = sT.value;
      const info = phaseAt(t, p);
      const dna = dnaAt(t, p);
      const regions = [];
      for (let c = 0; c < 2; c++) {
        let b = c * T;
        PHASES.forEach((k, i) => {
          regions.push({ x0: b, x1: b + p[k], label: k, fill: i % 2 ? 'region-2' : 'region' });
          b += p[k];
        });
      }
      chart.draw({
        alt: `横軸は時間、縦軸はDNA量。現在 ${fmt(t, 1)} 時間で ${info.phase}期、DNA量 ${fmt(dna, 2)}`,
        x: { min: 0, max: tMax, label: '時間（時間）', step: tMax > 60 ? 10 : 5 },
        y: { min: 0, max: 5, label: 'DNA量（相対値）', step: 1 },
        regions,
        series: [{ points: dnaSeries(p, 2), color: 'c1', width: 3 }],
        vlines: [{ x: t, color: 'c2', dash: 'dash', width: 2 }],
        markers: [{ x: t, y: dna, color: 'c2', label: `DNA量 ${fmt(dna, 2)}` }],
      });
      drawCell(cellCanvas, info.phase, info.frac);
      const sub = info.phase === 'M' ? mSubphase(info.frac) : null;
      cellCaption.replaceChildren(h('b', null, PHASE_NAMES[info.phase] + (sub ? '・' + sub : '')), h('br'), `DNA量 ${fmt(dna, 2)}（相対値）`);
      cellCanvas.setAttribute('aria-label', `細胞の模式図：${info.phase}期${sub ? sub : ''}`);
      const lines = [
        `現在 ${fmt(t, 1)} 時間：${PHASE_NAMES[info.phase]}${sub ? 'の' + sub : ''}。` + (info.phase === 'M' ? M_TEXT[sub] : TEXT[info.phase]),
        `この設定では1周期が ${fmt(T, 1)} 時間。そのうち間期（G1＋S＋G2）が ${fmt(p.G1 + p.S + p.G2, 1)} 時間（${Math.round(((p.G1 + p.S + p.G2) / T) * 100)}%）を占めるので、観察するとほとんどの細胞が間期に見える。`,
        'DNA量がS期で2倍（2→4）になり、分裂で2つの細胞に等しく分けられるから、分裂後の細胞のDNA量は分裂前（G1期）と同じ2に戻る。',
      ];
      exp.set(lines);
      ctx.update(state());
    }

    calc(false);
    update();
    return () => cancelAnimationFrame(raf);
  },
};

// 課題の判定
dojo.tasks[0].check = (s) => s.playedFull;
dojo.tasks[1].check = (s) => s.info.phase === 'S' && Math.abs(s.dna - 3) <= 0.06;
dojo.tasks[2].check = (s) => s.info.phase === 'M' && mSubphase(s.info.frac) === '中期';
dojo.tasks[3].check = (s) => s.calc;
