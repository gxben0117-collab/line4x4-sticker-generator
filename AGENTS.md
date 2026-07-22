# CLAUDE.md — 貼圖line4x4咒語產生器

## 共通規範

先讀 `C:\AIProjects\000AI-Vault\INDEX.md`（工作區規範、命名版本規則、環境陷阱，本檔不重複）。

## 本專案特有

- 目標：LINE 4x4 合圖貼圖咒語產生器（正式主線）。
- 技術棧：靜態 HTML + Node 建置腳本 + GitHub Actions。
- 主入口：`index.html`；部署 GitHub Pages（gxben0117-collab.github.io/line4x4-sticker-generator）。
- 指令：`npm.cmd run build` / `npm.cmd run lint` / `npm.cmd test`（PowerShell 必須用 npm.cmd）。
- 目前版本：v2.7.0（2026-07-22）V4：3 種內容模式合一（人物+文字／人物+情緒特效／純文字主體），可混搭；補齊主圖/標籤圖 Prompt；背景預設青綠去背底。
- 分類規劃文件：`docs/line-sticker-taxonomy-v3.md`；V4 合一架構交接文件：`docs/project/V4_HANDOFF_三模式合一.md`。
- 產出的合圖用使用者層級 skill「process-stickers」（觸發詞「跑切圖」）切割去背；`003圖片暫存區/process.mjs` 的去背邏輯已改成自動偵測 key color（白底、青綠底皆適用），該檔不在本 repo 管轄範圍內。

## 目前狀態與下一步

- 2026-07-22：Claude 完成 V4「3 模式合一」：
  新增內容模式切換（人物+文字/人物+情緒特效/純文字主體），用 `[情緒]`／`[文字]` 行首標籤
  讓既有 16 行文字框可混搭三種模式，未標記行永遠是人物+文字模式（向後相容）；
  新增 24 張情緒卡（`EMOTION_CARDS`）；`combineAll()` 依標籤分流產出對應 Panel prompt；
  新增主圖(240×240)/標籤圖(96×74) Prompt 生成；背景預設改青綠去背底；
  `003圖片暫存區/process.mjs` 去背邏輯改自動偵測 key color。smoke test 22 項全過。
  完整實作細節見 `docs/project/V4_HANDOFF_三模式合一.md`。
- 2026-07-09：Codex 已完成 V3-lite 文件與實作一致性收斂：
  `HOT_SENTENCES` 確認為正式 100 句，`docs/line-sticker-taxonomy-v3.md`、
  `docs/line-sticker-sentences-v3-draft.md`、`docs/line-sticker-sentences.md`
  已與 `index.html` 實際句庫同步；新增 `scripts/build-sentences-report.mjs` 與
  `docs:sentences` / `docs:taxonomy` 維護指令；測試補上熱門100與 taxonomy 完整性檢查。
- 下一步：情緒卡/字體風格可依實際使用回饋調整；7 字以上 ⚠ 長句仍待逐批改短，暫不建議自動縮句。
