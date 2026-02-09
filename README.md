# Future-Self Advisor (MVP)

過去メモを読み込み、未来の自分として相談に答える“ビルド不要”の静的Webアプリです。GitHub Pagesでそのまま公開できます。

## GitHub Pagesで公開する手順
1. このリポジトリをGitHubにpushします。
2. GitHubのリポジトリ画面で **Settings → Pages** を開きます。
3. **Build and deployment** の **Source** を **Deploy from a branch** にします。
4. **Branch** を `main`（または使用中のブランチ）/`/root` にして保存します。
5. 数分待つと公開URLが表示されます。

## ローカルで確認する方法
- VSCodeの拡張機能「Live Server」などで `index.html` を開くだけでOKです。

## よくある詰まり
- **Pagesの設定が反映されない**: ブランチやフォルダ設定が正しいか再確認してください。
- **メモが読み込めない**: GitHub Pagesはリポジトリ名がパスに含まれるため、`data/notes/index.json` への相対パスがずれることがあります。本アプリは `location.pathname` からベースパスを組み立てているので、`/` 直下に置かれていることを確認してください。
- **ファイル名の変更が反映されない**: `data/notes/index.json` に追加した `.md` ファイル名が入っているか確認してください。
