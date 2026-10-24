"""生徒向けノートブックが上から最後までエラーなく実行できることを確かめる。"""
import os
from pathlib import Path

import pytest

nbformat = pytest.importorskip("nbformat")
nbclient = pytest.importorskip("nbclient")

ROOT = Path(__file__).resolve().parents[1]
NOTEBOOK = ROOT / "notebooks" / "行動解析_はじめて.ipynb"


@pytest.mark.slow
def test_notebook_runs_top_to_bottom(tmp_path, monkeypatch):
    monkeypatch.setenv("PYTHONPATH", str(ROOT) + os.pathsep + os.environ.get("PYTHONPATH", ""))
    monkeypatch.setenv("MPLBACKEND", "Agg")
    nb = nbformat.read(NOTEBOOK, as_version=4)
    client = nbclient.NotebookClient(nb, timeout=300, kernel_name="python3",
                                     resources={"metadata": {"path": str(tmp_path)}})
    client.execute()
    out = tmp_path / "results"
    names = {p.name for p in out.iterdir()}
    for expected in ["指標.csv", "時系列.csv", "軌跡.png", "速度.png", "転向角.png", "ヒートマップ.png",
                     "MSD.png", "設定.txt"]:
        assert expected in names
    # 日本語フォントが見つからない警告やエラーがセルの出力にないこと
    for cell in nb.cells:
        for o in cell.get("outputs", []):
            text = o.get("text", "") if o.get("output_type") == "stream" else ""
            assert "missing from font" not in text
            assert o.get("output_type") != "error"
