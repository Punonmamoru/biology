// 画面のスモークテスト（任意）：node tests/smoke.mjs
// Playwright（Chromium）があるときだけ実行する。ない環境ではスキップして終了コード0。
//  - 全画面をスマホ幅・PC幅 × ライト/ダークで開き、スクリプトエラーが出ないか
//  - ボタン・スライダーなどのタップ領域が44px以上か
//  - スライダーがキーボード（矢印キー）で操作できるか
//  - 全ステージで4択ラッシュを1ラウンド最後まで進められるか
//  - localStorage が使えない環境でも動くか
//  - 端末のエミュレーション（iPhone・iPad・Android・Chromebook の画面サイズ、縦横、タッチ操作、ライト/ダーク）
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log('Playwright が見つからないため、スモークテストをスキップしました。');
  process.exit(0);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL0 = pathToFileURL(join(ROOT, 'index.html')).href;
const STAGES = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11', 'b12', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12', 'a13', 'a14', 'a15', 'a16', 'a17', 'a18', 'a19', 'a20', 'a21'];
const ROUTES = ['#/home', ...STAGES.map((s) => '#/dojo/' + s), ...STAGES.map((s) => '#/rush/' + s), '#/rush/mix-basic', '#/rush/mix-advanced', '#/miss', '#/glossary', '#/badges', '#/transfer'];
let failures = 0;
const ok = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failures++;
};

const browser = await chromium.launch();
async function newPage(opts = {}, init) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, colorScheme: opts.scheme || 'light' });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') page.errors.push(m.text());
  });
  page.on('dialog', (d) => d.accept());
  return page;
}

console.log('# 全画面の表示（スマホ幅390px・PC幅1280px × ライト/ダーク）');
for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  for (const scheme of ['light', 'dark']) {
    const page = await newPage({ viewport, scheme });
    let small = [];
    let overflow = [];
    for (const r of ROUTES) {
      await page.goto(URL0 + r);
      await page.waitForTimeout(120);
      // タップ領域（見えている操作部品）
      const bad = await page.$$eval('button, a.btn, input[type="range"], select, .choice, [role="tab"]', (els) =>
        els.filter((e) => e.offsetParent !== null).map((e) => ({ h: e.getBoundingClientRect().height, t: (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 12) })).filter((x) => x.h < 44),
      );
      small.push(...bad.map((b) => `${r} ${b.t}(${Math.round(b.h)}px)`));
      const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (w > 1) overflow.push(`${r} (+${w}px)`);
    }
    ok(page.errors.length === 0, `${viewport.width}px ${scheme}：スクリプトエラーなし${page.errors.length ? '：' + page.errors.slice(0, 3).join(' / ') : ''}`);
    ok(small.length === 0, `${viewport.width}px ${scheme}：タップ領域44px以上${small.length ? '：' + small.slice(0, 5).join(', ') : ''}`);
    ok(overflow.length === 0, `${viewport.width}px ${scheme}：横スクロールが出ない${overflow.length ? '：' + overflow.join(', ') : ''}`);
    // ダークモードで文字と背景の色が離れているか
    const lum = await page.evaluate(() => {
      const L = (c) => {
        const m = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
        return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
      };
      const cs = getComputedStyle(document.body);
      const a = L(cs.color);
      const b = L(cs.backgroundColor);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    ok(lum >= 7, `${viewport.width}px ${scheme}：本文と背景のコントラスト比 ${lum.toFixed(1)}（7以上）`);
    await page.context().close();
  }
}

console.log('# キーボード操作');
{
  const page = await newPage();
  await page.goto(URL0 + '#/dojo/b4');
  const sl = page.locator('input[type="range"]').first();
  await sl.focus();
  const before = await sl.inputValue();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const after = await sl.inputValue();
  ok(before !== after, `スライダーが矢印キーで動く（${before} → ${after}）`);
  await page.goto(URL0 + '#/rush/b1');
  await page.keyboard.press('2');
  ok((await page.$('.feedback')) !== null, '4択は数字キー（1〜4）でも解答できる');
  await page.context().close();
}

console.log('# 4択ラッシュを最後まで（全ステージ）');
{
  const page = await newPage();
  for (const s of STAGES) {
    await page.goto(URL0 + '#/rush/' + s);
    for (let i = 0; i < 10; i++) {
      await page.locator('.choice').nth(i % 4).click();
      await page.locator('.feedback .btn.primary').click();
    }
    const score = await page.textContent('.score-big');
    ok(/\d+ \/ 10/.test(score || ''), `${s}：10問解答して結果表示（${score}）`);
  }
  await page.goto(URL0 + '#/miss');
  const n = await page.$$eval('.miss-item', (x) => x.length);
  ok(n > 0, `ミスサマリーに間違えた問題が表示される（${n}問）`);
  await page.fill('#miss-number', '15');
  await page.click('button:has-text("画像として保存")');
  await page.waitForSelector('.preview-img', { timeout: 5000 });
  ok(true, 'ミスサマリーの画像を作成できる');
  ok(page.errors.length === 0, 'スクリプトエラーなし' + (page.errors.length ? '：' + page.errors[0] : ''));
  await page.context().close();
}

console.log('# localStorage が使えない環境');
{
  const page = await newPage({}, () => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  });
  for (const r of ['#/home', '#/dojo/b2', '#/rush/a1']) await page.goto(URL0 + r);
  await page.goto(URL0 + '#/transfer');
  ok((await page.textContent('main')).includes('保存できません'), '保存できない旨を設定画面で案内');
  await page.goto(URL0 + '#/rush/b3');
  await page.locator('.choice').first().click();
  ok(page.errors.length === 0, 'localStorage が例外を出しても動作する' + (page.errors.length ? '：' + page.errors[0] : ''));
  await page.context().close();
}

console.log('# 端末のエミュレーション（画面サイズ・タッチ操作。エンジンは Chromium）');
{
  // iPhone の Safari（WebKit）そのものではない。画面の大きさ・縦横・タッチ入力・高解像度表示を再現して確かめる
  const { devices } = require('playwright');
  const pick = (name) => {
    const { defaultBrowserType, ...d } = devices[name];
    return d;
  };
  const DEVICES = [
    { name: 'iPhone SE（小さい画面）', opts: pick('iPhone SE') },
    { name: 'iPhone 13', opts: pick('iPhone 13') },
    { name: 'iPhone 13（横向き）', opts: pick('iPhone 13 landscape') },
    { name: 'iPad Mini', opts: pick('iPad Mini') },
    { name: 'Android（Pixel 7）', opts: pick('Pixel 7') },
    { name: 'Chromebook（1366×768・タッチ）', opts: { viewport: { width: 1366, height: 768 }, hasTouch: true } },
    { name: '幅320pxの小型端末', opts: { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } },
  ];
  for (const dev of DEVICES) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ ...dev.opts, colorScheme: scheme });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('dialog', (d) => d.accept());
      const overflow = [];
      const blank = [];
      for (const r of ROUTES) {
        await page.goto(URL0 + r);
        await page.waitForTimeout(60);
        const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (w > 1) overflow.push(`${r}(+${w}px)`);
        if (r.startsWith('#/dojo/')) {
          // グラフが描けているか（キャンバスの中央付近に背景以外の色の点があるか）
          const drawn = await page.evaluate(() => {
            const c = document.querySelector('.chart-wrap canvas');
            if (!c) return true; // グラフのない道場（B9 など）
            const g = c.getContext('2d');
            const d = g.getImageData(0, 0, c.width, c.height).data;
            const set = new Set();
            for (let i = 0; i < d.length; i += 4 * 97) set.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
            return set.size > 3;
          });
          if (!drawn) blank.push(r);
        }
      }
      // タッチで4択に答えられるか
      await page.goto(URL0 + '#/rush/b4');
      await page.locator('.choice').first().tap();
      const fb = await page.locator('.feedback').isVisible();
      // タッチでスライダーを動かせるか（つまみ付近をタップ）
      await page.goto(URL0 + '#/dojo/b4');
      const range = page.locator('input[type="range"]').first();
      await range.scrollIntoViewIfNeeded();
      const before = await range.inputValue();
      const box = await range.boundingBox();
      await page.touchscreen.tap(box.x + box.width * 0.9, box.y + box.height / 2);
      const after = await range.inputValue();
      ok(overflow.length === 0 && blank.length === 0 && errors.length === 0 && fb && before !== after,
        `${dev.name}・${scheme}：全${ROUTES.length}画面で横スクロールなし・グラフ描画・エラーなし、タップで解答とスライダー操作` +
          (overflow.length ? `／横スクロール ${overflow.slice(0, 3).join(' ')}` : '') + (blank.length ? `／空のグラフ ${blank.slice(0, 3).join(' ')}` : '') +
          (errors.length ? `／エラー ${errors[0]}` : '') + (!fb ? '／タップで解答できない' : '') + (before === after ? '／スライダーが動かない' : ''));
      await ctx.close();
    }
  }
}

await browser.close();
console.log(failures ? `\n結果：NG（${failures} 件）` : '\n結果：すべて合格');
process.exitCode = failures ? 1 : 0;
