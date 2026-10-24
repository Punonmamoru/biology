"""指標のレビュー（REVIEW.md）で見つかった問題が再発しないことを確かめる。"""
import warnings

import h5py
import numpy as np
import pytest

import kodo
from kodo import metrics as M
from kodo import synthetic as S


# 1. 外れ値除去が速い転回・Uターンの本物の点を消さない
@pytest.mark.parametrize("radius,deg_per_frame", [(48, 30), (30, 45), (100, 10)])
def test_remove_outliers_keeps_fast_turns(radius, deg_per_frame):
    ph = np.radians(deg_per_frame) * np.arange(200)
    tr = kodo.Tracks(xy=np.c_[radius * np.cos(ph), radius * np.sin(ph)][None], fps=30)
    out = kodo.remove_outliers(tr, threshold=15)
    assert np.isfinite(out.xy).all()


def test_remove_outliers_keeps_u_turn_but_removes_spike():
    x = np.r_[np.arange(0, 200, 10.0), np.arange(190, -10, -10.0)]  # 10 px/フレームで往復
    p = np.c_[x, np.zeros_like(x)]
    p[30] += [0, 60]  # 往路の途中の飛び
    out = kodo.remove_outliers(kodo.Tracks(xy=p[None], fps=30), threshold=15)
    q = out.points()[0]
    assert np.isnan(q[30]).all()
    assert np.isfinite(np.delete(q, 30, axis=0)).all()  # U ターンの頂点（19, 20）は残る


def test_remove_outliers_on_clean_demo_removes_nothing():
    tr = S.make_demo_tracks(noise_px=0, gap_rate=0, n_spikes=0)
    out = kodo.remove_outliers(tr, threshold=15)
    assert np.isfinite(out.xy).all()


# 2. 交替性指数：小さな角度がはさまっても曲がりが分断されない
def test_turn_events_tolerate_small_angles():
    th = np.radians([30, 3, 30, 0, 0, -30, -30])
    assert list(M.turn_events(th)) == [1, -1]
    # 直進が max_straight 個続けば区切る（30° + 30° を 1 回の曲がりにしない）
    assert list(M.turn_events(np.radians([30, 0, 0, 0, 30]))) == []
    assert M.alternation_index(np.radians([60, 2, -60, 0, 50, -3, -50])) == 1.0


# 3. min_step を指定しないと転向角は出さない（ぶれで交替性指数が 0.5 に寄るのを防ぐ）
def test_turning_requires_min_step():
    tr = S.straight_line()
    with pytest.raises(ValueError, match="min_step"):
        kodo.plot_turning_hist(tr)


def test_min_step_recovers_alternation_under_noise():
    rng = np.random.default_rng(0)
    tr = S.alternating_turner(n_frames=3000, fps=30, speed=6, segment_length=7, p_alternate=1.0, seed=rng)
    noisy = tr.points()[0] + rng.normal(0, 0.2, (tr.n_frames, 2))
    sm = kodo.smooth_savgol(kodo.Tracks(xy=noisy[None], fps=30, units="mm"), 11, 2).points()[0]
    assert M.alternation_index(M.turning_angles(sm, min_step=1.5)) > 0.9


# 4. ROI：境界での短い退出も進入回数に数えない
def test_roi_short_exits_are_bridged():
    x = np.r_[np.zeros(5), np.ones(50), 0, np.ones(50), 0, np.ones(50)]
    p = np.c_[x, np.zeros_like(x)]
    roi = M.RectROI(0.5, -1, 2, 1)
    assert M.roi_stats(p, roi, 1)["entries"] == 3
    assert M.roi_stats(p, roi, 1, min_samples=2)["entries"] == 1
    assert M.roi_stats(p, roi, 1, min_samples=2)["time_s"] == 150  # 滞在時間は生の判定のまま


# 5. 時刻の原点はどの形式でも動画の 0 フレーム目
def test_time_origin_is_video_frame_zero(tmp_path):
    frames = np.arange(50, 100)
    path = tmp_path / "m.csv"
    path.write_text("frame,x,y\n" + "\n".join(f"{f},{f},0" for f in frames), encoding="utf-8")
    tm = kodo.load(path, fps=10)
    xy = np.full((1, 100, 1, 2), np.nan)
    xy[0, 50:, 0, 0] = frames
    xy[0, 50:, 0, 1] = 0
    sl = kodo.Tracks(xy=xy, fps=10)  # SLEAP 形式（フレーム 0 から）
    roi = M.RectROI(70, -1, 80, 1, name="r")
    a = kodo.summarize(tm, rois=[roi], min_step=1)
    b = kodo.summarize(sl, rois=[roi], min_step=1)
    assert a["roi_r_first_s"][0] == pytest.approx(7.0) == b["roi_r_first_s"][0]
    assert a["roi_r_first_frame"][0] == 70 == b["roi_r_first_frame"][0]
    assert tm.time[0] == pytest.approx(5.0)


# 6. 手動 CSV：個体ごとに記録フレームがずれていると警告し、補間で速さが出る
def test_manual_offset_frames_warn(tmp_path):
    rows = ["id,frame,x,y"] + [f"A,{f},{f},0" for f in range(0, 100, 10)] + \
        [f"B,{f},{f},5" for f in range(5, 105, 10)]
    p = tmp_path / "off.csv"
    p.write_text("\n".join(rows), encoding="utf-8")
    with pytest.warns(UserWarning, match="サンプルおき"):
        tr = kodo.load(p, fps=10)
    filled = kodo.interpolate_gaps(tr, max_gap=1)
    v = kodo.speed(filled)
    assert np.allclose(v[np.isfinite(v)], 10.0)  # 1 フレーム 1 px、10 fps


# 7. MSD 指数 α は検出のぶれで偏らない／α が 1 から遠ければ D を出さない
def test_msd_alpha_corrected_for_noise():
    rng = np.random.default_rng(1)
    alphas = []
    for _ in range(10):
        p = S.brownian_walk(900, 30, D=0.05, seed=rng).points()[0] + rng.normal(0, 0.2, (900, 2))
        lags, val, _ = M.msd(p, 90)
        alphas.append(M.fit_msd(lags / 30, val)["alpha"])
    assert np.mean(alphas) == pytest.approx(1.0, abs=0.12)
    p = S.straight_line(900, 30, 2.0).points()[0] + rng.normal(0, 0.3, (900, 2))
    lags, val, _ = M.msd(p, 90)
    assert M.fit_msd(lags / 30, val)["alpha"] > 1.7


def test_summary_D_only_for_diffusive():
    a = S.straight_line(n_frames=900, fps=30, speed=3).points()[0]
    b = S.brownian_walk(n_frames=900, fps=30, D=1.0, seed=2).points()[0]
    tr = kodo.Tracks(xy=np.stack([a, b]), fps=30, units="mm")
    df = kodo.summarize(tr, min_step=1)
    assert np.isnan(df["msd_D"][0]) and df["msd_alpha"][0] > 1.7
    assert df["msd_D"][1] == pytest.approx(1.0, rel=0.35)


# 9. 列名が x_mm なら mm として読む
def test_manual_units_from_column_name(tmp_path):
    p = tmp_path / "mm.csv"
    p.write_text("frame,x_mm,y_mm\n0,1,1\n1,2,2\n", encoding="utf-8")
    assert kodo.load(p).units == "mm"
    with pytest.raises(ValueError, match="mm 単位"):
        kodo.load_manual_csv(p, units="px")


# 10. y 軸が上向きのデータは y_down=False で左右を正しく判定する
def test_y_up_loader(tmp_path):
    p = tmp_path / "up.csv"
    p.write_text("frame,x,y\n0,0,0\n1,10,0\n2,10,10\n", encoding="utf-8")  # y 上向きなら左折
    tr = kodo.load(p, y_down=False)
    th = M.turning_angles(tr.points()[0], y_down=tr.y_down)
    assert np.degrees(th[0]) == pytest.approx(90.0)
    assert kodo.load(p).y_down is True


# 12. ちょうど 180° の U ターンは左右に数えない
def test_u_turn_not_counted_as_left():
    assert np.isnan(M.turn_summary(np.array([np.pi, np.pi]))["left_turn_fraction"])


# 14. 部位が 2 つの転置されていない SLEAP h5
def test_sleap_two_nodes_untransposed(tmp_path):
    F, N, T = 50, 2, 3
    raw = np.random.default_rng(0).random((F, N, 2, T))
    path = tmp_path / "u.h5"
    with h5py.File(path, "w") as f:
        f["tracks"] = raw
        f["node_names"] = np.array([b"a", b"b"])
        f["track_names"] = np.array([b"t0", b"t1", b"t2"])
    tr = kodo.load_sleap_h5(path)
    assert tr.n_tracks == 3 and tr.n_frames == 50


# 15. TrackMate の nm / cm、知らない単位
@pytest.mark.parametrize("unit,factor", [("(nm)", 1e-6), ("(cm)", 10.0), ("(micron)", 1e-3), ("(mm)", 1.0)])
def test_trackmate_units(tmp_path, unit, factor):
    text = ("TRACK_ID,POSITION_X,POSITION_Y,FRAME\n"
            f",{unit},{unit},\n"
            "0,100,200,0\n0,110,200,1\n")
    p = tmp_path / "tm.csv"
    p.write_text(text, encoding="utf-8")
    tr = kodo.load_trackmate_csv(p)
    assert tr.units == "mm" and tr.xy[0, 0, 0, 0] == pytest.approx(100 * factor)


def test_trackmate_unknown_unit(tmp_path):
    p = tmp_path / "tm.csv"
    p.write_text("TRACK_ID,POSITION_X,POSITION_Y,FRAME\n,(inch),(inch),\n0,1,2,0\n", encoding="utf-8")
    with pytest.raises(ValueError, match="inch"):
        kodo.load_trackmate_csv(p)


# 16. 1 個体でも mean_nnd 列がある・単位の列がある
def test_summary_columns_single_track():
    tr = S.straight_line()
    df = kodo.summarize(tr, min_step=1)
    assert "mean_nnd" in df.columns and np.isnan(df["mean_nnd"][0])
    assert df["units"][0] == "mm"
    import pandas as pd
    both = pd.concat([df, df])  # attrs が消えても単位の列から日本語の列名が作れる
    assert "総移動距離[mm]" in kodo.japanese_columns(both).columns


def test_no_runtime_warnings_in_summary():
    tr = S.make_demo_tracks(seed=0, duration_s=10)
    tr.fps = 30
    with warnings.catch_warnings():
        warnings.simplefilter("error")
        kodo.summarize(tr, node="thorax", speed_threshold=10, min_step=5)
