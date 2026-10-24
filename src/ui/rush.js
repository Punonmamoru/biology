// 4択ラッシュ：ステージごとの問題を連続出題。正誤即時判定＋解説＋図解道場への1タップ移動
import { h } from '../lib/dom.js';
import { makeRng, randomSeed } from '../lib/rng.js';
import { createChart, legendFromSpec } from '../lib/chart.js';
import { stageById, stagesOf, COURSES } from '../stages.js';
import { GENERATORS } from '../questions/index.js';
import { generate, LEVEL_LABEL, KIND_LABEL } from '../questions/common.js';
import { recordAnswer, recordRound } from '../progress.js';
import { checkBadges } from '../badges.js';
import { loadJSON, saveJSON } from '../lib/storage.js';

const ROUND = 10;
const KEYS = ['A', 'B', 'C', 'D'];
let saved = null; // 途中のラウンド（図解道場へ移動して戻ってきたときに再開する）

function scopeOf(key) {
  if (key.startsWith('mix-')) {
    const course = COURSES.find((c) => 'mix-' + c.id === key);
    if (!course) return null;
    const ids = stagesOf(course.id).map((s) => s.id);
    return { title: `${course.name} ミックス`, code: course.short, gens: GENERATORS.filter((g) => ids.includes(g.stage)) };
  }
  const st = stageById(key);
  if (!st) return null;
  return { title: st.title, code: st.code, stage: st, gens: GENERATORS.filter((g) => g.stage === key) };
}

// 同じ種類が続かないように、ジェネレーターを一巡ずつシャッフルして使う
function buildRound(gens, level) {
  const rng = makeRng(randomSeed());
  const pool = level ? gens.filter((g) => g.level === level) : gens;
  const list = [];
  let bag = [];
  while (list.length < ROUND) {
    if (!bag.length) bag = rng.shuffle(pool);
    const g = bag.shift();
    if (list.length && list[list.length - 1].gen === g.id && pool.length > 1) continue;
    list.push(generate(g, randomSeed()));
  }
  return list.map((q) => ({ q, chosen: null }));
}

export function renderRush(app, key) {
  const scope = scopeOf(key);
  if (!scope || !scope.gens.length) {
    app.append(h('div', { class: 'panel' }, h('p', null, 'このステージの4択は準備中です。'), h('a', { class: 'btn', href: '#/home' }, 'ホームへ')));
    return null;
  }
  let level = Number(loadJSON('rushLevel', 0)) || 0;
  if (!scope.gens.some((g) => !level || g.level === level)) level = 0;
  if (!saved || saved.key !== key || saved.done) saved = { key, level, round: buildRound(scope.gens, level), i: 0, done: false };
  else level = saved.level;

  const head = h('div', { class: 'hero' },
    h('div', { class: 'stage-head' }, h('span', { class: 'stage-code' }, scope.code), h('h1', { class: 'stage-title' }, '4択ラッシュ：' + scope.title)),
  );
  const levelSel = h('div', { class: 'seg', role: 'group', 'aria-label': '難易度' });
  const levels = [0, 1, 2, 3].filter((lv) => !lv || scope.gens.some((g) => g.level === lv));
  for (const lv of levels) {
    levelSel.append(h('button', { type: 'button', 'aria-pressed': lv === level ? 'true' : 'false', onclick: () => {
      if (cleanupKey) cleanupKey();
      saveJSON('rushLevel', lv);
      saved = null;
      app.replaceChildren();
      renderRush(app, key);
    } }, lv ? LEVEL_LABEL[lv] : 'すべて'));
  }
  const body = h('div');
  app.append(head, levelSel, body);

  let cleanupKey = null;
  function show() {
    if (cleanupKey) cleanupKey();
    cleanupKey = null;
    if (saved.i >= saved.round.length) return finish();
    const item = saved.round[saved.i];
    const q = item.q;
    const box = h('section', { class: 'panel', 'aria-labelledby': 'q-text' });
    body.replaceChildren(box);
    box.append(
      h('div', { class: 'q-meta' },
        h('span', null, `第${saved.i + 1}問 / ${saved.round.length}`),
        h('span', null, h('span', { class: 'stars', 'aria-label': `難易度 ${LEVEL_LABEL[q.level]}` }, LEVEL_LABEL[q.level]), '　', KIND_LABEL[q.kind], '　', stageById(q.stage).code),
      ),
      h('p', { class: 'q-text', id: 'q-text' }, q.text),
    );
    if (q.chart) {
      const wrap = h('div', { class: 'q-chart' });
      box.append(wrap);
      const c = createChart(wrap, { aspect: 0.62, maxHeight: 340, label: q.chart.alt || '問題の図' });
      c.draw(q.chart);
      if (q.chart.bars || (q.chart.series || []).some((s) => s.label && s.label.length > 1)) wrap.append(legendFromSpec(q.chart));
      wrap.append(h('div', { class: 'small muted' }, 'モデルによる模式図'));
    }
    const choiceBox = h('div', { class: 'choices', role: 'group', 'aria-label': '選択肢' });
    const buttons = q.choices.map((c, i) =>
      h('button', { type: 'button', class: 'choice', onclick: () => answer(i) }, h('span', { class: 'key', 'aria-hidden': 'true' }, KEYS[i]), h('span', null, c)),
    );
    choiceBox.append(...buttons);
    const fb = h('div', { 'aria-live': 'polite' });
    box.append(choiceBox, fb);

    function paint() {
      buttons.forEach((b, i) => {
        b.disabled = true;
        b.setAttribute('aria-disabled', 'true');
        if (i === q.answer) {
          b.classList.add('correct');
          b.append(h('span', { class: 'verdict' }, '✓ 正解'));
        } else if (i === item.chosen) {
          b.classList.add('wrong');
          b.append(h('span', { class: 'verdict' }, '✗ あなたの答え'));
        }
      });
      const ok = item.chosen === q.answer;
      const next = h('button', { type: 'button', class: 'btn primary grow', onclick: () => { saved.i += 1; show(); window.scrollTo(0, 0); } }, saved.i + 1 < saved.round.length ? '次の問題 →' : '結果を見る');
      fb.replaceChildren(
        h('div', { class: 'feedback ' + (ok ? 'ok' : 'ng') },
          h('div', { class: 'verdict-title' }, ok ? '○ 正解！' : '× 不正解'),
          ok ? null : h('p', { class: 'small' }, '正解：', h('b', null, q.choices[q.answer])),
          h('p', null, q.explanation),
          h('div', { class: 'row' },
            h('a', { class: 'btn grow', href: `#/dojo/${q.stage}` }, '図解道場で確かめる'),
            next,
          ),
        ),
      );
      next.focus({ preventScroll: true });
    }

    function answer(i) {
      if (item.chosen != null) return;
      item.chosen = i;
      recordAnswer(q, i);
      checkBadges();
      paint();
    }
    if (item.chosen != null) paint();

    const onKey = (e) => {
      if (item.chosen != null) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) answer(n - 1);
    };
    document.addEventListener('keydown', onKey);
    cleanupKey = () => document.removeEventListener('keydown', onKey);
  }

  function finish() {
    if (!saved.done) {
      saved.done = true;
      const score = saved.round.filter((it) => it.chosen === it.q.answer).length;
      recordRound(scope.stage ? scope.stage.id : key, score, saved.round.length);
      checkBadges();
    }
    const score = saved.round.filter((it) => it.chosen === it.q.answer).length;
    const missed = saved.round.filter((it) => it.chosen !== it.q.answer);
    body.replaceChildren(
      h('section', { class: 'panel' },
        h('h2', null, '結果'),
        h('div', { class: 'score-big' }, `${score} / ${saved.round.length}`),
        h('p', { class: 'muted', style: { textAlign: 'center' } }, score === saved.round.length ? '全問正解！ 形とわけがつながっている。' : score >= 8 ? 'よくできた。まちがえた問題は図解道場で確かめよう。' : '解説と図解道場で「なぜそうなるか」を確かめてから、もう一度挑戦しよう。'),
        missed.length
          ? h('div', null, h('h3', null, 'まちがえた問題'), ...missed.map((it) => h('div', { class: 'miss-item' },
            h('p', { class: 'q-text' }, it.q.text),
            h('p', { class: 'ans-line' }, '正解：', h('b', { class: 'ok' }, it.q.choices[it.q.answer])),
            h('p', { class: 'small' }, it.q.explanation),
          )))
          : null,
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn primary grow', onclick: () => { saved = null; app.replaceChildren(); renderRush(app, key); } }, 'もう一度'),
          h('a', { class: 'btn grow', href: '#/miss' }, 'ミスサマリー'),
          h('a', { class: 'btn grow', href: '#/home' }, 'ホーム'),
        ),
      ),
    );
  }

  show();
  return () => {
    if (cleanupKey) cleanupKey();
  };
}
