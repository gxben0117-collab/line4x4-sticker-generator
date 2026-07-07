# CLAUDE.md — 貼圖line4x4咒語產生器

## 共通規範

先讀 `C:\AIProjects\000AI-Vault\INDEX.md`（工作區規範、命名版本規則、環境陷阱，本檔不重複）。

## 本專案特有

- 目標：LINE 4x4 合圖貼圖咒語產生器（正式主線）。
- 技術棧：靜態 HTML + Node 建置腳本 + GitHub Actions。
- 主入口：`index.html`；部署 GitHub Pages（gxben0117-collab.github.io/line4x4-sticker-generator）。
- 指令：`npm.cmd run build` / `npm.cmd run lint` / `npm.cmd test`（PowerShell 必須用 npm.cmd）。
- 目前版本：v2.6.0（2026-07-06）V3-lite 分類重整：熱門100預設開、12主分類×51子分類、句子搜尋。
- 分類規劃文件：`docs/line-sticker-taxonomy-v3.md`。
- 產出的合圖用使用者層級 skill「process-stickers」（觸發詞「跑切圖」）切割去背。

## 目前狀態與下一步

（每次收工前更新，供下一個 AI 接手。）
