# 貼圖line4x4咒語產生器

單頁 `index.html` 的 LINE 貼圖咒語工作台，固定輸出 4×4（16 格），保留角色卡模板、腳本文案、批次輸出與本地保存流程，並持續以版本快照方式演進。

## 目前版本

- 正式頁面版本：`v2.0.8`
- 最新快照：`versions/貼圖line4x4咒語產生器-v2.0.7.html`
- 文件版號：`V2.08`

## 功能摘要

- 快速套餐一鍵帶入角色、服裝、配色、字體與構圖
- 圖片上傳自動分析五官（需填入 `ANTHROPIC_API_KEY`）
- 腳本分類選取、補滿、去重、排序、語氣平衡
- 角色卡模板群組（日常 / 職場 / 療癒 / 節慶 / 戰鬥）
- 批次輸出：完整 Prompt、精簡 Prompt、JSON
- 精簡模式 / 進階模式切換
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
  smoke.test.mjs    11 項 smoke test
docs/
  README.md         文件索引
  版本規則.md        版本升級流程
  project/          專案總覽、程式邏輯說明、HANDOFF
  development-log/  各版本開發紀錄
  process/          文件維護流程
```

## API Key 設定（選用）

圖片自動分析功能需要 Anthropic API Key。
在 `index.html` 找到以下這行並填入：

```js
const ANTHROPIC_API_KEY = ''; // 填入您的 Anthropic API Key
```

未填時圖片上傳仍可用（手動描述模式），只有自動分析功能會略過。

## 驗證

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
```

## 升版流程

1. 複製 `index.html` 到 `versions/貼圖line4x4咒語產生器-vX.Y.Z.html`
2. 修改 `index.html`（版本標籤、功能）
3. 更新 `scripts/lint.mjs` 的 `CURRENT_VERSION`
4. 更新 `tests/smoke.test.mjs` 的版本字串
5. `npm.cmd run build && npm.cmd run lint && npm.cmd test`
6. 補 `docs/development-log/VX.YY.md` 與 `docs/project/VX.YY_HANDOFF.md`
