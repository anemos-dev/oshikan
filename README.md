# 推しカン

推しカンは、就活の企業研究を「推し活」感覚で進めるためのローカルWebツールです。  
正式名は「推しカンパニー」。気になる企業を登録し、推しポイント・モヤモヤ・クエスト・比較・志望動機づくりまで一か所で管理できます。

## 特徴

- 完全無料
- アカウント不要
- Googleログインでクラウド同期に対応
- ブラウザだけで利用可能
- 未ログイン時のデータは自分のブラウザに保存
- GitHub Pagesでそのまま公開可能

## 主な機能

- 推し棚: 企業登録、分類、理解度・共感度・相性度・不安度・志望度の管理
- カード: 推しポイントとモヤモヤを記録
- クエスト: 企業研究タスクを自動生成して進捗管理
- 比較: 自分の価値観に合わせて企業を比較
- ES/面接: 志望動機の骨子と面接前30秒復習シートを生成
- プロフィール: 強み、経験、価値観、比較用の重みを保存
- バックアップ: JSONエクスポート / インポート
- 同期: Googleログイン時にFirebaseへ保存
- ローカルAI改善: Ollamaがある場合だけ任意で利用可能

## すぐ使う

GitHub Pagesで公開している場合は、公開URLを開くだけで使えます。

```text
https://anemos-dev.github.io/oshikan/
```

インストールやGit操作は不要です。データは開いた人それぞれのブラウザに保存されます。

ローカルで使う場合:

```bash
git clone https://github.com/anemos-dev/oshikan.git
cd oshikan
./run.command
```

`run.command` は `http://localhost:8765/index.html` を開きます。

WindowsやLinuxでは、以下でも起動できます。

```bash
python3 -m http.server 8765
```

その後、ブラウザで `http://localhost:8765/index.html` を開きます。

## GitHub Pagesで公開する

1. GitHubで新しいリポジトリを作成
2. このフォルダのファイルをpush
3. リポジトリの `Settings` を開く
4. `Pages` を開く
5. `Build and deployment` の `Source` を `Deploy from a branch` にする
6. `Branch` を `main`、フォルダを `/root` にして保存

数分後に表示されるURLを友達に共有すれば使えます。

push例:

```bash
git remote add origin https://github.com/anemos-dev/oshikan.git
git push -u origin main
```

## データ保存について

未ログイン時の推しカンのデータは、各ユーザーのブラウザの `localStorage` に保存されます。  
Googleログイン中は、Firebase AuthenticationとCloud Firestoreを使って、ログインした本人のクラウド領域にも保存されます。

同じURLでも、友達同士でデータは共有されません。

大事なデータは、ホーム画面の `JSONエクスポート` でバックアップできます。

## ローカルAI改善（任意）

`ES/面接` タブの `ローカルAIで改善` は、Ollamaを入れている人だけ使える任意機能です。  
未導入でも通常機能はすべて使えます。

```bash
ollama serve
ollama pull qwen2.5:7b-instruct
```

## ファイル構成

```text
.
├── index.html
├── styles.css
├── app.js
├── run.command
├── README.md
├── LICENSE
├── .nojekyll
└── .gitignore
```

## ライセンス

MIT License
