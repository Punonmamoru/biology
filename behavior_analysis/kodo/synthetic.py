"""合成データ（答えの分かっている人工の軌跡）を作る。

実データがなくてもパイプライン全体を試せるように、また指標の計算が
正しいかを確かめる（テストする）ために使う。

* :func:`straight_line`  等速直線運動（直進性 = 1、転向角 = 0、MSD ∝ τ²）
* :func:`stationary`     静止（速さ = 0）
* :func:`brownian_walk`  拡散係数 D のブラウン運動（MSD = 4Dτ）
* :func:`correlated_random_walk` 向きが少しずつ変わるランダムウォーク（止まったり歩いたり）
* :func:`wall_follower`  壁ぞいに歩く個体（走触性・壁面走性）
* :func:`alternating_turner` 曲がる向きを左右交互に変える個体（交替性転向）
* :func:`make_demo_tracks` 上の 3 種類を同じ容器に入れた「撮影データ風」の練習用データ
* :func:`export_demo_files` 練習用データを SLEAP / TrackMate / 手動 の各形式と
  定規入りの画像として保存する

どれも単位は mm（make_demo_tracks は px）。座標は画像と同じく y 軸が下向き。
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional, Sequence

import numpy as np

from .data import Tracks

__all__ = [
    "straight_line",
    "stationary",
    "circle_path",
    "brownian_walk",
    "correlated_random_walk",
    "wall_follower",
    "alternating_turner",
    "fold_into_bounds",
    "make_demo_tracks",
    "make_arena_image",
    "export_demo_files",
    "DEMO",
]


def _tracks(points: np.ndarray, fps: float, names: Optional[Sequence[str]] = None, units="mm") -> Tracks:
    points = np.asarray(points, dtype=float)
    if points.ndim == 2:
        points = points[None]
    return Tracks(xy=points[:, :, None, :], node_names=["point"],
                  track_names=list(names) if names else None, fps=fps, units=units, source="synthetic")


def _rng(seed):
    return seed if isinstance(seed, np.random.Generator) else np.random.default_rng(seed)


def fold_into_bounds(points: np.ndarray, bounds: Sequence[float]) -> np.ndarray:
    """容器の壁で鏡のように跳ね返す（座標を区間 [a, b] に折りたたむ）。

    x' = a + L - | (x - a) mod 2L - L |   （L = b - a）
    跳ね返る瞬間以外は 1 ステップの移動距離が変わらない。
    """
    x0, y0, x1, y1 = bounds
    out = np.array(points, dtype=float)
    for c, (a, b) in enumerate(((x0, x1), (y0, y1))):
        L = b - a
        out[..., c] = a + L - np.abs(np.mod(out[..., c] - a, 2 * L) - L)
    return out


# ---------------------------------------------------------------------------
# 基本の運動
# ---------------------------------------------------------------------------
def straight_line(n_frames: int = 300, fps: float = 30.0, speed: float = 10.0,
                  heading_deg: float = 0.0, start=(0.0, 0.0)) -> Tracks:
    """速さ speed [mm/s]、向き heading_deg（画面上で右が 0°、反時計回りが正）の等速直線運動。"""
    t = np.arange(n_frames) / fps
    th = np.radians(heading_deg)
    # y 軸が下向きなので、画面上で反時計回りに角度をとると y 成分は −sin
    p = np.c_[start[0] + speed * t * np.cos(th), start[1] - speed * t * np.sin(th)]
    return _tracks(p, fps)


def stationary(n_frames: int = 300, fps: float = 30.0, position=(0.0, 0.0),
               noise_sd: float = 0.0, seed=None) -> Tracks:
    """同じ位置に止まっている個体。noise_sd > 0 なら検出の揺れ（各軸の標準偏差 mm）を足す。"""
    rng = _rng(seed)
    p = np.tile(np.asarray(position, dtype=float), (n_frames, 1))
    if noise_sd > 0:
        p = p + rng.normal(0, noise_sd, p.shape)
    return _tracks(p, fps)


def circle_path(n_frames: int = 300, fps: float = 30.0, radius: float = 20.0, speed: float = 10.0,
                center=(0.0, 0.0), counterclockwise: bool = True) -> Tracks:
    """半径 radius の円周上を一定の速さで回る（画面上で反時計回り = 毎回左に曲がる）。"""
    t = np.arange(n_frames) / fps
    phi = speed * t / radius * (1 if counterclockwise else -1)
    p = np.c_[center[0] + radius * np.cos(phi), center[1] - radius * np.sin(phi)]
    return _tracks(p, fps)


def brownian_walk(n_frames: int = 3000, fps: float = 30.0, D: float = 1.0, n_tracks: int = 1,
                  start=(0.0, 0.0), seed=None) -> Tracks:
    """2 次元のブラウン運動（拡散係数 D [mm²/s]）。

    各軸の 1 ステップの変位が平均 0、分散 2DΔt の正規分布に従うので、
    MSD(τ) = 2 軸 × 2Dτ = 4Dτ になる。
    """
    rng = _rng(seed)
    dt = 1.0 / fps
    steps = rng.normal(0.0, np.sqrt(2 * D * dt), size=(n_tracks, n_frames - 1, 2))
    p = np.concatenate([np.zeros((n_tracks, 1, 2)), np.cumsum(steps, axis=1)], axis=1) + np.asarray(start)
    return _tracks(p, fps)


def _stop_go(n: int, p_stop: float, p_go: float, rng) -> np.ndarray:
    """歩く(True)・止まる(False) を切り替える 2 状態マルコフ連鎖。"""
    moving = np.ones(n, dtype=bool)
    state = True
    for k in range(n):
        if state and rng.random() < p_stop:
            state = False
        elif not state and rng.random() < p_go:
            state = True
        moving[k] = state
    return moving


def correlated_random_walk(n_frames: int = 1800, fps: float = 30.0, speed: float = 8.0,
                           kappa: float = 8.0, p_stop: float = 0.0, p_go: float = 0.05,
                           start=(0.0, 0.0), heading_deg: float = 0.0,
                           bounds: Optional[Sequence[float]] = None, seed=None) -> Tracks:
    """相関ランダムウォーク：毎フレーム、向きをフォン・ミーゼス分布（集中度 kappa）だけ変えて進む。

    kappa が大きいほどまっすぐ、0 なら毎回でたらめな向き。
    p_stop（歩行中に止まる確率/フレーム）と p_go（停止中に歩き出す確率/フレーム）で
    止まったり歩いたりさせる。bounds=(x0, y0, x1, y1) を与えると壁で跳ね返る。
    """
    rng = _rng(seed)
    dt = 1.0 / fps
    n = n_frames - 1
    dtheta = rng.vonmises(0.0, kappa, size=n) if kappa > 0 else rng.uniform(-np.pi, np.pi, n)
    moving = _stop_go(n, p_stop, p_go, rng) if p_stop > 0 else np.ones(n, dtype=bool)
    theta = np.radians(heading_deg) + np.cumsum(np.where(moving, dtheta, 0.0))
    step = speed * dt * moving
    d = np.c_[step * np.cos(theta), -step * np.sin(theta)]
    p = np.vstack([np.zeros(2), np.cumsum(d, axis=0)]) + np.asarray(start, dtype=float)
    if bounds is not None:
        p = fold_into_bounds(p, bounds)
    return _tracks(p, fps)


def wall_follower(n_frames: int = 1800, fps: float = 30.0, bounds=(0.0, 0.0, 120.0, 80.0),
                  wall_distance: float = 4.0, speed: float = 10.0, wobble_sd: float = 0.6,
                  p_stop: float = 0.0, p_go: float = 0.05, clockwise: bool = False,
                  start_fraction: float = 0.0, seed=None) -> Tracks:
    """長方形の容器の壁から wall_distance [mm] 離れたところを、壁にそって歩き続ける個体。

    壁からの距離は wobble_sd [mm] 程度ゆっくり揺らぐ。
    clockwise=False なら画面上で反時計回り（左回り）に一周する。
    """
    rng = _rng(seed)
    dt = 1.0 / fps
    x0, y0, x1, y1 = bounds
    a0, b0, a1, b1 = x0 + wall_distance, y0 + wall_distance, x1 - wall_distance, y1 - wall_distance
    W, H = a1 - a0, b1 - b0
    P = 2 * (W + H)
    n = n_frames - 1
    moving = _stop_go(n, p_stop, p_go, rng) if p_stop > 0 else np.ones(n, dtype=bool)
    s = start_fraction * P + np.concatenate([[0.0], np.cumsum(speed * dt * moving)])
    s = np.mod(s if not clockwise else -s, P)
    # 反時計回り（画面上）: 左上 → 左下 → 右下 → 右上 → 左上（y は下向き）
    p = np.empty((n_frames, 2))
    m1 = s < H
    m2 = (s >= H) & (s < H + W)
    m3 = (s >= H + W) & (s < 2 * H + W)
    m4 = s >= 2 * H + W
    p[m1] = np.c_[np.full(m1.sum(), a0), b0 + s[m1]]
    p[m2] = np.c_[a0 + (s[m2] - H), np.full(m2.sum(), b1)]
    p[m3] = np.c_[np.full(m3.sum(), a1), b1 - (s[m3] - H - W)]
    p[m4] = np.c_[a1 - (s[m4] - 2 * H - W), np.full(m4.sum(), b0)]
    if wobble_sd > 0:
        # ゆっくり変化する揺らぎ（AR(1) 過程）
        phi = 0.98
        e = rng.normal(0, wobble_sd * np.sqrt(1 - phi ** 2), size=(n_frames, 2))
        w = np.zeros((n_frames, 2))
        for k in range(1, n_frames):
            w[k] = phi * w[k - 1] + e[k]
        p = p + w
        p[:, 0] = np.clip(p[:, 0], x0 + 0.5, x1 - 0.5)
        p[:, 1] = np.clip(p[:, 1], y0 + 0.5, y1 - 0.5)
    return _tracks(p, fps)


def alternating_turner(n_frames: int = 1800, fps: float = 30.0, speed: float = 6.0,
                       segment_length: float = 8.0, turn_deg: float = 90.0, p_alternate: float = 0.9,
                       turn_samples: int = 4, start=(0.0, 0.0), heading_deg: float = 0.0,
                       bounds: Optional[Sequence[float]] = None, seed=None) -> Tracks:
    """segment_length [mm] まっすぐ進むごとに ±turn_deg 曲がる個体。

    次に曲がる向きは、確率 p_alternate で前回と逆、1 − p_alternate で前回と同じ。
    p_alternate = 0.9 は交替性転向が強い個体、0.5 は左右をでたらめに選ぶ個体、
    0 はいつも同じ向きに曲がる個体になる。1 回の曲がりは turn_samples フレームに分けて行う。
    bounds を与えると壁で跳ね返る（鏡映になるので、跳ね返りの前後では左右が入れ替わる）。
    """
    rng = _rng(seed)
    dt = 1.0 / fps
    step = speed * dt
    n_straight = max(int(round(segment_length / step)), 1)
    n = n_frames - 1
    dtheta = np.zeros(n)
    k = n_straight
    direction = rng.choice([-1, 1])
    while k < n:
        dtheta[k:k + turn_samples] = direction * np.radians(turn_deg) / turn_samples
        k += turn_samples + n_straight
        if rng.random() < p_alternate:
            direction = -direction
    theta = np.radians(heading_deg) + np.cumsum(dtheta)
    d = np.c_[step * np.cos(theta), -step * np.sin(theta)]
    p = np.vstack([np.zeros(2), np.cumsum(d, axis=0)]) + np.asarray(start, dtype=float)
    if bounds is not None:
        p = fold_into_bounds(p, bounds)
    return _tracks(p, fps)


# ---------------------------------------------------------------------------
# 練習用データ
# ---------------------------------------------------------------------------
#: 練習用データの「正解」（スケール・fps・容器・定規の目盛りの位置）
DEMO = {
    "fps": 30.0,
    "mm_per_px": 0.2,  # 5 px = 1 mm
    "arena_mm": (0.0, 0.0, 120.0, 80.0),  # 容器（プラケース）の内側
    "arena_offset_px": (40.0, 40.0),  # 画像上での容器の左上の位置
    "ruler_mm": 100.0,
    # 定規の 0 mm と 100 mm の目盛りの画素座標（make_arena_image が描く位置）
    "ruler_p0_px": (40.0, 500.0),
    "ruler_p1_px": (540.0, 500.0),
    "track_names": ["A_ランダム", "B_壁ぞい", "C_交替転向"],
    "body_length_mm": 6.0,
}


def _body_nodes(p: np.ndarray, body_length: float) -> np.ndarray:
    """中心の軌跡から head / thorax / abdomen の 3 点を作る（向き = 進行方向）。"""
    n = len(p)
    d = np.gradient(p, axis=0)
    k = np.ones(9) / 9  # 体の向きは急には変わらないので、進行方向を 9 フレームでならす
    d = np.c_[np.convolve(d[:, 0], k, mode="same"), np.convolve(d[:, 1], k, mode="same")]
    norm = np.hypot(d[:, 0], d[:, 1])
    # 止まっている間の小さな揺れで体の向きが反転しないよう、ある程度動いたときだけ向きを更新する
    min_move = 0.3 * np.median(norm[norm > 0]) if np.any(norm > 0) else 0.0
    heading = np.zeros((n, 2))
    last = np.array([1.0, 0.0])
    for k in range(n):
        if norm[k] > max(min_move, 1e-9):
            last = d[k] / norm[k]
        heading[k] = last
    half = body_length / 2
    return np.stack([p + half * heading, p, p - half * heading], axis=1)  # (n, 3, 2)


def make_demo_tracks(seed: int = 0, duration_s: float = 60.0, noise_px: float = 1.0,
                     gap_rate: float = 0.004, n_spikes: int = 4, nodes: bool = True) -> Tracks:
    """3 個体（ランダム歩行・壁ぞい・交替性転向）を 1 つの容器で撮影した風の練習用データ（px 単位）。

    実データと同じく、検出の揺れ（noise_px）・短い見失い（欠損）・誤検出（外れ値）を含む。
    スケールと fps の正解は :data:`DEMO` にある（0.2 mm/px, 30 fps）。
    nodes=True なら SLEAP 風に head / thorax / abdomen の 3 部位を持つ。
    """
    rng = np.random.default_rng(seed)
    fps = DEMO["fps"]
    n = int(round(duration_s * fps)) + 1
    arena = DEMO["arena_mm"]
    a = correlated_random_walk(n, fps, speed=9.0, kappa=6.0, p_stop=0.01, p_go=0.03,
                               start=(60.0, 40.0), heading_deg=30.0, bounds=arena, seed=rng).points()[0]
    b = wall_follower(n, fps, bounds=arena, wall_distance=4.0, speed=12.0, p_stop=0.004, p_go=0.05,
                      start_fraction=0.3, seed=rng).points()[0]
    c = alternating_turner(n, fps, speed=6.0, segment_length=7.0, turn_deg=90.0, p_alternate=0.9,
                           start=(35.0, 55.0), heading_deg=45.0, bounds=arena, seed=rng).points()[0]
    centers = np.stack([a, b, c])  # (3, n, 2) mm
    bl = DEMO["body_length_mm"]
    if nodes:
        xy = np.stack([_body_nodes(pp, bl) for pp in centers])  # (3, n, 3, 2)
        node_names = ["head", "thorax", "abdomen"]
    else:
        xy = centers[:, :, None, :]
        node_names = ["point"]
    off = np.asarray(DEMO["arena_offset_px"])
    xy = xy / DEMO["mm_per_px"] + off
    xy = xy + rng.normal(0, noise_px, xy.shape)
    # 欠損（短い見失い）
    for i in range(xy.shape[0]):
        n_gaps = rng.poisson(gap_rate * n)
        for _ in range(n_gaps):
            s = rng.integers(0, n - 10)
            xy[i, s:s + rng.integers(1, 9)] = np.nan
    # 外れ値（1〜2 フレームだけ別の場所に飛ぶ誤検出）
    for _ in range(n_spikes):
        i = rng.integers(0, xy.shape[0])
        s = rng.integers(5, n - 5)
        xy[i, s:s + rng.integers(1, 3)] += rng.uniform(40, 80, 2) * rng.choice([-1, 1], 2)
    return Tracks(xy=xy, node_names=node_names, track_names=DEMO["track_names"], fps=None,
                  units="px", source="demo")


def make_arena_image(path, size=(680, 560)) -> Path:
    """練習用の「撮影画像」：容器の枠と、その下に置いた 100 mm の定規を描いた PNG。

    定規の 0 mm と 100 mm の目盛りの位置は DEMO["ruler_p0_px"], DEMO["ruler_p1_px"]。
    """
    from PIL import Image, ImageDraw, ImageFont

    W, H = size
    img = Image.new("RGB", (W, H), "white")
    dr = ImageDraw.Draw(img)
    s = 1.0 / DEMO["mm_per_px"]
    ox, oy = DEMO["arena_offset_px"]
    x0, y0, x1, y1 = DEMO["arena_mm"]
    dr.rectangle([ox + x0 * s, oy + y0 * s, ox + x1 * s, oy + y1 * s], outline=(60, 60, 60), width=3)
    try:
        font = ImageFont.load_default(size=14)
    except TypeError:  # 古い Pillow
        font = ImageFont.load_default()
    rx, ry = DEMO["ruler_p0_px"]
    L = DEMO["ruler_mm"]
    dr.rectangle([rx - 15, ry - 25, rx + L * s + 15, ry + 30], fill=(250, 240, 200), outline=(120, 100, 40))
    for mm in range(int(L) + 1):
        x = rx + mm * s
        h = 18 if mm % 10 == 0 else (12 if mm % 5 == 0 else 7)
        dr.line([(x, ry), (x, ry - h)], fill="black", width=1)
        if mm % 10 == 0:
            dr.text((x, ry + 4), str(mm), fill="black", font=font, anchor="mt")
    dr.text((rx + L * s + 18, ry + 4), "mm", fill="black", font=font, anchor="lt")
    img.save(path)
    return Path(path)


def export_demo_files(outdir, seed: int = 0) -> dict:
    """練習用データを 3 形式＋画像で保存し、そのパスを返す。

    * demo.analysis.h5   : SLEAP の解析ファイルと同じ構造（3 個体 × 3 部位）
    * demo_trackmate.csv : TrackMate のスポット表（thorax の点だけ）
    * demo_manual.csv    : 手動追跡（個体 C を 3 フレームおきにクリックした想定）
    * demo_arena.png     : 容器と定規の画像（スケール設定の練習用）
    """
    from .io import write_manual_csv, write_sleap_h5, write_trackmate_csv

    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    tr = make_demo_tracks(seed=seed, nodes=True)
    tr.fps = DEMO["fps"]  # TrackMate の POSITION_T を書くため（読み込み側では使わない）
    paths = {
        "sleap": write_sleap_h5(tr, outdir / "demo.analysis.h5"),
        "trackmate": write_trackmate_csv(tr, outdir / "demo_trackmate.csv", node="thorax"),
        "manual": write_manual_csv(tr.select(tracks=[2], nodes=["thorax"], frames=slice(None, None, 3)),
                                   outdir / "demo_manual.csv"),
        "image": make_arena_image(outdir / "demo_arena.png"),
    }
    return paths
