"""前処理（外れ値・補間・平滑化・スケール・間引き）のテスト。"""
import numpy as np
import pytest

import kodo
from kodo import synthetic as S


def _line(n=101, fps=10, speed=5.0):
    return S.straight_line(n_frames=n, fps=fps, speed=speed, heading_deg=30)


def test_interpolate_fills_only_short_interior_gaps():
    tr = _line()
    truth = tr.points()[0].copy()
    tr.xy[0, 0:2] = np.nan  # 最初の欠損（外挿しない）
    tr.xy[0, 10:13] = np.nan  # 3 サンプル
    tr.xy[0, 30:40] = np.nan  # 10 サンプル（上限を超える）
    out = kodo.interpolate_gaps(tr, max_gap=5)
    p = out.points()[0]
    assert np.isnan(p[0:2]).all()
    assert np.allclose(p[10:13], truth[10:13])  # 直線運動は線形補間で正確に戻る
    assert np.isnan(p[30:40]).all()
    assert np.isnan(tr.points()[0][10:13]).all()  # 元のデータは変わらない
    out2 = kodo.interpolate_gaps(tr, max_gap=5, method="pchip")
    assert np.allclose(out2.points()[0][10:13], truth[10:13])


def test_partial_nan_is_treated_as_missing():
    xy = np.zeros((1, 3, 1, 2))
    xy[0, 1, 0, 0] = np.nan
    tr = kodo.Tracks(xy=xy)
    assert np.isnan(tr.xy[0, 1, 0]).all()


def test_remove_outliers_hampel():
    tr = _line()
    truth = tr.points()[0].copy()
    tr.xy[0, 50, 0] += [40, -30]
    tr.xy[0, 70:72, 0] += [25, 25]
    out = kodo.remove_outliers(tr, threshold=5.0, window=7)
    p = out.points()[0]
    assert np.isnan(p[50]).all() and np.isnan(p[70:72]).all()
    ok = np.ones(len(p), dtype=bool)
    ok[[50, 70, 71]] = False
    assert np.allclose(p[ok], truth[ok])  # 正しい点は 1 つも消さない


def test_remove_jumps_single_spike():
    tr = _line()  # 0.5 mm/サンプル = 5 mm/s
    tr.xy[0, 40, 0] += [30, 0]
    tr.xy[0, 0, 0] += [30, 0]  # 最初の点の飛び
    out = kodo.remove_jumps(tr, max_speed=50.0)
    p = out.points()[0]
    assert np.isnan(p[40]).all() and np.isnan(p[0]).all()
    assert np.isfinite(p[1:40]).all() and np.isfinite(p[41:]).all()


def test_smoothing_preserves_straight_line_exactly():
    tr = _line()
    truth = tr.points()[0]
    for out in (kodo.smooth_moving_average(tr, 5), kodo.smooth_savgol(tr, 7, 2)):
        assert np.allclose(out.points()[0], truth)


def test_savgol_preserves_quadratic():
    t = np.arange(60) / 30
    p = np.c_[3 * t ** 2, -2 * t ** 2 + t]
    tr = kodo.Tracks(xy=p[None], fps=30)
    assert np.allclose(kodo.smooth_savgol(tr, 9, 2).points()[0], p)


def test_smoothing_reduces_noise_and_respects_gaps():
    rng = np.random.default_rng(0)
    tr = S.stationary(n_frames=2000, position=(10, 10), noise_sd=1.0, seed=rng)
    tr.xy[0, 500:510] = np.nan
    for out in (kodo.smooth_moving_average(tr, 9), kodo.smooth_savgol(tr, 11, 2)):
        p = out.points()[0]
        assert np.nanstd(p[:, 0]) < 0.6 * np.nanstd(tr.points()[0][:, 0])
        assert np.isnan(p[500:510]).all()  # 欠損は欠損のまま
        assert np.isfinite(p[:500]).all() and np.isfinite(p[510:]).all()
    # 平滑化で静止中の見かけの移動距離が減る
    L_raw = kodo.path_length(tr.points()[0])
    L_s = kodo.path_length(kodo.smooth_savgol(tr, 11, 2).points()[0])
    assert L_s < 0.5 * L_raw


def test_savgol_short_segment():
    tr = _line(n=20)
    tr.xy[0, 4] = np.nan  # 0..3 の 4 点だけの区間ができる
    out = kodo.smooth_savgol(tr, 7, 2)
    assert np.allclose(out.points()[0][:4], tr.points()[0][:4])


def test_window_must_be_odd():
    with pytest.raises(ValueError):
        kodo.smooth_moving_average(_line(), 4)


def test_scale_from_ruler_points_and_apply():
    mpp = kodo.mm_per_px_from_points((100, 200), (600, 200), 50)
    assert mpp == pytest.approx(0.1)
    mpp2 = kodo.mm_per_px_from_points((0, 0), (300, 400), 50)  # 斜めでも 500 px
    assert mpp2 == pytest.approx(0.1)
    tr = kodo.Tracks(xy=np.array([[[[100.0, 50.0]], [[200.0, 50.0]]]]), fps=10)
    out = kodo.apply_scale(tr, mpp)
    assert out.units == "mm" and np.allclose(out.xy[0, 1, 0], [20.0, 5.0])
    assert kodo.speed(out)[0, 0] == pytest.approx(100.0)  # 10 mm / 0.1 s
    with pytest.raises(ValueError, match="すでに mm"):
        kodo.apply_scale(out, mpp)
    with pytest.raises(ValueError):
        kodo.mm_per_px_from_points((1, 1), (1, 1), 10)


def test_mask_low_scores():
    xy = np.zeros((1, 4, 1, 2))
    scores = np.array([[[0.9], [0.1], [np.nan], [0.5]]])
    tr = kodo.Tracks(xy=xy, scores=scores)
    out = kodo.mask_low_scores(tr, 0.4)
    assert np.isnan(out.xy[0, [1, 2]]).all() and np.isfinite(out.xy[0, [0, 3]]).all()


def test_downsample_and_select():
    tr = _line(n=101, fps=30)
    tr.frame_start = 10
    sub = kodo.downsample(tr, 5)
    assert sub.n_frames == 21 and sub.frame_step == 5
    assert list(sub.frames[:3]) == [10, 15, 20]
    part = tr.select(frames=slice(20, 40))
    assert part.frame_start == 30 and part.n_frames == 20
