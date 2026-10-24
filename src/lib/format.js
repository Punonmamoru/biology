// 数値の表示用フォーマット
export function fmt(x, digits = 1) {
  if (!Number.isFinite(x)) return String(x);
  const v = Number(x.toFixed(digits));
  return String(Object.is(v, -0) ? 0 : v);
}

// 有効数字ではなく「整数ならそのまま、そうでなければ指定桁」
export function num(x, digits = 2) {
  if (Number.isInteger(x)) return String(x);
  return fmt(x, digits);
}

export function pct(x, digits = 0) {
  return fmt(x * 100, digits) + '%';
}

export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function ratioText(values) {
  let g = values.reduce((acc, v) => gcd(acc, v), 0) || 1;
  return values.map((v) => v / g).join(' : ');
}

export function fracText(n, d) {
  const g = gcd(n, d) || 1;
  return `${n / g}/${d / g}`;
}

export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}
