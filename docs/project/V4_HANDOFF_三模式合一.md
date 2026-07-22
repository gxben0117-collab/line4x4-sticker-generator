# V4 交接文件：3 方案合一（人物+文字 / 人物+情緒特效 / 純文字主體）

日期：2026-07-22
狀態：**架構已定案，尚未實作完成**——這份文件是給下一個 session 接續用的完整施工圖。

## 使用者要求（原話精神）

> 我的那個方案就是要這 3 功能合一，並優化流程和 UI 介面的設計。

3 功能＝上一輪提案 `docs/line-sticker-v4-redesign-proposals.md` 裡的方案 A（人物+文字）、B（人物+情緒特效）、C（純文字主體），使用者要**三個都做進同一個工具**，可以混搭（例如 16 張裡 12 張走 C、4 張走 B），而不是三選一。

還要：
- 多種字體選擇（**已存在**，`fontList`/`fontData`，40 套現成字體風格，不用新建）
- 有無背景切換
- 預設背景改青綠色，方便去背
- LINE 官方規格要對（貼圖 370×320px 透明底 PNG、主圖 240×240px、標籤圖 96×74px）——**目前只做了 16 張貼圖，主圖跟標籤圖完全沒做，這是必補的缺口**

## 已核對的技術判斷（不用重新推導）

1. **process-stickers 去背腳本**（`C:\AIProjects\003圖片暫存區\process.mjs`）目前是抓「白色」當背景色，用連通區塊分析區分外部白底跟角色內部白色（眼白、白衣服）——邏輯複雜就是因為白底跟角色本身的白色打架。改抓青綠色 key color 會準很多，這支腳本也要一起改（見下方 Step 7）。
2. LINE 官方貼圖規格：貼圖本體最長邊 370×320px、主圖 240×240px、標籤圖 96×74px，皆為 PNG 透明底。
3. `combineAll()`（index.html 內組 prompt 的核心函式）現有邏輯已經有「NO TEXT 純視覺」分支（透過 `isNoTextScript()` 判斷），這是方案 B 情緒卡的基礎雛形，不用整個重寫，是擴充。
4. `layoutData.C`（"Large Text Center + Character Corner"）已經是方案 C 需要的版面描述，不用新建。
5. `fontList`/`fontData`（約 40 套字體風格，含描述性 prompt 文字，如 泡泡字/糖果彩虹/水墨手寫/TOP海報體/迷因體）已經是方案 C 需要的字體系統，直接沿用。

## 核心架構決策（已定案，直接照做）

### 標籤系統（讓 16 行文字框可以混搭 3 種模式，同時保留現有編輯體驗）

現有產品的靈魂是「16 行文字框，一行一張貼圖，直接打字編輯」——`script-edit-area` textarea + `getAllScriptLines()`/`dedupeScriptEditor()`/`sortScriptEditor()`/`syncScriptFromTextarea()` 等一整組函式都是圍繞這個 textarea 運作。**不能砍掉重練**，要用最小改動疊加「模式」資訊上去。

做法：用行首方括號標籤區分模式，未標記 = 舊行為（人物+文字，100% 向後相容）：

| 行內容 | 模式 | 說明 |
| --- | --- | --- |
| `早安`（無標籤） | **character**（人物+文字，預設/舊行為） | 完全比照現有邏輯，不影響任何現有使用者 |
| `[情緒] 晴天霹靂` | **emotion**（人物+情緒特效） | `情緒` 後面接 `EMOTION_CARDS` 裡的卡片名稱 |
| `[文字] 早安` | **text**（純文字主體） | `文字` 後面接一般句子（沿用 `scriptData`/熱門100） |

**規則（重要，避免混搭時互相污染）**：
- 未標記的行**永遠**是 character 模式，不管目前全域模式切到哪個——這樣才能保證「使用者從沒碰過新功能」時行為完全不變，也保證混搭時不會因為後來切換全域模式而回頭污染已經選好的行。
- 從挑選器（picker）點選插入時：
  - 目前全域模式是 `character` → 插入**不加標籤**的原句（跟現在一模一樣）。
  - 目前全域模式是 `text` → 插入時**永遠加 `[文字] ` 前綴**，不管之前有沒有切換過模式。
  - 情緒卡一律插入 `[情緒] ` 前綴。
- 手動貼上/打字進 textarea 的**未標記**行，一律視為 character 模式（不會去看「目前全域模式」，避免有歧義）。

### Helper 函式（新增，插在 `scriptData`/`EMOTION_CARDS` 定義附近）

```js
function stripModeTag(line) {
  const m = /^\[(情緒|文字)\]\s*/.exec(line);
  return m ? line.slice(m[0].length) : line;
}
function parseModeTag(line) {
  const m = /^\[(情緒|文字)\]\s*/.exec(line);
  if (!m) return { mode: 'character', text: line };
  return { mode: m[1] === '情緒' ? 'emotion' : 'text', text: line.slice(m[0].length) };
}
```

### `getAllScriptLines()` 要去標籤

現有函式（約在 `combineAll` 前面，`function getAllScriptLines()`）目前直接回傳 textarea 原始行。健康度檢查、字數警告、語氣偵測等下游函式都吃這個，如果不去標籤，`[文字] ` 這 4 個字會被誤算進字數警告、語氣偵測會失準。改法：

```js
function getAllScriptLines() {
  const ta = document.getElementById('script-edit-area');
  const editorLines = ta ? ta.value.split('\n').map(l => l.trim()).filter(Boolean) : [];
  const raw = editorLines.length ? editorLines : [...state.scriptSelected, ...state.customItems];
  return raw.map(stripModeTag);
}
```
這一改，`getScriptHealthReport`/`detectToneBucket`/`dedupeScriptEditor`/`sortScriptEditor` 等下游函式**完全不用動**，它們透過 `getAllScriptLines()` 自動拿到乾淨文字。（`dedupeScriptEditor`/`sortScriptEditor` 是直接讀 textarea raw value 处理，不經過 `getAllScriptLines()`，這是刻意的——帶標籤的行跟不帶標籤的同句視為不同行，不會被誤判重複，這是對的行為，不用改。）

## 待完成的實作步驟（照順序做）

### Step 1（已完成，已寫入 index.html，尚未 commit）
`state` 物件加了：
```js
fontStyle: 'ai', layoutStyle: 'random', bgStyle: 'green', beautyFilter: true,
creationMode: 'character',
```
（原本 `bgStyle: 'white'` 改成 `'green'`）

### Step 2：背景青綠色 key（未做）
- 找 `bgData` 物件（約 3353 行附近，`const bgData = { white: ..., ai: ... }`），新增 `green` key：
  ```js
  green: `## BACKGROUND\nSolid flat chroma-key green (#00C896) background.\nPure flat color, no gradient, no shadow, no texture, no scene.\nDesigned for chroma-key background removal after generation.\nEach sticker panel: 370 × 320 px (max). Full sheet (4×4): 1480 × 1280 px total.`
  ```
- 找 `function selectBg(key)`，陣列 `['white','ai']` 改成 `['white','ai','green']`。
- 找 HTML 背景選項區塊（約 1264-1268 行，`<div class="sub-label">背景</div>` 下面兩個 `.c-item`），新增第三個 `id="bg-green"` 選項，`onclick="selectBg('green')"`，設為 `class="c-item active"`（預設選中），原本 white 選項拿掉 `active`。
- 找所有 `|| 'white'`／`selectBg('white')` 的 fallback（`restoreWorkspace` 附近、`smartFillWorkspace` 附近），改成 `'green'`。
- `randomizeAll()` 裡 `selectBg(Math.random() > 0.5 ? 'white' : 'ai')` 改成三選一含 green。

### Step 3：EMOTION_CARDS 資料表（未做）
插在 `scriptTaxonomy`/`scriptSubData` 附近，24 張情緒卡（已設計好內容，直接貼）：

```js
const EMOTION_CARDS = [
  {name:'晴天霹靂', face:'瞳孔放大僵住、嘴巴張開愣住', bgFx:'背景一道誇張閃電劈下，烏雲密布，衝擊感放射線'},
  {name:'暴怒冒火', face:'眉頭緊皺、青筋浮現、咬牙切齒', bgFx:'背景熊熊火焰紋路，頭頂冒出憤怒符號'},
  {name:'狂喜尖叫', face:'雙眼發亮、嘴巴大開歡呼', bgFx:'背景撒花瓣與彩帶，閃亮星星四散'},
  {name:'社死石化', face:'表情僵硬、臉色發白、冷汗直流', bgFx:'背景出現裂痕紋路，周圍飄著虛弱的線條'},
  {name:'暖哭感動', face:'眼眶泛淚、嘴角微微上揚', bgFx:'背景柔和光暈與粉色愛心緩緩飄散'},
  {name:'傻眼無語', face:'單眼半瞇、嘴角抽動、額頭三條線', bgFx:'背景一片空白留白，只有幾條無語斜線'},
  {name:'徹底崩潰', face:'雙手抱頭、五官糾結', bgFx:'背景漩渦狀混亂線條，烏雲籠罩'},
  {name:'得意炫耀', face:'嘴角上揚、下巴微抬、雙手插腰', bgFx:'背景放射光芒與亮片，自信氛圍'},
  {name:'害羞臉紅', face:'雙頰泛紅、眼神閃避、手摀嘴', bgFx:'背景飄著粉紅泡泡與小花瓣'},
  {name:'心動小鹿', face:'雙眼變成愛心、臉頰泛紅', bgFx:'背景飄浮粉紅愛心與亮晶晶星光'},
  {name:'委屈想哭', face:'嘴角下垂、眼眶含淚、眉毛下垂', bgFx:'背景灰藍色调雨滴般的哀傷線條'},
  {name:'疲憊癱軟', face:'眼神無光、嘴巴微張、肩膀下垂', bgFx:'背景飄著幾滴汗與虛弱波浪線'},
  {name:'期待雀躍', face:'眼睛發亮、身體微微前傾', bgFx:'背景閃爍的星星與上升的氣泡'},
  {name:'感動落淚', face:'淚珠滑落、雙手合十', bgFx:'背景溫暖金黃光暈，飄落的花瓣'},
  {name:'黑人問號', face:'眉頭深鎖、頭歪一邊', bgFx:'背景漂浮著大大的問號符號'},
  {name:'尷尬冒汗', face:'笑容僵硬、單邊眉毛上揚', bgFx:'背景一滴誇張大汗珠與虛線'},
  {name:'驕傲挺胸', face:'下巴上揚、雙手叉腰、自信笑容', bgFx:'背景放射狀光芒，勳章般的裝飾感'},
  {name:'緊張冒汗', face:'眼神游移、嘴唇緊閉、額頭冒汗', bgFx:'背景密集的細汗珠與晃動線條'},
  {name:'放空發呆', face:'眼神失焦、嘴巴微張、雲朵思緒泡泡', bgFx:'背景飄著雲朵與星星，虛無縹緲感'},
  {name:'撒嬌討抱', face:'嘟嘴、雙手張開、眼神水汪汪', bgFx:'背景飄著粉色愛心與軟綿綿的雲朵'},
  {name:'用力拒絕', face:'雙手交叉擋在胸前、皺眉搖頭', bgFx:'背景出現禁止符號與斜線警示'},
  {name:'加油打氣', face:'握拳、眼神堅定、嘴角上揚', bgFx:'背景放射能量光線，火焰般的鬥志感'},
  {name:'睡意來襲', face:'眼皮下垂、打哈欠、頭往一邊倒', bgFx:'背景飄著Z字符號與月亮星星'},
  {name:'恍然大悟', face:'眼睛睜大、食指指向上方、嘴巴微張', bgFx:'背景一顆發亮的燈泡與放射線條'}
];
const EMOTION_MAP = new Map(EMOTION_CARDS.map(c => [c.name, c]));
```

### Step 4：模式切換 UI（未做）
- CSS（加在 `.script-cats` 附近）：
  ```css
  .mode-switch { display:flex; gap:8px; margin-bottom:10px; }
  .mode-btn { flex:1; padding:10px; border-radius:var(--radius); border:1px solid var(--border); background:var(--surface); cursor:pointer; font-size:13px; font-weight:600; }
  .mode-btn.active { background:var(--accent); color:#fff; border-color:var(--accent); }
  .mode-hint { font-size:11px; color:var(--text-hint); margin-bottom:10px; }
  ```
- HTML：section 5（貼圖文字腳本）的 `<div class="script-cats" id="script-cats"></div>` 上面、搜尋框上面，插入：
  ```html
  <div class="mode-switch" id="creation-mode-switch">
    <button class="mode-btn active" data-mode="character" onclick="selectCreationMode('character')">👤💬 人物＋文字</button>
    <button class="mode-btn" data-mode="emotion" onclick="selectCreationMode('emotion')">👤✨ 人物＋情緒特效</button>
    <button class="mode-btn" data-mode="text" onclick="selectCreationMode('text')">🔤 純文字主體</button>
  </div>
  <div class="mode-hint" id="creation-mode-hint">角色搭配常用文字，維持角色一致性；適合快速做主題包。</div>
  ```
- JS：
  ```js
  function selectCreationMode(mode) {
    state.creationMode = mode;
    document.querySelectorAll('#creation-mode-switch .mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    const hints = {
      character: '角色搭配常用文字，維持角色一致性；適合快速做主題包。',
      emotion: '角色表情＋背景特效演出情緒，文字可留空；適合想要更有畫面感、更吸睛的貼圖包。',
      text: '大字藝術字當主角，角色可有可無；生成最快最穩，適合快速量產測水溫。記得到「④ 字體」挑一個風格。'
    };
    document.getElementById('creation-mode-hint').textContent = hints[mode];
    clearScriptSearch();
    renderScriptCats();
    filterScripts();
    persistWorkspace();
  }
  ```

### Step 5：挑選流程分流（未做）

修改三個現有函式：

1. **`renderScriptCats()`**：函式開頭加：
   ```js
   if (state.creationMode === 'emotion') {
     document.getElementById('script-cats').innerHTML = `<div style="font-size:12px;color:var(--text-hint);padding:4px 0;">👤✨ 從下方情緒卡挑選，角色表情＋背景特效自動搭配，文字可留空</div>`;
     return;
   }
   ```
   （character/text 模式共用現有的 12 主分類渲染邏輯，不用改）

2. **`filterScripts()`**：函式開頭加：
   ```js
   if (state.creationMode === 'emotion') { renderEmotionPicker(); return; }
   ```
   在 `.s-item` 的 `sel`（是否已選中）判斷那行，改成：
   ```js
   const tagged = state.creationMode === 'text' ? `[文字] ${t}` : t;
   const sel = state.scriptSelected.includes(tagged) || state.customItems.includes(tagged);
   ```
   `onclick` 那行的 `toggleScript(${jsArg(t)})` 不用改，`toggleScript` 內部處理標籤。

3. **`toggleScript(t)`**：函式開頭改成先算標籤：
   ```js
   function toggleScript(t) {
     const tagged = state.creationMode === 'text' ? `[文字] ${t}` : t;
     const idx = state.scriptSelected.indexOf(tagged);
     const total = state.qty;
     if (idx >= 0) { state.scriptSelected.splice(idx, 1); }
     else {
       if (state.scriptSelected.length + state.customItems.length >= total) { alert(`已達 ${total} 格上限`); return; }
       state.scriptSelected.push(tagged);
     }
     filterScripts(); renderSelectedTags(); updateCounter(); updateDots();
   }
   ```

4. **新增 `renderEmotionPicker()` + `toggleEmotionCard(name)`**：
   ```js
   function renderEmotionPicker() {
     const wrap = document.getElementById('script-items');
     wrap.innerHTML = EMOTION_CARDS.map(c => {
       const tagged = `[情緒] ${c.name}`;
       const active = state.scriptSelected.includes(tagged) || state.customItems.includes(tagged);
       return `<div class="s-item${active?' active':''}" onclick='toggleEmotionCard(${jsArg(c.name)})'>
         <div class="s-name">✨ ${escHtml(c.name)}</div>
         <div class="s-type">情緒特效</div>
         <div class="c-desc">${escHtml(c.face)}｜${escHtml(c.bgFx)}</div>
       </div>`;
     }).join('');
   }
   function toggleEmotionCard(name) {
     const tagged = `[情緒] ${name}`;
     const idx = state.scriptSelected.indexOf(tagged);
     const total = state.qty;
     if (idx >= 0) { state.scriptSelected.splice(idx, 1); }
     else {
       if (state.scriptSelected.length + state.customItems.length >= total) { alert(`已達 ${total} 格上限`); return; }
       state.scriptSelected.push(tagged);
     }
     renderEmotionPicker(); renderSelectedTags(); updateCounter(); updateDots();
   }
   ```

### Step 6：`combineAll()` 依標籤分流產生 prompt（未做，最關鍵一步）

找 `combineAll()` 裡的這段（約在 "// script" 註解下面）：
```js
const allSelected = [...state.scriptSelected, ...state.customItems];
if (allSelected.length > 0) {
  const lines = [`## STICKER SCRIPT (${allSelected.length} / ${state.qty} panels)`, ''];
  allSelected.forEach((v, i) => {
    const isSilent = isNoTextScript(v);
    const detail = scriptDetail(v);
    if (isSilent) {
      lines.push(`Panel ${i+1}: NO TEXT. ...`);
    } else {
      lines.push(`Panel ${i+1}: Exact text 「${v}」. ...`);
    }
  });
  lines.push('', '## SCRIPT RULES');
  ...（既有 5 行規則）
  parts.push(lines.join('\n'));
}
```

整段改成（**untagged 分支內容跟原本一字不差**，只是包進 else 分支，確保沒用新功能的人 prompt 輸出零變化）：

```js
let usesTextHero = false, usesEmotion = false;
const allSelected = [...state.scriptSelected, ...state.customItems];
if (allSelected.length > 0) {
  const lines = [`## STICKER SCRIPT (${allSelected.length} / ${state.qty} panels)`, ''];
  allSelected.forEach((raw, i) => {
    const { mode, text: v } = parseModeTag(raw);
    if (mode === 'emotion') {
      usesEmotion = true;
      const card = EMOTION_MAP.get(v);
      if (card) {
        lines.push(`Panel ${i+1}: EMOTION+FX PANEL. Character expression: ${card.face}. Background effect (small floating FX elements around character, NOT a full-frame fill — area beyond character and FX stays on the selected background style): ${card.bgFx}. NO TEXT in this panel unless it fits naturally as a tiny accent — pure visual performance is the priority.`);
      } else {
        lines.push(`Panel ${i+1}: EMOTION+FX PANEL. Visual emotion: 「${v}」. NO TEXT in this panel — pure visual performance with matching background effect elements.`);
      }
    } else if (mode === 'text') {
      usesTextHero = true;
      lines.push(`Panel ${i+1}: TEXT-HERO PANEL. Large stylized text 「${v}」 is the dominant visual element, occupying 55-70% of panel. Character (if present in this sheet) appears small/secondary in a corner, NOT dominant — this overrides the usual character-dominant rule for this panel only. Apply the selected FONT STYLE decoration heavily here.`);
    } else {
      const isSilent = isNoTextScript(v);
      const detail = scriptDetail(v);
      if (isSilent) {
        lines.push(`Panel ${i+1}: NO TEXT. Visual emotion/pose: 「${v}」. Mood: ${detail.mood}. Action: ${detail.action}. Scene use: ${detail.scene}. ABSOLUTELY NO TEXT in this panel, zero words, pure visual expression only.`);
      } else {
        lines.push(`Panel ${i+1}: Exact text 「${v}」. Use this phrase exactly as written, no rewriting, no extra words. Mood: ${detail.mood}. Character action: ${detail.action}. Chat context: ${detail.scene}. Make the text readable, but make the character performance carry the emotion.`);
      }
    }
  });
  lines.push('', '## SCRIPT RULES');
  lines.push('Map the script line-by-line: Panel 1 uses line 1, Panel 2 uses line 2, and so on.');
  lines.push('Do NOT merge, swap, summarize, translate, or add extra text beyond the listed phrase for each panel.');
  lines.push('Every panel must have a DIFFERENT pose, expression, and gesture — NO repeated poses.');
  lines.push('Text: Traditional Chinese only (繁體中文) — stroke-perfect, immediately readable.');
  lines.push('Place each phrase inside its own panel only; text must never spill into another panel.');
  if (usesTextHero) lines.push('For TEXT-HERO panels specifically: text size rule is INVERTED — text is the dominant element (55-70%), character is secondary/small if present at all. Do not apply the usual 40%-text-cap rule to these panels.');
  else lines.push('Text occupies max 35% panel area and must not cover the face, hands, or key gesture — character remains dominant visual element.');
  if (usesEmotion) lines.push('For EMOTION+FX panels: background effect elements are small floating accents around the character (lightning bolt shape, spark burst, cloud shape, heart particles, etc.) — NOT a full opaque background fill.');
  parts.push(lines.join('\n'));
}
```

`usesTextHero`/`usesEmotion` 要宣告在 `combineAll()` 函式較前面（`if (allSelected.length > 0)` 外面），因為後面「## TEXT QUALITY RULES — ABSOLUTE PRIORITY」那段（原本寫死「character 必須是主體、text ≤40%」）要看這兩個旗標加註解，否則跟 TEXT-HERO 面板互相矛盾。找到那段 `parts.push(\`## TEXT QUALITY RULES...`，前面加條件字串：
```js
parts.push(`${usesTextHero ? 'NOTE: The default text-size ratio below applies ONLY to panels NOT marked TEXT-HERO PANEL above — those panels intentionally invert this rule.\n\n' : ''}## TEXT QUALITY RULES — ABSOLUTE PRIORITY\n...（原內容不變）`);
```

### Step 7：主圖／標籤圖 prompt 生成（未做，上架必補）

HTML：在 section 5 結束的 `</div>` 之後、`<!-- 組合輸出 -->` 之前，插入新的 section 6：
```html
<div class="section" id="cover-section">
  <div class="section-header">
    <div class="section-num">6</div>
    <div class="section-title">封面圖／標籤圖（上架必備）</div>
  </div>
  <div class="section-body">
    <p style="font-size:12px;color:var(--text-hint);margin-bottom:10px;">LINE 上架除了 16 張貼圖，還需要主圖（240×240）與標籤圖（96×74），這裡各生成一份 Prompt，用同一個角色分開請 AI 生成。</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <button class="btn-primary" id="cover-main-btn" onclick="copyCoverPrompt('main')">複製主圖 Prompt (240×240)</button>
      <button class="btn-primary" id="cover-tab-btn" onclick="copyCoverPrompt('tab')">複製標籤圖 Prompt (96×74)</button>
    </div>
  </div>
</div>
```

JS：
```js
function buildCoverPrompt(kind) {
  const first = [...state.scriptSelected, ...state.customItems][0];
  const heroText = first ? parseModeTag(first).text : '';
  const sizeSpec = kind === 'main'
    ? 'CANVAS SIZE: exactly 240 × 240 px, PNG.\nThis is the MAIN THUMBNAIL image representing the whole sticker set in the LINE store listing.\nShow the character in its most representative, appealing pose/expression — this is the cover image buyers see first.'
    : 'CANVAS SIZE: exactly 96 × 74 px, PNG, transparent background.\nThis is the TAB ICON shown in a tiny tab strip inside LINE chat — must be extremely simple and instantly recognizable even at this tiny size.\nUse a close-up of just the character face/head, minimal detail, bold clear silhouette, no text.';
  const parts = [
    `## LINE STICKER ${kind === 'main' ? 'MAIN IMAGE' : 'TAB ICON'}`,
    sizeSpec,
    '',
    '## CHARACTER',
    'Use the exact same character identity, face, hairstyle, and outfit as the uploaded reference / description used for the sticker sheet — this image must visually match the sticker set character 100%.',
    state.charTab === 'img' ? '(Character reference: uploaded photo — recreate faithfully.)' : `(Character description: ${document.getElementById('char-input')?.value.trim() || '未填寫'})`,
    '',
    '## BACKGROUND',
    bgData[state.bgStyle] || bgData.green,
    '',
    kind === 'main' && heroText ? `## OPTIONAL ACCENT\nMay include the phrase 「${heroText}」 as a small accent if it fits naturally, but the character illustration is the main focus — text is not required.` : ''
  ].filter(Boolean);
  return parts.join('\n');
}
function copyCoverPrompt(kind) {
  const text = buildCoverPrompt(kind);
  copyToClipboard(text, document.getElementById(kind === 'main' ? 'cover-main-btn' : 'cover-tab-btn'));
}
```

### Step 8：`persistWorkspace`/`restoreWorkspace` 要存 `creationMode`（未做）

`persistWorkspace()` 的 payload 物件加一行：`creationMode: state.creationMode,`
`restoreWorkspace()` 加一行：`state.creationMode = payload.creationMode || state.creationMode;`，並在還原後呼叫一次 `selectCreationMode(state.creationMode)` 或至少重新 render 一次分類列（比照 v2.6.0 已經加的「還原後同步分類列」那段，一併處理 creationMode 的 UI 同步）。

### Step 9：`process.mjs` 去背改成自動偵測 key color（未做）

檔案：`C:\AIProjects\003圖片暫存區\process.mjs`

目前 `removeWhiteBg(data, width, height, threshold=238, maxGapFill=80)` 寫死抓白色（`isWhite = data[b]>=threshold && ...`）。改法：新增自動取樣背景色的函式，取代寫死白色：

```js
function sampleBgColor(data, width, height) {
  const corners = [0, width-1, (height-1)*width, (height-1)*width + (width-1)];
  let r=0,g=0,b=0;
  for (const idx of corners) { r+=data[idx*4]; g+=data[idx*4+1]; b+=data[idx*4+2]; }
  return { r: r/4, g: g/4, b: b/4 };
}
```
把函式改名 `removeWhiteBg` → `removeKeyColorBg(data, width, height, maxGapFill=80)`，內部：
```js
const target = sampleBgColor(data, width, height);
const threshold = 42; // 色彩距離容許值，可依實測調整
const isKey = (i) => {
  const b = i*4;
  const dr = data[b]-target.r, dg = data[b+1]-target.g, db = data[b+2]-target.b;
  return Math.sqrt(dr*dr+dg*dg+db*db) < threshold;
};
```
其餘連通區塊分析（找外部背景 vs 角色內部同色小缺口）的邏輯結構不用動，只是把 `isWhite` 換成 `isKey`。呼叫端 `removeWhiteBg(data, ci.width, ci.height)` 改成 `removeKeyColorBg(data, ci.width, ci.height)`。

這樣白底、青綠底舊圖新圖都能自動適應，不用使用者手動指定顏色。

### Step 10：測試與收尾（未做）

1. 用 `node -e` 語法檢查整份 `<script>` 區塊（跟 v2.6.0 那次一樣的手法）。
2. 手動驗證資料完整性：`EMOTION_CARDS` 24 張、`bgData.green` 存在、標籤 parse 函式在 character/emotion/text 三種輸入下行為正確。
3. `npm.cmd run build && npm.cmd run lint && npm.cmd test`，全綠才算過。
4. **新增 smoke test**（`tests/smoke.test.mjs`）：
   - `creationMode: 'character'` 存在
   - `const EMOTION_CARDS = [` 存在
   - `function selectCreationMode` 存在
   - `function buildCoverPrompt` 存在
   - `bgStyle: 'green'` 是預設值
5. 版本號：這是產品功能合併（不只是分類調整），建議跳 **v2.7.0**（`index.html` 的 `<title>` 和 `.version-badge`、`package.json` 的 `version`）。
6. 存快照 `versions/貼圖line4x4咒語產生器-v2.7.0.html`。
7. 寫 `docs/development-log/V2.70.md`，更新 `README.md`「目前版本」。
8. **process.mjs 的改動要單獨測試**：拿 `003圖片暫存區` 現有的舊圖（白底）跑一次 `node process.mjs`，確認自動偵測仍然抓得到白色、輸出正常，不要因為改成「自動取樣」而讓舊圖去背變差。
9. 更新 Vault `10-專案總覽/專案索引.md` 一行摘要。
10. git commit + push（會觸發 GitHub Actions 自動部署到 GitHub Pages），push 後用 `gh run list --limit 1` 確認部署成功，`curl` 首頁確認版本號跟關鍵字串（例如 `v2.7.0`、`EMOTION_CARDS`）有出現在線上頁面。

## 已知風險/待確認事項（下個 session 要留意）

- **`003圖片暫存區/process.mjs` 不是這個 git repo 管的**（它在 `C:\AIProjects\003圖片暫存區\`，跟 `002專案進行中\貼圖line4x4咒語產生器\` 是不同資料夾）。改完後不會被這次的 commit 包含，是獨立變更，記得跟使用者說一聲，不要漏掉沒講。
- `index.html` 目前工作目錄裡有其他非本次工作的未提交修改（AGENTS.md、CLAUDE.md、docs 幾份、package.json、scripts/build-taxonomy-v3.mjs、tests/smoke.test.mjs 等），是**另一個 session**（2026-07-09 review，`docs/line-sticker-taxonomy-v3-review-20260709.md`）留下的，commit 時要分清楚哪些是這次做的、哪些是延續前次未提交的工作，不要誤判成「這次弄壞的」。建議 commit 前先 `git diff` 過一輪，確認每個檔案的變動都認得。
- 目前只完成 Step 1（`creationMode` 狀態欄位 + `bgStyle` 預設改 green），**Step 2～10 全部還沒做**。
