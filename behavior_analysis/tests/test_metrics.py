"""指標の計算を、答えの分かっている合成データで確かめる。"""
import numpy as np
import pytest

import kodo
from kodo import metrics as M
from kodo import synthetic as S


# ---------------------------------------------------------------- 速度・距離・直進性
def test_straight_line_speed_distance_straightness():
    tr = S.straight_line(n_frames=301, fps=30, speed=12.0, heading_deg=37)
    p = tr.points()[0]
    v = M.speed(tr)[0]
    assert np.allclose(v, 12.0)
    assert M.path_length(p) == pytest.approx(12.0 * 10.0)  # 300 サンプル間隔 = 10 s
    assert M.net_displacement(p) == pytest.approx(120.0)
    assert M.straightness(p) == pytest.approx(1.0)
    assert M.mean_speed(p, tr.dt) == pytest.approx(12.0)


def test_stationary_speed_zero_and_straightness_undefined():
    tr = S.stationary(n_frames=200, fps=25, position=(5, 7))
    p = tr.points()[0]
    assert np.allclose(M.speed(tr), 0.0)
    assert M.path_length(p) == 0.0
    assert np.isnan(M.straightness(p))
    assert M.moving_fraction(M.speed(tr)[0], threshold=0.5) == 0.0


def test_straightness_of_circle_and_square_path():
    # 正方形の 3 辺（一辺 10）: L = 30, D = 10 → S = 1/3
    p = np.array([[0, 0], [10, 0], [10, 10], [0, 10]], dtype=float)
    assert M.straightness(p) == pytest.approx(1 / 3)
    # 円を 1 周: 始点 = 終点 → S ≈ 0
    tr = S.circle_path(n_frames=601, fps=30, radius=10, speed=2 * np.pi * 10 / 20)
    assert M.straightness(tr.points()[0]) == pytest.approx(0.0, abs=1e-9)


def test_gaps_are_bridged_and_straightness_never_exceeds_one():
    tr = S.straight_line(n_frames=101, fps=10, speed=5.0)
    tr.xy[0, 20:40] = np.nan
    p = tr.points()[0]
    assert M.path_length(p) == pytest.approx(50.0)  # 欠損の前後を直線で結ぶ
    assert M.straightness(p) == pytest.approx(1.0)
    v = M.speed(tr)[0]
    assert np.isnan(v[19:40]).all() and np.allclose(v[np.isfinite(v)], 5.0)


def test_frame_step_changes_dt():
    tr = S.straight_line(n_frames=301, fps=30, speed=6.0)
    sub = kodo.downsample(tr, 3)
    assert sub.dt == pytest.approx(0.1)
    assert np.allclose(M.speed(sub), 6.0)
    assert sub.duration == pytest.approx(tr.duration)


def test_fps_required():
    tr = S.straight_line()
    tr.fps = None
    with pytest.raises(ValueError, match="fps"):
        M.speed(tr)


# ---------------------------------------------------------------- 移動・静止
def test_moving_fraction_threshold():
    v = np.array([0.0, 0.5, 1.0, 2.0, np.nan, 3.0])
    assert M.moving_fraction(v, 1.0) == pytest.approx(3 / 5)


def test_stop_and_go_moving_fraction():
    a = S.straight_line(n_frames=101, fps=10, speed=5.0).points()[0]
    still = np.tile(a[-1], (100, 1))
    p = np.vstack([a, still])  # 前半 100 ステップ移動、後半 100 ステップ静止
    tr = kodo.Tracks(xy=p[None], fps=10)
    assert M.moving_fraction(M.speed(tr)[0], 1.0) == pytest.approx(100 / 200)


# ---------------------------------------------------------------- 転向角
def test_turning_angle_straight_is_zero():
    th = M.turning_angles(S.straight_line(n_frames=50).points()[0])
    assert len(th) == 48 and np.allclose(th, 0.0)


def test_turning_angle_sign_left_is_positive_on_screen():
    # 画面上で右（+x）に進み、次に画面の上（y が減る向き）へ = 左折
    p = np.array([[0, 0], [1, 0], [1, -1]], dtype=float)
    assert np.degrees(M.turning_angles(p, y_down=True))[0] == pytest.approx(90.0)
    # y 上向きの座標系なら同じ数値の点列は右折
    assert np.degrees(M.turning_angles(p, y_down=False))[0] == pytest.approx(-90.0)
    # Uターンは 180°
    q = np.array([[0, 0], [1, 0], [0, 0]], dtype=float)
    assert abs(np.degrees(M.turning_angles(q))[0]) == pytest.approx(180.0)


def test_circle_counterclockwise_constant_left_turns():
    n, R, v, fps = 361, 10.0, 5.0, 30.0
    tr = S.circle_path(n_frames=n, fps=fps, radius=R, speed=v, counterclockwise=True)
    th = M.turning_angles(tr.points()[0])
    expected = v / fps / R  # 1 ステップで中心角 v·dt/R だけ向きが変わる
    assert np.allclose(th, expected)
    tr_cw = S.circle_path(n_frames=n, fps=fps, radius=R, speed=v, counterclockwise=False)
    assert np.allclose(M.turning_angles(tr_cw.points()[0]), -expected)
    assert M.turn_summary(th)["left_turn_fraction"] == 1.0


def test_min_step_suppresses_jitter_while_stationary():
    tr = S.stationary(n_frames=500, noise_sd=0.05, seed=1)
    p = tr.points()[0]
    assert len(M.turning_angles(p)) > 400  # 揺れだけで角度がたくさん出る
    assert len(M.turning_angles(p, min_step=1.0)) == 0  # 1 mm 以上動かないので角度は出ない


def test_alternation_index():
    alt = S.alternating_turner(n_frames=6000, p_alternate=1.0, seed=0)
    same = S.alternating_turner(n_frames=6000, p_alternate=0.0, seed=0)
    rnd = S.alternating_turner(n_frames=20000, p_alternate=0.5, seed=0)
    a_alt = M.alternation_index(M.turning_angles(alt.points()[0]))
    a_same = M.alternation_index(M.turning_angles(same.points()[0]))
    a_rnd = M.alternation_index(M.turning_angles(rnd.points()[0]))
    assert a_alt == pytest.approx(1.0)
    assert a_same == pytest.approx(0.0)
    assert 0.4 < a_rnd < 0.6
    # 90° の曲がりが 4 フレームに分かれていても 1 回と数える
    th = M.turning_angles(alt.points()[0])
    ev = M.turn_events(th)
    n_expected = int(np.floor((6000 - 1 - 40) / (40 + 4))) + 1  # 直進 40 ステップ + 曲がり 4 ステップ
    assert abs(len(ev) - n_expected) <= 1


# ---------------------------------------------------------------- ヒートマップ
def test_heatmap_total_time_and_stationary_bin():
    tr = S.stationary(n_frames=301, fps=30, position=(2.5, 7.5))
    H, xe, ye = M.occupancy_heatmap(tr, bin_size=1.0, bounds=(0, 0, 10, 10))
    assert H.shape == (10, 10)
    assert H.sum() == pytest.approx(301 / 30)
    assert H[2, 7] == pytest.approx(301 / 30)
    Hd, _, _ = M.occupancy_heatmap(tr, bin_size=1.0, bounds=(0, 0, 10, 10), density=True)
    assert Hd.sum() == pytest.approx(1.0)


# ---------------------------------------------------------------- ROI
def test_roi_time_and_entries_circle():
    # x = 0 → 100 を 1 mm/サンプルで直進（dt = 0.1 s）。円 (50, 0) 半径 10 を通過する。
    p = np.c_[np.arange(101.0), np.zeros(101)]
    st = M.roi_stats(p, M.CircleROI(50, 0, 10), dt=0.1)
    assert st["entries"] == 1
    assert st["time_s"] == pytest.approx(21 * 0.1)  # x = 40..60 の 21 サンプル
    assert st["first_entry_s"] == pytest.approx(4.0)
    # 往復すれば 2 回
    q = np.vstack([p, p[::-1]])
    assert M.roi_stats(q, M.CircleROI(50, 0, 10), dt=0.1)["entries"] == 2


def test_roi_rect_initial_inside_and_debounce():
    x = np.array([0.5, 0.5, 2, 2, 0.5, 2, 2, 0.5, 0.5, 0.5])
    p = np.c_[x, np.zeros_like(x)]
    roi = M.RectROI(0, -1, 1, 1, name="r")
    assert M.roi_stats(p, roi, dt=1)["entries"] == 2  # 最初から中にいたのは数えない
    assert M.roi_stats(p, roi, dt=1, count_initial=True)["entries"] == 3
    # 1 サンプルだけの出入りは数えない（min_samples=2）
    assert M.roi_stats(p, roi, dt=1, min_samples=2)["entries"] == 1
    assert M.roi_stats(p, roi, dt=1)["time_s"] == 6


def test_roi_entry_across_gap():
    p = np.c_[np.array([0, 1, np.nan, np.nan, 10, 11.0]), np.zeros(6)]
    st = M.roi_stats(p, M.RectROI(9, -1, 20, 1), dt=1)
    assert st["entries"] == 1 and st["first_entry_s"] == 4


def test_roi_scaled():
    c = M.CircleROI(100, 50, 20).scaled(0.1)
    assert (c.cx, c.cy, c.r) == pytest.approx((10, 5, 2))


# ---------------------------------------------------------------- 最近接距離
def test_nearest_neighbor_distance():
    xy = np.zeros((3, 5, 1, 2))
    xy[1, :, 0, 0] = 3.0  # 個体 1 は x = 3
    xy[2, :, 0, 0] = 10.0  # 個体 2 は x = 10
    xy[1, 2] = np.nan
    tr = kodo.Tracks(xy=xy, fps=1)
    d = M.nearest_neighbor_distance(tr)
    assert np.allclose(d[0, [0, 1, 3, 4]], 3.0) and d[0, 2] == pytest.approx(10.0)
    assert np.isnan(d[1, 2])
    assert np.allclose(d[2, [0, 1, 3, 4]], 7.0)
    single = kodo.Tracks(xy=xy[:1], fps=1)
    assert np.isnan(M.nearest_neighbor_distance(single)).all()


# ---------------------------------------------------------------- MSD
@pytest.mark.parametrize("D", [0.5, 3.0])
def test_msd_slope_equals_4D_for_brownian_motion(D):
    tr = S.brownian_walk(n_frames=20000, fps=25, D=D, n_tracks=4, seed=42)
    slopes = []
    for i in range(tr.n_tracks):
        lags, val, _ = M.msd(tr.points()[i], max_lag=20)
        fit = M.fit_msd(lags * tr.dt, val)
        slopes.append(fit["slope"])
        assert fit["alpha"] == pytest.approx(1.0, abs=0.1)
    assert np.mean(slopes) == pytest.approx(4 * D, rel=0.05)
    assert np.mean(slopes) / 4 == pytest.approx(D, rel=0.05)


def test_msd_intercept_reflects_localization_noise():
    rng = np.random.default_rng(3)
    tr = S.brownian_walk(n_frames=40000, fps=25, D=1.0, seed=rng)
    sigma = 0.3
    noisy = tr.points()[0] + rng.normal(0, sigma, (tr.n_frames, 2))
    lags, val, _ = M.msd(noisy, max_lag=20)
    fit = M.fit_msd(lags * tr.dt, val)
    assert fit["slope"] == pytest.approx(4.0, rel=0.08)
    assert fit["intercept"] == pytest.approx(4 * sigma ** 2, rel=0.3)


def test_msd_ballistic_alpha_two():
    tr = S.straight_line(n_frames=500, fps=30, speed=3.0)
    lags, val, counts = M.msd(tr.points()[0], max_lag=50)
    assert np.allclose(val, (3.0 * lags / 30) ** 2)
    assert counts[0] == 499
    assert M.fit_msd(lags / 30, val)["alpha"] == pytest.approx(2.0)


def test_msd_ignores_missing():
    tr = S.straight_line(n_frames=100, fps=10, speed=1.0)
    p = tr.points()[0]
    p[10:20] = np.nan
    lags, val, counts = M.msd(p, max_lag=5)
    assert np.allclose(val, (lags * 0.1) ** 2)
    assert counts[0] == 99 - 11


# ---------------------------------------------------------------- ID 入れ替わり
def test_detect_and_fix_id_swap():
    a = S.straight_line(n_frames=100, fps=10, speed=10.0, start=(0, 0)).points()[0]
    b = S.straight_line(n_frames=100, fps=10, speed=10.0, start=(0, 30)).points()[0]
    xy = np.stack([a, b])
    xy[:, 50:] = xy[::-1, 50:]  # サンプル 50 から ID が入れ替わる
    tr = kodo.Tracks(xy=xy, fps=10)
    sw = M.detect_id_swaps(tr)
    assert list(sw["sample"]) == [50]
    fixed = M.swap_tracks(tr, 0, 1, from_sample=50)
    assert M.detect_id_swaps(fixed).empty
    assert np.allclose(fixed.points()[0], a)
