// B13 細胞の大きさとミクロメーター の図解道場
import { h } from '../lib/dom.js';
import { fmt } from '../lib/format.js';
import { tokenColor, keepRedrawn } from '../lib/chart.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { LENSES, eyeUnit, coincidence, calibrate, SPECIMENS, OBJ_DIV, RESOLUTION } from '../models/micrometer.js';

const N_EYE = 40; // 視野に見える接眼ミクロメーターの目盛り数

// 顕微鏡の視野の模式図
function drawField(canvas, st) {
  const W = Math.max(280, Math.min(460, canvas.parentElement ? canvas.parentElement.clientWidth : 340));
  const H = W;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const fg = tokenColor('fg');
  const bg = tokenColor('surface');
  const field = tokenColor('surface-2');
  const c1 = tokenColor('c1');
  const c3 = tokenColor('c3');
  const muted = tokenColor('muted');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const cx = W / 2;
  const cy = H / 2;
  const R = W * 0.47;
  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.fillStyle = field;
  g.fill();
  g.clip();

  const x0 = cx - R * 0.82; // 接眼ミクロメーターの0の位置
  const pxEye = (R * 1.64) / N_EYE; // 接眼1目盛りの幅（px）
  const unit = eyeUnit(st.mag); // 接眼1目盛りが表す長さ（μm）
  const pxPerUm = pxEye / unit;
  const yEye = cy - 6;

  if (st.view === 'obj') {
    // 対物ミクロメーター（試料と同じく拡大される）：10 μm ごとの線
    const yObj = cy + 6;
    const start = x0 + st.shift * pxEye;
    g.strokeStyle = c1;
    g.fillStyle = c1;
    g.lineWidth = 1.6;
    g.font = `bold 12px ${getComputedStyle(document.body).fontFamily}`;
    g.textAlign = 'center';
    for (let k = -40; k <= 120; k++) {
      const x = start + k * OBJ_DIV * pxPerUm;
      if (x < cx - R || x > cx + R) continue;
      const long = k % 10 === 0 ? 34 : k % 5 === 0 ? 24 : 16;
      g.beginPath();
      g.moveTo(x, yObj);
      g.lineTo(x, yObj + long);
      g.stroke();
      if (k % 10 === 0 && k >= 0) g.fillText(String(k), x, yObj + long + 13);
    }
    g.beginPath();
    g.moveTo(cx - R, yObj);
    g.lineTo(cx + R, yObj);
    g.stroke();
  } else {
    // 試料（模式）
    const sp = SPECIMENS.find((s) => s.id === st.view);
    const L = sp.length * pxPerUm;
    const Wd = Math.max(2, sp.width * pxPerUm);
    const sx = x0 + st.shift * pxEye;
    const sy = cy + 10 + Wd / 2;
    g.fillStyle = c3 + '55';
    g.strokeStyle = c3;
    g.lineWidth = 2;
    g.beginPath();
    if (sp.shape === 'disc') {
      g.arc(sx + L / 2, sy, L / 2, 0, Math.PI * 2);
    } else if (sp.shape === 'polygon') {
      const pts = [[0, 0.3], [0.25, 0], [0.75, 0.05], [1, 0.4], [0.8, 1], [0.2, 0.95]];
      pts.forEach(([a, b], i) => (i ? g.lineTo(sx + a * L, sy - Wd / 2 + b * Wd) : g.moveTo(sx + a * L, sy - Wd / 2 + b * Wd)));
      g.closePath();
    } else {
      g.ellipse(sx + L / 2, sy, L / 2, Wd / 2, 0, 0, Math.PI * 2);
    }
    g.fill();
    g.stroke();
  }

  // 接眼ミクロメーター（対物レンズでは拡大されない）
  g.strokeStyle = fg;
  g.fillStyle = fg;
  g.lineWidth = 1.4;
  g.font = `bold 12px ${getComputedStyle(document.body).fontFamily}`;
  g.textAlign = 'center';
  g.beginPath();
  g.moveTo(x0, yEye);
  g.lineTo(x0 + N_EYE * pxEye, yEye);
  g.stroke();
  for (let i = 0; i <= N_EYE; i++) {
    const x = x0 + i * pxEye;
    const long = i % 10 === 0 ? 30 : i % 5 === 0 ? 20 : 12;
    g.beginPath();
    g.moveTo(x, yEye);
    g.lineTo(x, yEye - long);
    g.stroke();
    if (i % 10 === 0) g.fillText(String(i), x, yEye - long - 5);
  }
  g.restore();
  g.strokeStyle = muted;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
}

export const dojo = {
  tasks: [
    { id: 'cal10', text: '対物10倍で、接眼ミクロメーターと対物ミクロメーターの目盛りが重なる2点を見つけ、接眼1目盛りの長さを計算しよう。', short: '10倍で接眼1目盛りを求める' },
    { id: 'cal40', text: '対物40倍に変えて、接眼1目盛りの長さを求め直そう（10倍のときの何分の1になるか）。', short: '40倍で求め直す' },
    { id: 'para', text: 'ゾウリムシの長さを測ろう（試料が視野に収まる倍率で、その倍率で求めた1目盛りの長さを使う）。', short: 'ゾウリムシを測る' },
    { id: 'rbc', text: 'ヒトの赤血球を、目盛りで大きさが読み取れる倍率で観察しよう。', short: '赤血球を観察' },
  ],
  mount(root, ctx) {
    const st = { mag: 10, view: 'obj', shift: 0, calUnit: null, calMag: null, measured: null };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, '顕微鏡の視野 ', modelNote()));
    const canvas = h('canvas', { role: 'img', 'aria-label': '顕微鏡の視野の模式図' });
    const wrap = h('div', { class: 'cell-view', style: { justifyContent: 'center' } }, canvas);
    top.append(wrap, h('p', { class: 'small muted' }, '上側の目盛りが接眼ミクロメーター（接眼レンズの中にあり、対物レンズでは拡大されない）。下側の青い目盛りが対物ミクロメーター（1 mm を100等分、1目盛り＝10 μm。試料と同じく対物レンズで拡大される）。対物4倍では下側の目盛りが細かいので、5目盛りごとの長い線で数えるとよい。'));

    const segMag = segmented({ label: '対物レンズの倍率', options: LENSES.map((m) => ({ value: m, label: `${m}倍` })), value: st.mag, onChange: (v) => { st.mag = v; update(); } });
    const segView = segmented({ label: '見るもの', options: [{ value: 'obj', label: '対物ミクロメーター' }, ...SPECIMENS.map((s) => ({ value: s.id, label: s.name }))], value: st.view, onChange: (v) => { st.view = v; update(); } });
    const sShift = slider({ label: 'ステージを動かす（左右）', min: -5, max: 5, step: 0.1, value: st.shift, format: (v) => `${fmt(v, 1)} 目盛り分`, onInput: (v) => { st.shift = v; update(); } });
    const exp = explainBox();
    root.append(panel('操作', segMag.el, segView.el, sShift.el), panel('いま何が起きているか', exp.el));

    // 計算ツール
    const inE = h('input', { type: 'number', inputmode: 'numeric', min: 1, step: 1, value: '' });
    const inO = h('input', { type: 'number', inputmode: 'numeric', min: 1, step: 1, value: '' });
    const calOut = h('div', { 'aria-live': 'polite' });
    const inM = h('input', { type: 'number', inputmode: 'decimal', min: 0, step: 'any', value: '' });
    const measOut = h('div', { 'aria-live': 'polite' });
    root.append(panel('計算ツール：接眼ミクロメーター1目盛りの長さ・試料の長さ',
      h('p', { class: 'small' }, h('b', null, '接眼1目盛りの長さ ＝ 10 μm × 対物ミクロメーターの目盛り数 ÷ 接眼ミクロメーターの目盛り数'), '（両方の目盛りが重なる2点の間で数える）'),
      h('div', { class: 'calc-grid' }, h('label', null, '接眼ミクロメーターの目盛り数', inE), h('label', null, '対物ミクロメーターの目盛り数', inO)),
      h('div', { class: 'row', style: { marginTop: '8px' } }, h('button', { type: 'button', class: 'btn primary', onclick: () => cal() }, '1目盛りの長さを計算')),
      calOut,
      h('p', { class: 'small', style: { marginTop: '12px' } }, h('b', null, '試料の長さ ＝ 接眼ミクロメーターの目盛り数 × 接眼1目盛りの長さ')),
      h('div', { class: 'calc-grid' }, h('label', null, '試料が占める接眼の目盛り数', inM)),
      h('div', { class: 'row', style: { marginTop: '8px' } }, h('button', { type: 'button', class: 'btn primary', onclick: () => meas() }, '長さを計算')),
      measOut,
    ));

    function cal() {
      const e = Number(inE.value);
      const o = Number(inO.value);
      if (!(e > 0 && o > 0)) {
        calOut.replaceChildren(h('p', { class: 'small' }, '目盛り数を入力してください。'));
        return;
      }
      const u = calibrate(e, o);
      st.calUnit = u;
      st.calMag = st.mag;
      const ok = Math.abs(u - eyeUnit(st.mag)) / eyeUnit(st.mag) < 0.03;
      calOut.replaceChildren(h('p', null, `10 × ${o} ÷ ${e} ＝ `, h('b', null, `${fmt(u, 2)} μm`), `（対物${st.mag}倍）`),
        h('p', { class: 'small' }, ok ? '視野の目盛りと合っている。この倍率では、この値を使って長さを測る。' : '視野の目盛りとずれている。両方の目盛りがぴったり重なる2点を探して、その間の目盛り数を数え直そう。'));
      update();
    }
    function meas() {
      const d = Number(inM.value);
      if (!(d > 0) || st.calUnit == null) {
        measOut.replaceChildren(h('p', { class: 'small' }, st.calUnit == null ? '先に、接眼1目盛りの長さを求めよう。' : '目盛り数を入力してください。'));
        return;
      }
      const L = d * st.calUnit;
      st.measured = { L, mag: st.mag, view: st.view, calMag: st.calMag };
      const warn = st.calMag !== st.mag ? `注意：1目盛りの長さは対物${st.calMag}倍で求めた値。いまは${st.mag}倍なので、求め直す必要がある。` : '';
      measOut.replaceChildren(h('p', null, `${fmt(d, 1)} × ${fmt(st.calUnit, 2)} ＝ `, h('b', null, `${fmt(L, 1)} μm`)), warn ? h('p', { class: 'small' }, warn) : null);
      update();
    }

    const redraw = () => drawField(canvas, st);
    keepRedrawn(canvas, redraw);
    if (typeof ResizeObserver !== 'undefined') {
      let lastW = 0;
      new ResizeObserver(() => { if (wrap.clientWidth && wrap.clientWidth !== lastW) { lastW = wrap.clientWidth; redraw(); } }).observe(wrap);
    }

    function update() {
      redraw();
      const u = eyeUnit(st.mag);
      const co = coincidence(st.mag);
      canvas.setAttribute('aria-label', `対物${st.mag}倍の視野。${st.view === 'obj' ? '対物ミクロメーター' : SPECIMENS.find((s) => s.id === st.view).name}`);
      const lines = [];
      if (st.view === 'obj') {
        lines.push(`対物${st.mag}倍では、接眼ミクロメーター ${co.eye} 目盛りと対物ミクロメーター ${co.obj} 目盛りが重なる（ステージを動かして0の線をそろえると見やすい）。`);
        lines.push('対物ミクロメーターは試料と同じく対物レンズで拡大されるが、接眼ミクロメーターは接眼レンズの中にあるので対物レンズでは拡大されず、倍率を変えても見かけの目盛りの間隔は変わらない。そのため、接眼1目盛りが表す長さは、対物レンズの倍率を変えるたびに求め直す必要がある。');
        lines.push('長さを測るときは、対物ミクロメーターを外して試料のプレパラートをのせ、接眼ミクロメーターの目盛りで読む。');
      } else {
        const sp = SPECIMENS.find((s) => s.id === st.view);
        const divs = sp.length / u;
        if (divs > N_EYE) lines.push(`${sp.name}は、この倍率では視野の目盛り（${N_EYE}目盛り）に収まらない。倍率を下げて測ろう。`);
        else if (divs < 2) lines.push(`${sp.name}は、この倍率では接眼の目盛り${divs < 1 ? '1つ分にも満たず' : '2つ分ほどしかなく'}、長さを正確に読み取れない。${st.mag < 40 ? '倍率を上げて測ろう。' : 'このアプリの最大の倍率（対物40倍）でも測れない。実際には油浸の対物100倍レンズなどを使う。'}`);
        else lines.push(`${sp.name}が占める接眼の目盛りを数え、1目盛りの長さをかければ長さがわかる（目盛りの0に端をそろえると読みやすい）。`);
        if (sp.id === 'ecoli') lines.push(`大腸菌は長さ約${sp.length} μm と小さく、光学顕微鏡の高倍率でようやく形がわかる。光学顕微鏡で見分けられる最小の間隔（分解能）は約${RESOLUTION.light} μm、肉眼では約0.1 mm である。`);
        if (sp.id === 'rbc') lines.push('ヒトの赤血球は直径 約7〜8 μm。核をもたない、中央がくぼんだ円盤状の細胞である。');
        if (sp.id === 'paramecium') lines.push('ゾウリムシは1個の細胞からなる単細胞生物で、長さは約0.2 mm（200 μm）ある。');
      }
      lines.push('1 mm ＝ 1000 μm、1 μm ＝ 1000 nm。');
      exp.set(lines);
      const m = st.measured;
      ctx.update({ ...st, unitTrue: u, measOk: m && m.view === st.view && m.calMag === m.mag ? Math.abs(m.L - SPECIMENS.find((s) => s.id === m.view)?.length) : null });
    }
    update();
    return null;
  },
};

const sp = (id) => SPECIMENS.find((s) => s.id === id);
dojo.tasks[0].check = (s) => s.calMag === 10 && s.calUnit != null && Math.abs(s.calUnit - eyeUnit(10)) < 0.3;
dojo.tasks[1].check = (s) => s.calMag === 40 && s.calUnit != null && Math.abs(s.calUnit - eyeUnit(40)) < 0.1;
dojo.tasks[2].check = (s) => s.measured && s.measured.view === 'paramecium' && s.measured.calMag === s.measured.mag && Math.abs(s.measured.L - sp('paramecium').length) / sp('paramecium').length < 0.1;
dojo.tasks[3].check = (s) => s.view === 'rbc' && s.mag === 40;
