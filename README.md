# 貼圖line4x4咒語產生器

單頁 `index.html` 的 LINE 貼圖咒語工作台，固定輸出 4×4（16 格），保留角色卡模板、腳本文案、批次輸出與本地保存流程，並持續以版本快照方式演進。

## 🌐 線上使用

**網址**: [https://gxben0117-collab.github.io/line4x4-sticker-generator/](https://gxben0117-collab.github.io/line4x4-sticker-generator/)

無需安裝，直接在瀏覽器中使用！支援桌面和移動設備。

## 目前版本

- 正式頁面版本：`v2.8.4`
- 最新快照：`versions/貼圖line4x4咒語產生器-v2.8.4.html`

## 功能摘要

- **3 種內容模式合一，可混搭**：👤💬 人物＋文字／👤✨ 人物＋情緒特效（39 張情緒卡，無文字純表演）／🔤 純文字主體，同一組 16 張貼圖可自由混用（規劃見 `docs/project/V4_HANDOFF_三模式合一.md`）
- **角色不用上傳照片給本工具**：直接在 ChatGPT 對話裡把照片和咒語一起貼上即可；角色分頁分「依照上傳照片人物」（附五官/服裝補充備註欄）／「文字輸入」／「現行角色模板」三種
- 背景預設純綠 Chroma Key（#00FF00），去背最乾淨；角色本身帶大量綠/藍色時可改選純藍（#0000FF）或亮洋紅（#FF00FF）；也可選白底／AI 自動補充情境背景
- 腳本句庫 V3 分類：🔥熱門100 預設打開，12 主分類 × 51 子分類 + 關鍵字搜尋（規劃見 `docs/line-sticker-taxonomy-v3.md`）
- 腳本快速套用組合包（日常生活語 A/B/C、日常平衡包、職場快節奏…）一鍵補滿 16 句，套用後仍可自行調整
- 腳本分類選取、補滿、去重、排序、語氣平衡
- 角色卡模板群組（日常 / 職場 / 療癒 / 節慶 / 戰鬥）
- 完整 Prompt 一鍵複製，貼到 ChatGPT 即可出圖
- 工作台本地自動保存與還原（localStorage）

## 專案結構

```
index.html          單檔正式入口（CSS + HTML + JS 全整合）
dist/index.html     build 輸出（與 index.html 相同，供部署用）
versions/           歷史 HTML 快照（不覆蓋、不刪除）
assets/             v1.x 舊版分離來源（保留備查，見 LEGACY.md）
scripts/
  build.mjs         複製 index.html → dist/
  lint.mjs          結構快速檢查（版本、函式、UI 節點）
tests/
  smoke.test.mjs    smoke test 套件
docs/
  README.md         文件索引
  project/          專案總覽、程式邏輯說明、HANDOFF
  development-log/  各版本開發紀錄
  process/          部署說明、404 排除、維護流程
  archive/          實驗設計稿與舊版備份（不參與 build）
```

## 驗證

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
```

## 升版流程

1. 修改 `index.html`（`<title>` 與 version-badge 的版本標籤、功能）
2. 更新 `package.json` 的 `version`（lint 與 smoke test 會自動讀取）
3. 複製 `index.html` 到 `versions/貼圖line4x4咒語產生器-vX.Y.Z.html`
4. `npm.cmd run build && npm.cmd run lint && npm.cmd test`
5. 補 `docs/development-log/VX.YY.md`，更新本檔「目前版本」
6. push 到 `master` 即自動部署 GitHub Pages
