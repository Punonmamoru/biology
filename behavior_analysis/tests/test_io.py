"""3 種類の入力の読み込みのテスト。"""
import h5py
import numpy as np
import pytest

import kodo
from kodo import synthetic as S


@pytest.fixture
def demo():
    tr = S.make_demo_tracks(seed=1, duration_s=5)
    tr.fps = 30
    return tr


def _same(a, b):
    return np.allclose(a, b, equal_nan=True)


def test_sleap_roundtrip_and_layout(tmp_path, demo):
    path = kodo.write_sleap_h5(demo, tmp_path / "x.analysis.h5")
    with h5py.File(path) as f:
        # SLEAP の書き出しと同じ (個体, 2, 部位, フレーム) の並び
        assert f["tracks"].shape == (3, 2, 3, demo.n_frames)
        assert f["track_occupancy"].shape == (demo.n_frames, 3)
    tr = kodo.load(path, fps=30)
    assert tr.node_names == ["head", "thorax", "abdomen"]
    assert tr.track_names == demo.track_names
    assert tr.units == "px" and tr.fps == 30
    assert _same(tr.xy, demo.xy)
    assert tr.scores.shape == tr.xy.shape[:3]


def test_sleap_known_values(tmp_path):
    """x と y、部位、フレームの軸が取り違えられていないことを値で確かめる。"""
    T, N, F = 2, 3, 4
    raw = np.zeros((T, 2, N, F))
    for t in range(T):
        for n in range(N):
            for f in range(F):
                raw[t, 0, n, f] = 1000 * t + 100 * n + f  # x
                raw[t, 1, n, f] = -(1000 * t + 100 * n + f)  # y
    raw[1, :, 2, 3] = np.nan
    path = tmp_path / "k.h5"
    with h5py.File(path, "w") as f:
        f["tracks"] = raw
        f["node_names"] = np.array([b"a", b"b", b"c"])
        f["track_names"] = np.array([b"t0", b"t1"])
    tr = kodo.load_sleap_h5(path)
    assert tr.xy.shape == (T, F, N, 2)
    assert tr.xy[1, 2, 1, 0] == 1000 + 100 + 2
    assert tr.xy[1, 2, 1, 1] == -(1000 + 100 + 2)
    assert np.isnan(tr.xy[1, 3, 2]).all()
    # 転置せずに保存された (フレーム, 部位, 2, 個体) のファイルも読める
    path2 = tmp_path / "k2.h5"
    with h5py.File(path2, "w") as f:
        f["tracks"] = raw.T
        f["node_names"] = np.array([b"a", b"b", b"c"])
    tr2 = kodo.load_sleap_h5(path2)
    assert _same(tr2.xy, tr.xy)
    assert tr2.track_names == ["track_0", "track_1"]


def test_sleap_min_score(tmp_path, demo):
    demo.scores = np.ones(demo.xy.shape[:3])
    demo.scores[0, 3, 1] = 0.1
    path = kodo.write_sleap_h5(demo, tmp_path / "s.h5")
    tr = kodo.load_sleap_h5(path, min_score=0.5)
    assert np.isnan(tr.xy[0, 3, 1]).all()


def test_trackmate_roundtrip(tmp_path, demo):
    path = kodo.write_trackmate_csv(demo, tmp_path / "tm.csv", node="thorax")
    tr = kodo.load(path, fps=30)
    assert tr.n_tracks == 3 and tr.n_nodes == 1 and tr.units == "px"
    assert _same(tr.points(), demo.points("thorax"))


def test_trackmate_single_header_micron_and_untracked(tmp_path):
    text = (
        "Label,ID,TRACK_ID,QUALITY,POSITION_X,POSITION_Y,POSITION_Z,POSITION_T,FRAME\n"
        "Label,Spot ID,Track ID,Quality,X,Y,Z,T,Frame\n"
        "Label,Spot ID,Track ID,Quality,X,Y,Z,T,Frame\n"
        ",,,(quality),(micron),(micron),(micron),(sec),\n"
        "ID1,1,0,1,1000,2000,0,0,5\n"
        "ID2,2,0,1,1500,2000,0,0.1,6\n"
        "ID3,3,,1,99,99,0,0,5\n"
        "ID4,4,1,1,0,0,0,0.1,6\n"
    )
    p = tmp_path / "tm2.csv"
    p.write_text(text, encoding="utf-8")
    with pytest.warns(UserWarning, match="TRACK_ID"):
        tr = kodo.load_trackmate_csv(p)
    assert tr.units == "mm"  # µm は mm に換算される
    assert tr.frame_start == 5 and tr.n_frames == 2
    assert np.allclose(tr.xy[0, :, 0], [[1.0, 2.0], [1.5, 2.0]])
    assert np.isnan(tr.xy[1, 0]).all() and np.allclose(tr.xy[1, 1, 0], [0, 0])


def test_manual_csv_basic_and_sparse_frames(tmp_path):
    p = tmp_path / "m.csv"
    p.write_text("frame,x,y\n1,0,0\n11,10,0\n21,20,0\n41,40,0\n", encoding="utf-8")
    tr = kodo.load(p, fps=30)
    assert tr.frame_start == 1 and tr.frame_step == 10 and tr.n_frames == 5
    assert np.isnan(tr.xy[0, 3]).all()  # フレーム 31 は記録なし
    assert tr.dt == pytest.approx(10 / 30)
    assert np.allclose(kodo.speed(tr)[0, :2], 10 / (10 / 30))


def test_manual_csv_multiple_individuals_japanese_cp932(tmp_path):
    p = tmp_path / "m2.csv"
    p.write_bytes("個体,フレーム,X,Y\nA,0,1,2\nA,1,2,2\nB,0,5,5\nB,1,5,6\n".encode("cp932"))
    tr = kodo.load_manual_csv(p, fps=10)
    assert tr.track_names == ["A", "B"]
    assert np.allclose(tr.xy[1, 1, 0], [5, 6])


def test_manual_csv_roundtrip(tmp_path, demo):
    sub = demo.select(nodes=["thorax"], frames=slice(None, None, 3))
    p = kodo.write_manual_csv(sub, tmp_path / "m3.csv")
    tr = kodo.load(p, fps=30)
    assert tr.frame_step == 3
    assert _same(tr.xy, sub.xy)


def test_manual_csv_rejects_time_column(tmp_path):
    p = tmp_path / "bad.csv"
    p.write_text("frame,x,y\n0.0,0,0\n0.033,1,0\n", encoding="utf-8")
    with pytest.raises(ValueError, match="整数"):
        kodo.load_manual_csv(p)


def test_export_demo_files(tmp_path):
    paths = S.export_demo_files(tmp_path)
    assert all(p.exists() for p in paths.values())
    tr = kodo.load(paths["manual"], fps=30)
    assert tr.frame_step == 3 and tr.n_tracks == 1


def test_timeseries_and_dataframe(demo):
    df = kodo.tracks_to_dataframe(demo, node="thorax")
    assert list(df.columns) == ["track", "frame", "time_s", "x", "y"]
    assert len(df) == demo.n_tracks * demo.n_frames
