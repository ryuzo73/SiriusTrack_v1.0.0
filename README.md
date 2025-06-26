<<<<<<< HEAD
# Goal Todo App

長期的な目的を達成するための日々のタスク管理アプリケーション

## 機能

- 全体の目的設定
- セグメント別管理（英語、AI駆動開発、資格勉強など）
- マイルストーン管理（1ヶ月先まで）
- 日次・週次Todo管理
- 議論事項・懸念事項の記録と解決状況追跡
- カレンダービュー
- CSVエクスポート機能

## 技術スタック

- Electron
- React + TypeScript
- SQLite (better-sqlite3)
- Tailwind CSS
- Vite

## 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動（別々のターミナルで実行）
npm run dev:react    # React開発サーバー
npm run dev:electron # TypeScript監視モード

# 別のターミナルでElectronアプリを起動
npm run electron
```

## ビルド

```bash
# プロダクションビルド
npm run build

# パッケージング
npm run package
```

## データの保存場所

アプリケーションデータは以下の場所に保存されます：
- Windows: `%APPDATA%/goal-todo-app/goal-todo.db`
- macOS: `~/Library/Application Support/goal-todo-app/goal-todo.db`
- Linux: `~/.config/goal-todo-app/goal-todo.db`
=======
# siriustrack_test
>>>>>>> 66787f205e95532d69ce78e27150dace23431965
