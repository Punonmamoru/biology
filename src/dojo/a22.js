// A22 DNAの複製（メセルソンとスタールの実験） の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { createChart, legend, tokenColor, keepRedrawn } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { bands, profile, MODES, molecules } from '../models/replication.js';
import { sample } from '../lib/series.js';

const GMAX = 4;
const KIND_NAME = { heavy: '重い（¹⁵N／¹⁵N）', hybrid: '中間（¹⁵N／¹⁴N）', light: '軽い（¹⁴N／¹⁴N）', mixed: '1本だけ' };

// 遠心管の模式図：0〜4世代の管を横に並べ、DNA のバンドを描く（重いものほど底に近い）
function drawTubes(canvas, st) {
  const W = Math.max(280, Math.min(520, canvas.parentElement ? canvas.parentElement.clientWidth : 340));
  const H = 190;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const fg = tokenColor('fg');
  const muted = tokenColor('muted');
  const surface = tokenColor('surface-2');
  const c1 = tokenColor('c1');
  const c2 = tokenColor('c2');
  g.clearRect(0, 0, W, H);
  g.font = '12px system-ui, sans-serif';
  const left = 58;
  const slot = (W - left - 6) / (GMAX + 1);
  const tw = Math.min(34, slot * 0.55);
  const top = 22;
  const bot = H - 22;
  const yOfPos = (p) => top + 30 + (bot - top - 60) * p; // 軽い（0）が上、重い（1）が下
  // 左の目盛り
  g.fillStyle = muted;
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  g.fillText('軽い', left - 8, yOfPos(0));
  g.fillText('中間', left - 8, yOfPos(0.5));
  g.fillText('重い', left - 8, yOfPos(1));
  for (let k = 0; k <= GMAX; k++) {
    const cx = left + slot * (k + 0.5);
    const x0 = cx - tw / 2;
    // 管
    g.fillStyle = surface;
    g.strokeStyle = k === st.g ? c2 : muted;
    g.lineWidth = k === st.g ? 2.5 : 1.2;
    g.beginPath();
    g.moveTo(x0, top);
    g.lineTo(x0, bot - tw / 2);
    g.arc(cx, bot - tw / 2, tw / 2, Math.PI, 0, true);
    g.lineTo(x0 + tw, top);
    g.fill();
    g.stroke();
    // バンド
    for (const b of bands(k, st.mode)) {
      const y = yOfPos(b.pos);
      const th = 3 + 7 * b.frac;
      g.globalAlpha = 0.35 + 0.65 * b.frac;
      g.fillStyle = c1;
      g.fillRect(x0 + 3, y - th / 2, tw - 6, th);
      g.globalAlpha = 1;
    }
    g.fillStyle = k === st.g ? fg : muted;
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText(`${k}世代`, cx, top - 4);
  }
  g.textBaseline = 'top';
  g.fillStyle = muted;
  g.textAlign = 'center';
  g.fillText(W < 340 ? '重い DNA ほど管の底に近い' : '↓ 遠心管の底（重い DNA ほど底に近い）', (left + W - 6) / 2, bot + 4);
}

export const dojo = {
  tasks: [
    { id: 'g1', text: '「半保存的複製」で1世代にすると、バンドが中間の1本だけになることを確かめよう。', short: '1世代は中間だけ' },
    { id: 'g3', text: '「半保存的複製」で3世代にして、中間：軽い ＝ 1：3 になることを確かめよう。', short: '3世代の比' },
    { id: 'reject', text: '「保存的複製」「分散的複製」に切りかえて、1世代・2世代のバンドが実際の実験結果と合わないことを確かめよう。', short: '仮説の否定' },
  ],
  mount(root, ctx) {
    const st = { mode: 'semi', g: 0, seenCons: false, seenDisp: false };

    const top = panel(null);
    root.append(top);
    const title = h('h2');
    top.append(title);
    const canvas = h('canvas', { role: 'img', 'aria-label': '遠心管の模式図' });
    top.append(h('div', { style: { display: 'flex', justifyContent: 'center' } }, canvas));
    const chart = createChart(top, { label: '密度ごとの DNA 量のグラフ', aspect: 0.5 });
    const leg = h('div');
    const note = h('p', { class: 'small muted' });
    top.append(leg, note);

    const segM = segmented({
      label: '複製のしかた',
      options: Object.entries(MODES).map(([value, label]) => ({ value, label: value === 'semi' ? `${label}（実際）` : `${label}（仮説）` })),
      value: st.mode,
      onChange: (v) => { st.mode = v; update(); },
    });
    const sG = slider({ label: '¹⁴N の培地に移してからの分裂の回数', min: 0, max: GMAX, step: 1, value: st.g, format: (v) => `${v} 世代`, onInput: (v) => { st.g = v; update(); } });
    const exp = explainBox();
    root.append(panel('操作', segM.el, sG.el), panel('いま何が起きているか', exp.el));

    const redraw = () => drawTubes(canvas, st);
    keepRedrawn(canvas, redraw);

    function update() {
      const { g, mode } = st;
      if (mode === 'cons' && g >= 1) st.seenCons = true;
      if (mode === 'disp' && g >= 2) st.seenDisp = true;
      const bs = bands(g, mode);
      title.replaceChildren(`${MODES[mode]}${mode === 'semi' ? '' : '（仮説）'}：${g} 世代のあとの DNA `, modelNote());
      redraw();
      canvas.setAttribute('aria-label', `遠心管の模式図。${g}世代：${bs.map((b) => `${KIND_NAME[b.kind]} ${fmt(b.frac * 100, 1)}%`).join('、')}`);
      const ymax = 1.15;
      chart.draw({
        alt: `${g}世代のバンド：${bs.map((b) => `${KIND_NAME[b.kind]} ${fmt(b.frac * 100, 1)}%`).join('、')}`,
        x: { min: -0.2, max: 1.2, label: 'DNA の密度（左ほど軽い・右ほど重い）', ticks: [{ v: 0, text: '軽い' }, { v: 0.5, text: '中間' }, { v: 1, text: '重い' }] },
        y: { min: 0, max: ymax, label: 'DNA の量（割合）', step: 0.25, digits: 2 },
        series: [{ points: sample((x) => profile(bs, x), -0.2, 1.2, 400), color: 'c1', width: 3 }],
        markers: bs.map((b) => ({ x: b.pos, y: b.frac, color: 'c2', label: `${fmt(b.frac * 100, 1)}%` })),
      });
      leg.replaceChildren(legend([{ label: '密度ごとの DNA の量（山の高さ＝その密度の DNA の割合）', color: 'c1' }]));
      note.textContent = '¹⁵N だけを含む培地で育てた大腸菌（DNA の2本鎖がどちらも ¹⁵N）を、¹⁴N の培地に移して分裂させた。密度勾配遠心法で、重い DNA ほど遠心管の底に近い位置に集まる。';

      const n = molecules(g);
      const lines = [];
      if (g === 0) {
        lines.push('移す前の DNA は2本鎖ともに ¹⁵N を含むので、すべて「重い」位置にバンドができる。');
      } else if (mode === 'semi') {
        lines.push(`はじめの DNA 1分子は ${g} 世代で ${n} 分子になる。半保存的複製では、もとの2本鎖がほどけてそれぞれが鋳型になり、新しい鎖（¹⁴N）と組になるので、もとの ¹⁵N の鎖を含む「中間」の分子はいつも2個である。`);
        lines.push(g === 1
          ? 'したがって1世代では、すべての DNA が「中間」になる。メセルソンとスタールの実験でも、1世代では中間の1本のバンドだけが見られた。'
          : `したがって中間：軽い ＝ 2：${n - 2}${n - 2 !== 2 ? `（＝ 1：${(n - 2) / 2}）` : '（＝ 1：1）'}になる。世代が進むほど、軽い DNA の割合が増えていく。`);
      } else if (mode === 'cons') {
        lines.push(`保存的複製（仮説）では、もとの2本鎖はそのまま残り、新しい分子は2本鎖とも新しい鎖になる。${g} 世代では、重い DNA 1分子と軽い DNA ${n - 1}分子ができる。`);
        lines.push('実際の実験では1世代で「中間」のバンドだけが見られ、重いバンドは見られなかったので、この仮説は否定される。');
      } else {
        lines.push(`分散的複製（仮説）では、どの分子も古い部分と新しい部分が混ざるので、すべての DNA が同じ密度になる。${g} 世代では ¹⁵N の割合が 1/${n} なので、バンドは1本で、「軽い」から「重い」までの間の、軽い側から 1/${n} の位置にある。`);
        lines.push(g === 1
          ? '1世代では、半保存的複製と同じく中間の1本になるので、1世代だけでは区別できない。2世代を見てみよう。'
          : '実際の実験では2世代で「中間」と「軽い」の2本のバンドが見られたので、1本のバンドが少しずつ軽い側へ移るこの仮説は否定される。');
      }
      lines.push('窒素（N）は DNA の塩基に含まれている。¹⁵N を含む DNA は、¹⁴N の DNA より少しだけ重い（密度が大きい）ので、遠心すると位置の違いとして区別できる。');
      exp.set(lines);
      ctx.update({ ...st, bands: bs });
    }
    update();
    return null;
  },
};

dojo.tasks[0].check = (s) => s.mode === 'semi' && s.g === 1;
dojo.tasks[1].check = (s) => s.mode === 'semi' && s.g === 3;
dojo.tasks[2].check = (s) => s.seenCons && s.seenDisp;
