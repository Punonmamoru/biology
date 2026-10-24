// 図解道場の共通部品（スライダー・切替ボタン・解説欄）
import { h } from '../lib/dom.js';

let uid = 0;

// キーボード操作できるネイティブのスライダー
export function slider({ label, min, max, step = 1, value, format = (v) => String(v), onInput }) {
  const id = 'sl-' + ++uid;
  const out = h('output', { for: id, 'aria-live': 'off' }, format(value));
  const input = h('input', { type: 'range', id, min, max, step, value });
  const el = h('div', { class: 'control' }, h('label', { for: id }, label), out, input);
  const ctl = {
    el,
    input,
    get value() {
      return Number(input.value);
    },
    set(v, silent) {
      input.value = String(v);
      out.textContent = format(Number(input.value));
      input.setAttribute('aria-valuetext', out.textContent);
      if (!silent && onInput) onInput(Number(input.value));
    },
    setRange(lo, hi) {
      input.min = String(lo);
      input.max = String(hi);
      ctl.set(Math.min(hi, Math.max(lo, ctl.value)), true);
    },
  };
  input.setAttribute('aria-valuetext', out.textContent);
  input.addEventListener('input', () => {
    out.textContent = format(Number(input.value));
    input.setAttribute('aria-valuetext', out.textContent);
    if (onInput) onInput(Number(input.value));
  });
  return ctl;
}

// 切替ボタン（aria-pressed で状態を示す）
export function segmented({ label, options, value, onChange }) {
  const group = h('div', { class: 'seg', role: 'group', 'aria-label': label });
  const btns = options.map((o) =>
    h('button', { type: 'button', 'aria-pressed': o.value === value ? 'true' : 'false', onclick: () => ctl.set(o.value) }, o.label),
  );
  group.append(...btns);
  const ctl = {
    el: h('div', null, label ? h('div', { class: 'small muted', 'aria-hidden': 'true' }, label) : null, group),
    value,
    set(v, silent) {
      ctl.value = v;
      btns.forEach((b, i) => b.setAttribute('aria-pressed', options[i].value === v ? 'true' : 'false'));
      if (!silent && onChange) onChange(v);
    },
  };
  return ctl;
}

// 「いま何が起きているか」欄。文章はスライダーの値に応じて書き換える
export function explainBox() {
  const el = h('div', { class: 'explain', 'aria-live': 'polite' });
  return {
    el,
    set(paragraphs) {
      el.replaceChildren(...paragraphs.filter(Boolean).map((t) => h('p', null, t)));
    },
  };
}

export function panel(title, ...children) {
  return h('section', { class: 'panel' }, title ? h('h2', null, title) : null, ...children);
}

export function modelNote(text = 'モデルによる模式図') {
  return h('span', { class: 'badge-model' }, text);
}
