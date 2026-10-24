# kodo ― 動物の行動解析パイプライン（生物部・SSH探究用）

SLEAP などで追跡した動物の座標から、**速度・直進性・転向角・滞在時間などの行動の指標を自動で計算し、グラフまで出す** Python のプログラムです。
ハンミョウ・ダンゴムシ・メダカなどの小動物を想定しています。生徒は Google Colab でノートブックを開き、**セルを上から実行するだけ**で使えます。

```
動画 ─(SLEAP / Fiji TrackMate / 手で記録)─▶ 座標のファイル
  ─▶ 読み込み（共通形式にそろえる）─▶ fps・スケールの設定 ─▶ 前処理（外れ値・欠損・ぶれ）
  ─▶ 指標の計算（個体ごとの表 CSV）─▶ 図（軌跡・速度・転向角・ヒートマップ・MSD）
```

## フォルダの中身

| ファイル | 内容 |
|---|---|
| `notebooks/行動解析_はじめて.ipynb` | 生徒向けノートブック。各セルの前に「何をするか・なぜ必要か」を日本語で説明 |
| `kodo/data.py` | 共通の内部形式 `Tracks`（個体 × フレーム × 部位 × xy） |
| `kodo/io.py` | 読み込み（SLEAP `.analysis.h5`・TrackMate CSV・手動追跡 CSV）と書き出し |
| `kodo/preprocess.py` | 外れ値の除去・欠損の補間・平滑化・px→mm 換算・間引き |
| `kodo/metrics.py` | 指標の計算（定義式はすべて docstring に記載） |
| `kodo/report.py` | 個体ごとの指標の表、CSV 保存、よくある失敗の自動チェック |
| `kodo/plotting.py` | 図（白背景・白黒印刷でも区別できる線種） |
| `kodo/fonts.py` | 日本語フォントの設定（Colab では自動でインストール） |
| `kodo/synthetic.py` | 合成データ（ランダムウォーク・壁ぞい・交替性転向など）と練習用データ |
| `tests/` | pytest によるテスト（答えの分かっている合成データで各指標を検証） |
| `REVIEW.md` | 指標の定義と計算の正しさのレビュー記録と対応 |

## 使い方

### Google Colab で（生徒）

1. Colab で `notebooks/行動解析_はじめて.ipynb` を開く（GitHub から開くか、ファイルをアップロード）。
2. 上のセルから順に ▶ を押す。最初のセルが GitHub から `kodo` をダウンロードする。
   リポジトリが非公開のときは、`behavior_analysis` フォルダを zip にして Colab にアップロードし、最初のセルの `ZIP_FILE` にファイル名を書く。
3. 最初は `USE_DEMO = True`（練習用データ）のまま最後まで実行してみる。
4. `USE_DEMO = False` にして、自分の座標ファイルと定規の画像をアップロードする。`★` の印の行（fps・定規の目盛りの位置・しきい値など）を自分の実験に合わせて書きかえる。
5. 最後のセルで `results.zip`（指標の CSV・図・設定の記録）がダウンロードされる。

### Python から（先生・上級生）

```python
import kodo
kodo.setup_japanese_font()

tr = kodo.load("ハンミョウ1.analysis.h5", fps=60)            # 拡張子と列名で形式を自動判別
kodo.check_tracks(tr, node="thorax")                         # fps 未設定・px のまま・ID 入れ替わりなどを警告
tr = kodo.remove_outliers(tr, threshold=15)                  # [px] 体長の半分くらい
tr = kodo.interpolate_gaps(tr, max_gap=8)                    # 8 サンプル以下の欠損だけ埋める
tr = kodo.smooth_savgol(tr, window=11, polyorder=2)
tr = kodo.apply_scale(tr, kodo.mm_per_px_from_points((40, 500), (540, 500), 100))

rois = [kodo.CircleROI(68, 48, 15, "えさ場")]                 # mm 単位（px で決めたら .scaled(mm_per_px)）
df = kodo.summarize(tr, node="thorax", speed_threshold=3.0, rois=rois, min_step=1.5)
kodo.save_summary_csv(df, "results/指標.csv")                 # Excel で開ける（BOM つき UTF-8）
kodo.save_all_figures(tr, "results", node="thorax", speed_threshold=3.0, min_step=1.5, rois=rois)
```

### 入力ファイル

| 形式 | 作り方 | 読み込み |
|---|---|---|
| SLEAP | `File → Export Analysis HDF5`（`.analysis.h5`） | `kodo.load_sleap_h5(path, fps=…, min_score=…)` |
| Fiji/TrackMate | Spots の表を CSV で書き出す（`TRACK_ID, FRAME, POSITION_X, POSITION_Y` の列） | `kodo.load_trackmate_csv(path, fps=…)` |
| 手動追跡 | 1 行目が `frame,x,y`。複数個体なら `id,frame,x,y`。Fiji の Manual Tracking の書き出しも可 | `kodo.load_manual_csv(path, fps=…)` |

* SLEAP の h5 は MATLAB 向けに転置されて `(個体, 2, 部位, フレーム)` で保存されている。`kodo` はこれを `(個体, フレーム, 部位, 2)` に並べ替える。
* TrackMate で画像に較正（µm など）を設定していた場合は、単位行から判定して mm に換算する。どのトラックにもつながらなかったスポットは除く。
* 手動追跡で「10 フレームおきにクリック」した場合は、その間隔を `frame_step` として持つ（速度は 10 フレームぶんの時間で割る）。個体ごとにクリックしたフレームがずれている・間隔が一定でない場合は警告が出るので、`interpolate_gaps` で埋めるか個体ごとにファイルを分ける。
* 手動追跡の座標の単位は、列名が `x_mm` や `x [mm]` なら mm、それ以外は px とみなす。
* 座標は画像と同じ「y 軸が下向き」を前提にする（SLEAP・TrackMate・Fiji の既定）。ImageJ で "Invert Y coordinates" にしていた場合など、y 軸が上向きのデータは `y_down=False` を付けて読み込む（付けないと転向角の左右が逆になる）。下から撮影した・鏡に映して撮影した映像も左右が反転する。
* 時刻は、どの形式でも **動画の 0 フレーム目を 0 秒**とする（TrackMate で最初の検出が 50 フレーム目なら、最初の時刻は 50/fps 秒）。
* 前処理の引数（`max_gap`, `window`）の単位は **サンプル**。`frame_step = 1` ならフレームと同じだが、10 フレームおきの手動追跡なら 1 サンプル = 10 フレーム。
* 日本語を含む CSV は UTF-8 と Shift_JIS のどちらでも読める。

### テストの実行

```bash
cd behavior_analysis
pip install -r requirements.txt pytest nbformat nbclient ipykernel
python -m pytest            # ノートブックの通し実行も含む（約 10 秒）
python -m pytest -m "not slow"   # ノートブックを除く
```

## 各指標の意味

記号: $p_t=(x_t, y_t)$ はサンプル $t$ の位置、$\Delta t$ はサンプルの時間間隔（= frame_step / fps）。
欠損（見失い）のフレームは計算から除き、その前後の点を直線で結んだとみなす。

> ⚠ **総移動距離・平均の速さ・直進性・移動の割合は、fps と平滑化の強さで変わる。** 検出のぶれ（静止していても数 px 揺れる）が 1 フレームごとに足し込まれるため、静止している個体でも総移動距離が伸び、直進性は 0 に近づく（例: σ = 0.2 mm のぶれ、30 fps、30 秒の静止で総移動距離 ≈ 300 mm）。**同じ fps・同じ前処理の設定どうしでしか比べない**こと。設定は `results/設定.txt` に残る。

| 指標 | 定義 | 読み方・注意 |
|---|---|---|
| 瞬間の速さ $v_t$ | $\lvert p_{t+1}-p_t\rvert / \Delta t$ | 検出のぶれで静止中も 0 にならない。平滑化してから使う |
| 総移動距離 $L$ | $\sum_k \lvert q_{k+1}-q_k\rvert$（$q$ は有効な点を順に並べたもの） | 活動量。欠損が多いと短めに出る |
| 平均の速さ | $L / T$（$T$ は最初と最後の有効な点の間の時間） | 静止時間も含めた平均 |
| 直進性 $S$ | $D / L$、$D=\lvert q_\text{last}-q_\text{first}\rvert$ | 0〜1。まっすぐなら 1。記録時間が長いほど小さくなるので、同じ長さで比べる。静止していると定義できない（空欄） |
| 転向角 $\theta$ | 移動ベクトル $u_k, u_{k+1}$ について $\operatorname{atan2}(u_k\times u_{k+1},\ u_k\cdot u_{k+1})$ | −180°〜180°。**画面上で左に曲がると正**（画像の y 軸は下向きなので符号を反転してある）。直前に測った点から `min_step` 以上離れるごとに測る。`min_step` は必須（体長の 1/4〜1/2） |
| 左に曲がった割合 | $0<\lvert\theta\rvert<180°$ の角度のうち $\theta>0$ の割合 | 0.5 なら左右の偏りなし。ちょうど 180° の U ターンは数えない |
| 交替性指数 $A$ | 同じ向きの角度（5° 以上）を、向きが変わるか直進が 3 回続くまでまとめて 1 回の「曲がり」とし（合計 ≥ 45°）、その向きの列で前回と逆向きだった割合 | 0.5 = でたらめ、1 = 必ず左右交互、0 = いつも同じ向き。ダンゴムシの交替性転向 |
| 移動・静止の割合 | $v_t \ge$ しきい値 のサンプルの割合 / その残り | しきい値は速さの分布の谷に置く |
| 滞在ヒートマップ | 区画ごとに $\Delta t \times$（その区画にいたサンプル数） | 単位は秒。壁ぞい行動は外周が濃くなる |
| 領域の滞在時間 | $\Delta t \times$（領域内のサンプル数） | 円 `CircleROI`・長方形 `RectROI`。境界上は内側 |
| 領域への進入回数 | 外 → 内 と変わった回数 | 記録開始時に中にいたのは数えない。境界のぶれで増えるときは `roi_min_samples` を 2 以上にする（それより短い滞在も、滞在の途中の短いはみ出しも無視する） |
| 初進入時刻 | 最初に領域に入ったサンプルの時刻（動画の 0 フレーム目 = 0 秒）と、そのフレーム番号 | 記録の最初から中にいたら最初のサンプルの時刻 |
| 最近接個体距離 | $\min_{j\ne i}\lvert p_i(t)-p_j(t)\rvert$ の時間平均 | 集合する（小さい）か、避け合う（大きい）か |
| 平均二乗変位 MSD | $\langle \lvert p_{t+\tau}-p_t\rvert^2\rangle_t$ | 2 次元ブラウン運動なら $4D\tau$、等速直進なら $(v\tau)^2$ |
| MSD 指数 $\alpha$ | $\log(\text{MSD}-c)$ と $\log\tau$ の傾き。$c=\max(0,\ 2\,\text{MSD}(\Delta t)-\text{MSD}(2\Delta t))$ は検出のぶれの分（$\approx 4\sigma^2$） | ≈1 ランダム、≈2 直進的、<1 狭い範囲に閉じこもる。ぶれを引かないと α が小さく出る |
| 拡散係数 $D$ | MSD を $a + b\tau$ で当てはめて $D=b/4$ | α が 0.7〜1.3 のとき（ランダムウォークとみなせるとき）だけ出す。それ以外は空欄 |

MSD の計算と当てはめは、既定では記録時間の **1 割** までの τ を使う（τ が大きいほど平均に使える組が減って値がばらつくため）。

## 前処理の考え方

| 処理 | 関数 | 中身 |
|---|---|---|
| 信頼度の低い点を除く | `mask_low_scores` | SLEAP の point_scores がしきい値未満の点を欠損に |
| 外れ値を除く | `remove_outliers` | 前後 `window // 2` サンプルの中央値の位置から、`threshold` と「付近の 1 サンプルの移動距離 × `k_step`（既定 3）」の大きいほうより離れた点を欠損に（ハンペル型）。速く曲がる本物の点は消さない |
| 1 点だけの飛びを除く | `remove_jumps` | 前後どちらへの移動も `max_speed` を超える点を欠損に |
| 欠損を埋める | `interpolate_gaps` | `max_gap` サンプル以下の内側の欠損だけを直線（または PCHIP）で補間。最初と最後は埋めない。10 フレームおきの記録なら `max_gap=8` は 80 フレームぶんになるので注意 |
| ぶれをならす | `smooth_savgol` / `smooth_moving_average` | 欠損で区切られた区間ごとに計算。どちらも等速直線運動は変えない |
| 単位を mm に | `mm_per_px_from_points` → `apply_scale` | 定規の 2 つの目盛りの距離から mm/px を計算 |
| 間引く | `downsample` | 高 fps で 1 フレームの移動がぶれに埋もれるとき |

**順番は「外れ値 → 補間 → 平滑化 → スケール」。** 外れ値を残したまま補間・平滑化すると、その誤差が前後に広がるため。

## よくある失敗

### 1. スケール未設定（px のまま）
* **症状**: 表の単位が `px`。カメラの高さやズームが変わると、同じ動物でも速さが変わってしまう。班どうし・日どうしで比べられない。
* **対策**: 毎回、動物が歩く面と**同じ高さ**に定規を置いて 1 枚撮る。ノートブックの 5. で目盛りの位置を読み、**赤い × が目盛りに重なっているか**確かめる。2 点はできるだけ離す（0 mm と 100 mm など）。
* `kodo.check_tracks()` が「px のまま」と警告する。`apply_scale` を 2 回実行するとエラーで止まる（2 重換算の防止）。

### 2. フレームレート（fps）の誤り
* **症状**: 速度・時間・拡散係数がすべて同じ倍率でずれる（60 fps の動画を 30 と入れると速さは半分、時間は 2 倍）。
* **対策**: 撮影アプリの設定を記録しておく。スマホのスロー撮影（120/240 fps）は、ファイルには 30 fps と書かれていることがある。Colab では `kodo.fps_from_video("動画.mp4")` でファイルに書かれた値を読めるが、**撮影時の設定と食い違っていないか**必ず確かめる。fps を入れ忘れると、速度の計算でエラーになる。
* **確かめ方**: 動画の中で既知の速さ（落下・定規の上を動かした物）を測ってみる。

### 3. ID の入れ替わり
* **症状**: 2 匹がすれ違った後、個体 A の記録が B のものになる。個体ごとの指標が混ざり、意味がなくなる。軌跡の図で、線の種類が途中で入れかわって見える。
* **対策**: `kodo.detect_id_swaps(tracks)`（`check_tracks` からも呼ばれる）が、「入れ替えたと考えたほうが移動がずっと小さくなる」フレームを報告する。動画のそのフレームを確かめ、本当に入れ替わっていれば `kodo.swap_tracks(tracks, "A", "B", from_sample=…)` で直す。SLEAP なら、GUI 上で直してから書き出し直すのが確実。
* **予防**: 個体に印をつける、密度を下げる、SLEAP のトラッキング設定（flow tracking・個体数の指定）を見直す。

### 4. そのほか
* **静止しているのに「移動」と判定される** → 平滑化が弱い（`SMOOTH_WINDOW` を大きく）か、しきい値が低い。速さの分布を見る。
* **転向角がでたらめ（±180° に広く散らばる）・交替性指数が 0.5 付近になる** → `min_step` が小さすぎる。体長の 1/4〜1/2 にする。
* **左右の向きが逆に出る** → y 軸が上向きのデータを `y_down=False` なしで読んでいないか、下から撮影していないか。
* **fps や平滑化の設定が違うデータどうしで総移動距離を比べている** → ぶれの足し込み方が変わるので比べられない。設定をそろえて計算し直す。
* **直進性・総移動距離を記録時間の違う個体で比べている** → `tracks.select(frames=slice(0, 1800))` などで長さをそろえる。
* **見失いが多い**（有効データの割合 < 0.8）→ 照明・背景・コントラストを改善する。長い欠損を無理に補間しない。
* **グラフの日本語が □ になる** → `kodo.setup_japanese_font(install=True)` を実行する。
* **Excel で CSV が文字化けする** → `kodo.save_summary_csv` は BOM つき UTF-8 で保存するので、そのままダブルクリックで開ける。自分で `to_csv` するときは `encoding="utf-8-sig"` を付ける。

## 練習用データ

`kodo.synthetic.export_demo_files("demo_data")` で、次の 4 ファイルを作る（答えは `kodo.synthetic.DEMO`）。

* `demo.analysis.h5` … SLEAP 形式（3 個体 × head/thorax/abdomen）
* `demo_trackmate.csv` … TrackMate 形式（thorax のみ）
* `demo_manual.csv` … 手動追跡形式（個体 C を 3 フレームおきに記録）
* `demo_arena.png` … 容器（プラケース 120 × 80 mm）と定規（100 mm）の画像。0.2 mm/px、30 fps

3 個体は「ランダムに歩き、ときどき止まる個体（A）」「壁から 4 mm のところを壁ぞいに歩く個体（B）」「7 mm 進むごとに左右交互に 90° 曲がる個体（C）」。
検出のぶれ（±1 px）・短い見失い・一瞬の誤検出も入れてあるので、前処理の効果も確かめられる。

テスト用の基本の合成データ: `straight_line`（直進性 1・転向角 0・MSD 指数 2）、`stationary`（速さ 0）、`circle_path`（転向角が一定）、`brownian_walk`（MSD の傾き = 4D）、`correlated_random_walk`、`wall_follower`、`alternating_turner`（`p_alternate` で交替の強さを変えられる）。
