"""指標の表・図の保存・日本語フォント・練習用データのテスト。"""
import warnings

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import pytest  # noqa: E402
from PIL import Image  # noqa: E402

import kodo  # noqa: E402
from kodo import synthetic as S  # noqa: E402


@pytest.fixture(scope="module")
def processed():
    tr = S.make_demo_tracks(seed=0, duration_s=20)
    tr.fps = S.DEMO["fps"]
    tr = kodo.remove_outliers(tr, threshold=15)
    tr = kodo.interpolate_gaps(tr, max_gap=8)
    tr = kodo.smooth_savgol(tr, 7, 2)
    return kodo.apply_scale(tr, S.DEMO["mm_per_px"])


def test_summarize_straight_and_stationary():
    a = S.straight_line(n_frames=301, fps=30, speed=10).points()[0]
    b = S.stationary(n_frames=301, fps=30, position=(50, 50)).points()[0]
    tr = kodo.Tracks(xy=np.stack([a, b]), fps=30, units="mm", track_names=["直進", "静止"])
    roi = kodo.RectROI(-1, -1, 20.5, 1, name="start")
    with pytest.warns(UserWarning, match="min_step"):
        df = kodo.summarize(tr, speed_threshold=1.0, rois=[roi])
    assert "alternation_index" not in df.columns  # min_step なしでは転向角の列を出さない
    r0, r1 = df.iloc[0], df.iloc[1]
    assert r0["straightness"] == pytest.approx(1.0)
    assert r0["total_distance"] == pytest.approx(100.0)
    assert r0["mean_speed"] == pytest.approx(10.0)
    assert r0["moving_fraction"] == 1.0
    assert r0["msd_alpha"] == pytest.approx(2.0)
    assert r0["roi_start_time_s"] == pytest.approx(62 / 30)  # x = 0..20.333 の 62 サンプル
    assert r1["median_speed"] == 0.0 and r1["stationary_fraction"] == 1.0
    assert np.isnan(r1["straightness"])
    assert r0["mean_nnd"] > 0


def test_summary_csv_is_excel_friendly(tmp_path, processed):
    df = kodo.summarize(processed, node="thorax", speed_threshold=2.0,
                        rois=[kodo.CircleROI(68, 48, 15, name="中央")], min_step=1.5)
    path = kodo.save_summary_csv(df, tmp_path / "summary.csv")
    raw = path.read_bytes()
    assert raw.startswith(b"\xef\xbb\xbf")  # BOM（Excel で文字化けしない）
    back = pd.read_csv(path, encoding="utf-8-sig")
    assert "総移動距離[mm]" in back.columns and "領域中央_進入回数" in back.columns
    assert "領域中央_滞在時間[s]" in back.columns and "領域中央_初進入時刻[s]" in back.columns
    assert len(back) == 3
    ts = kodo.save_timeseries_csv(processed, tmp_path / "ts.csv", node="thorax")
    assert len(pd.read_csv(ts, encoding="utf-8-sig")) == 3 * processed.n_frames


def test_check_tracks_messages():
    tr = S.make_demo_tracks(seed=0, duration_s=5)
    msgs = kodo.check_tracks(tr, verbose=False)
    assert any("fps" in m for m in msgs) and any("px" in m for m in msgs)


def test_japanese_font_renders_without_missing_glyphs(tmp_path):
    name = kodo.setup_japanese_font(install=False, verbose=False)
    if name is None:
        pytest.skip("この環境には日本語フォントがない")
    fig, ax = plt.subplots()
    ax.set_title("軌跡・速度・転向角・滞在時間 [mm²/s] −1 °")
    with warnings.catch_warnings():
        warnings.simplefilter("error")  # 「Glyph ... missing from font」の警告があれば失敗
        fig.savefig(tmp_path / "jp.png")
    plt.close(fig)


def test_save_all_figures_white_background(tmp_path, processed):
    kodo.setup_japanese_font(install=False, verbose=False)
    with warnings.catch_warnings():
        warnings.simplefilter("error", UserWarning)
        paths = kodo.save_all_figures(processed, tmp_path, node="thorax", speed_threshold=2.0,
                                      min_step=1.5, rois=[kodo.CircleROI(68, 48, 15, name="中央")])
    assert set(paths) == {"trajectory", "speed", "turning_hist", "heatmap", "msd"}
    for p in paths.values():
        img = np.asarray(Image.open(p).convert("RGB"))
        assert img.shape[0] > 300
        assert (img[2, 2] == 255).all() and (img[-3, -3] == 255).all()  # 四隅は白


def test_linestyles_distinguish_tracks_in_bw():
    kodo.set_print_mode(True)
    try:
        styles = [kodo.plotting.track_style(i) for i in range(6)]
        assert len({str(s["linestyle"]) for s in styles}) == 6
        assert len({s["color"] for s in styles}) == 1
    finally:
        kodo.set_print_mode(False)


def test_show_image_and_arena_image(tmp_path):
    p = S.make_arena_image(tmp_path / "arena.png")
    img = np.asarray(Image.open(p).convert("L"))
    x0, y0 = map(int, S.DEMO["ruler_p0_px"])
    x1, _ = map(int, S.DEMO["ruler_p1_px"])
    assert img[y0 - 5, x0] < 100 and img[y0 - 5, x1] < 100  # 0 mm と 100 mm の目盛りがある
    mpp = kodo.mm_per_px_from_points(S.DEMO["ruler_p0_px"], S.DEMO["ruler_p1_px"], S.DEMO["ruler_mm"])
    assert mpp == pytest.approx(S.DEMO["mm_per_px"])
    fig, _ = kodo.show_image(p, points=[S.DEMO["ruler_p0_px"]])
    plt.close(fig)


def test_demo_tracks_contain_realistic_defects():
    tr = S.make_demo_tracks(seed=0)
    assert 0.9 < np.mean(tr.valid_fraction()) < 1.0
    assert tr.units == "px" and tr.fps is None
