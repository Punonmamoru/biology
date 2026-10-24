// ミスサマリー：間違えた問題の一覧。出席番号を入れて画像保存（提出用）
// 出席番号は保存も送信もしない（画面と保存画像にだけ表示する）
import { h, toast } from '../lib/dom.js';
import { createChart } from '../lib/chart.js';
import { getProgress, clearMisses, setFlag } from '../progress.js';
import { questionFrom } from '../questions/index.js';
import { LEVEL_LABEL } from '../questions/common.js';
import { STAGES, stageById } from '../stages.js';
import { checkBadges } from '../badges.js';

const MAX_IMAGE_ITEMS = 30;

function missItems(filter) {
  const out = [];
  const list = getProgress().misses.slice().reverse();
  for (const m of list) {
    if (filter && m.st !== filter) continue;
    const q = questionFrom(m.g, m.s);
    if (!q) continue;
    out.push({ q, chosen: m.c, t: m.t });
  }
  return out;
}

function dateText(d = new Date()) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// 日本語を1文字ずつ測って折り返す
function wrap(ctx, text, maxW) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const ch of para) {
      if (ctx.measureText(line + ch).width > maxW && line) {
        lines.push(line);
        line = ch;
      } else line += ch;
    }
    lines.push(line);
  }
  return lines;
}

// 提出用の画像（テーマに関係なく白地・黒字）
export function renderSummaryImage(items, number) {
  const W = 1080;
  const pad = 48;
  const font = getComputedStyle(document.body).fontFamily;
  const measure = document.createElement('canvas').getContext('2d');
  const blocks = [];
  const F = { title: `bold 44px ${font}`, head: `bold 30px ${font}`, body: `28px ${font}`, small: `24px ${font}` };
  const lineH = { title: 60, head: 42, body: 40, small: 34 };
  const push = (style, text, color = '#111', indent = 0) => {
    measure.font = F[style];
    for (const l of wrap(measure, text, W - pad * 2 - indent)) blocks.push({ style, text: l, color, indent });
  };
  push('title', 'BIOLOGY ミスサマリー');
  push('head', `出席番号：${number || '（未記入）'}　　${dateText()}　　${items.length}問`);
  blocks.push({ gap: 16, rule: true });
  items.slice(0, MAX_IMAGE_ITEMS).forEach((it, i) => {
    const st = stageById(it.q.stage);
    push('head', `${i + 1}. [${st.code} ${st.title}] ${LEVEL_LABEL[it.q.level]}`, '#1f5f3f');
    push('body', it.q.text + (it.q.chart ? '（図あり）' : ''));
    push('body', `あなたの答え：${it.q.choices[it.chosen] ?? '—'}`, '#b3261e', 20);
    push('body', `正解：${it.q.choices[it.q.answer]}`, '#1b6e35', 20);
    push('small', `解説：${it.q.explanation}`, '#333', 20);
    blocks.push({ gap: 18, rule: true });
  });
  if (items.length > MAX_IMAGE_ITEMS) push('small', `ほか ${items.length - MAX_IMAGE_ITEMS}問（新しい${MAX_IMAGE_ITEMS}問を表示）`, '#555');
  const H = pad * 2 + blocks.reduce((a, b) => a + (b.gap != null ? b.gap * 2 : lineH[b.style]), 0);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = Math.min(H, 32000);
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, c.height);
  g.textBaseline = 'top';
  let y = pad;
  for (const b of blocks) {
    if (b.gap != null) {
      y += b.gap;
      if (b.rule) {
        g.fillStyle = '#cccccc';
        g.fillRect(pad, y - 1, W - pad * 2, 2);
      }
      y += b.gap;
      continue;
    }
    g.font = F[b.style];
    g.fillStyle = b.color;
    g.fillText(b.text, pad + b.indent, y + 4);
    y += lineH[b.style];
  }
  return c;
}

export function renderMiss(app) {
  let filter = '';
  let lastUrl = null;
  const list = h('div');
  const numberIn = h('input', { type: 'text', inputmode: 'numeric', maxlength: 8, id: 'miss-number', autocomplete: 'off', placeholder: '例：12' });
  const filterSel = h('select', { id: 'miss-filter', class: 'search', onchange: () => { filter = filterSel.value; draw(); } },
    h('option', { value: '' }, 'すべてのステージ'),
    ...STAGES.map((s) => h('option', { value: s.id }, `${s.code} ${s.title}`)),
  );
  const out = h('div', { 'aria-live': 'polite' });

  app.append(
    h('div', { class: 'hero' }, h('h1', null, 'ミスサマリー'), h('p', { class: 'small muted' }, '4択ラッシュで間違えた問題（新しい順、最大60問）。出席番号を入れて画像として保存し、提出に使える。出席番号は保存・送信されない。')),
    h('section', { class: 'panel' },
      h('div', { class: 'field' }, h('label', { for: 'miss-number' }, '出席番号'), numberIn),
      h('div', { class: 'field' }, h('label', { for: 'miss-filter' }, '表示するステージ'), filterSel),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn primary grow', onclick: () => makeImage() }, '画像として保存'),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => {
          if (!getProgress().misses.length) return;
          if (window.confirm('ミスサマリーの記録をすべて消去しますか？')) { clearMisses(); draw(); }
        } }, '記録を消去'),
      ),
      out,
    ),
    list,
  );

  function makeImage() {
    const items = missItems(filter);
    if (!items.length) {
      toast('間違えた問題はありません');
      return;
    }
    const num = numberIn.value.trim();
    const canvas = renderSummaryImage(items, num);
    const d = new Date();
    const name = `BIOLOGY_miss_${num ? 'No' + num.replace(/[^0-9A-Za-z]/g, '') + '_' : ''}${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.png`;
    const show = (url) => {
      const a = h('a', { class: 'btn block', href: url, download: name }, '画像をダウンロード');
      out.replaceChildren(
        h('p', { class: 'small' }, '画像を作成した。うまくダウンロードできない端末では、下の画像を長押し（右クリック）して保存する。'),
        a,
        h('img', { class: 'preview-img', src: url, alt: 'ミスサマリーの画像' }),
      );
      try {
        a.click();
      } catch (e) {
        /* 長押し保存で代用 */
      }
    };
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = null;
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (blob) {
          lastUrl = URL.createObjectURL(blob);
          show(lastUrl);
        } else show(canvas.toDataURL('image/png'));
      }, 'image/png');
    } else show(canvas.toDataURL('image/png'));
    setFlag('savedSummary');
    checkBadges();
  }

  function draw() {
    const items = missItems(filter);
    if (!items.length) {
      list.replaceChildren(h('div', { class: 'panel muted' }, '間違えた問題はまだありません。4択ラッシュに挑戦しよう。'));
      return;
    }
    const panelEl = h('section', { class: 'panel' }, h('h2', null, `${items.length}問`));
    for (const it of items) {
      const st = stageById(it.q.stage);
      const item = h('div', { class: 'miss-item' },
        h('div', { class: 'small muted' }, `${st.code} ${st.title}　${LEVEL_LABEL[it.q.level]}`),
        h('p', { class: 'q-text' }, it.q.text),
      );
      if (it.q.chart) {
        const wrapEl = h('div', { class: 'q-chart' });
        item.append(wrapEl);
        createChart(wrapEl, { aspect: 0.55, maxHeight: 260, label: it.q.chart.alt || '問題の図' }).draw(it.q.chart);
      }
      item.append(
        h('p', { class: 'ans-line' }, 'あなたの答え：', h('b', { class: 'ng' }, it.q.choices[it.chosen] ?? '—')),
        h('p', { class: 'ans-line' }, '正解：', h('b', { class: 'ok' }, it.q.choices[it.q.answer])),
        h('p', { class: 'small' }, it.q.explanation),
        h('a', { class: 'btn', href: `#/dojo/${it.q.stage}` }, '図解道場で確かめる'),
      );
      panelEl.append(item);
    }
    list.replaceChildren(panelEl);
  }
  draw();
  return null;
}
