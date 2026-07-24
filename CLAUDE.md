# CLAUDE.md — 貼圖line4x4咒語產生器

## 共通規範

先讀 `C:\AIProjects\000AI-Vault\INDEX.md`（工作區規範、命名版本規則、環境陷阱，本檔不重複）。

## 本專案特有

- 目標：LINE 4x4 合圖貼圖咒語產生器（正式主線）。
- 技術棧：靜態 HTML + Node 建置腳本 + GitHub Actions。
- 主入口：`index.html`；部署 GitHub Pages（gxben0117-collab.github.io/line4x4-sticker-generator）。
- 指令：`npm.cmd run build` / `npm.cmd run lint` / `npm.cmd test`（PowerShell 必須用 npm.cmd）。
- 目前版本：v2.8.0（2026-07-24）大掃除版：角色改「文字輸入／依照上傳照片人物／現行角色模板」三分頁（拿掉本工具內建上傳，改成提示使用者直接在 ChatGPT 附照片）；拿掉水墨塗鴉日常女主模板與封面圖/標籤圖 Prompt；咒語大幅精簡（文字規則、負面提示詞、情緒特效/純文字主體段落都改成簡短交給模型判斷）；清掉整組沒有畫面的孤兒程式碼（服裝細項選擇器、快速套餐 grid、進階工作台、批次輸出格式切換）；index.html 從 5550 行降到約 3600 行。
- 分類規劃文件：`docs/line-sticker-taxonomy-v3.md`；V4 合一架構交接文件：`docs/project/V4_HANDOFF_三模式合一.md`。
- 產出的合圖用使用者層級 skill「process-stickers」（觸發詞「跑切圖」）切割去背；`003圖片暫存區/process.mjs` 的去背邏輯已改成自動偵測 key color（白底、青綠底皆適用），該檔不在本 repo 管轄範圍內。

## 目前狀態與下一步

- 2026-07-24（上午，修「每格咒語重複」問題）：
  使用者實際貼出兩份 16 格咒語輸出，發現 `combineAll()` 的 `## STICKER SCRIPT` 段落每一格
  都重複同一大段固定句子（一般模式：「Use this phrase exactly as written...Make the text
  readable, but make the character performance carry the emotion.」；情緒特效模式：「Character
  reacts with an exaggerated...manga/meme reaction-panel style. No text. Use your own judgment
  for the exact pose and effect details.」），16 格重複 16 次，`scriptDetail()` 又對大多數常見
  短句（沒問題、太棒了、原來如此等）回傳同一組預設 mood/action/scene，等於重複又更重複。
  改法：
  1. `scriptDetail()` 新增 `isGeneric` 旗標（`mood === GENERIC_SCRIPT_MOOD` 時為 true），
     只有真的命中特定分類（職場/戀愛/節日/迷因…等）才附加簡短 mood 提示，命中不到分類的一般
     短句（大多數熱門100句）就不再附加任何贅字。
  2. 每格咒語改成極短標籤格式：一般模式 `Panel N: 「文字」${有分類時才加 — mood}`、情緒特效
     `Panel N: [EMOTION-FX] 「情緒卡名稱」`、純文字主體 `Panel N: [TEXT-ONLY] 「文字」`、
     無字表情 `Panel N: [NO-TEXT POSE] 「文字」`。
  3. 原本每格都重複的說明句（不可改寫文字、情緒特效不寫文字、純文字不出角色…）全部搬到
     `## SCRIPT RULES` 區塊裡「只講一次」，用 `usesTextHero`/`usesEmotion`/`usesSilent` 判斷
     要不要附加對應標籤的說明段落。
  用使用者提供的兩組真實 16 句測試過：一般模式 12/16 格現在完全不加贅字、只有 4 格真正命中
  分類才加簡短 mood；情緒特效/純文字主體每格從一長句砍到 3-5 個字的標籤格式。
  補了對應測試，build/lint/test 32 項全過。
- 2026-07-24（清晨，全專案死程式碼大掃除 + 咒語內容精簡）：
  使用者要求「全專案檢查，將沒用到的功能、程式碼、咒語去除掉」。先派一個 fork 對 index.html
  做完整可達性分析（哪些 function／資料／CSS class 從使用者實際操作路徑永遠碰不到），抓出：
  服裝細項選擇器（`outfitData` 巨大表＋`initOutfitGrid`/`openOutfitCat`/`selectOutfitMode` 等）、
  快速套餐 grid picker（`initPresets`/`renderPresetGrid`/`applyPreset` 等，`presets` 陣列本身和
  `guessPresetForTemplate()`/`updatePresetStatus` 仍在用，保留）、色票選擇 UI（`initColorSwatches`
  從未被呼叫過）、`selectBeauty()`（零呼叫者）、`randomizeAll()`（零呼叫者，整個「隨機套用全部」
  按鈕不存在）、整組「進階工作台」（`renderTemplateGroupPanel`/`setWorkspaceMode`/
  `toggleAdvancedSettings`/`smartFillWorkspace`/`autoBalanceScriptPack`/`applyRecommendedTemplate`
  彼此零呼叫、`getAdvancedSections()` 寫死回傳 `[]`）、輸出格式切換條與單一格式預覽/複製
  （`setOutputFormat`/`renderOutputFormatToolbar`/`previewBatchOutput`/`copyBatchOutput`）。
  **抓到一個真的會咬人的地雷**：`combineAll()` 開頭 `if (state.batchMode === 'all')` 會整個繞過
  這幾輪優化過的完整咒語，改走過時的精簡/JSON輸出；`restoreWorkspace()` 讀 `batchMode`/`outputFormat`
  完全沒驗證，舊 localStorage 存檔理論上能觸發。已整條拿掉 `batchMode==='all'` 分支與相關的
  `buildBatchOutputs`/`buildPromptFromFormat` compact＋json／`previewAllBatchOutputs`／
  `copyAllBatchOutputs`，`combineAll()` 現在永遠只輸出完整咒語，徹底解除這個地雷。
  同步清掉相應的孤兒 CSS（`.preset-dock`／`.workflow-strip`／`.smart-card`／`.workspace-card`／
  `.summary-kpi`／`.pill-btn`／`.advanced-pill`／`.template-card`／`.batch-card`／`.group-card`／
  `.outfit-tag` 等，`.combo-card`/`.fix-card`/`.preview-snippet`/`.workspace-actions` 因為仍被
  `renderScriptComboPanel`/`renderFixSuggestionPanel` 使用而保留）與相應的 state 欄位
  （`outputFormat`/`batchMode`/`batchPreviewFormat`/`workspaceMode`/`advancedSettingsVisible`/
  `colorSelections`/`customColors`/`outfitSelections`/`beautyFilter`，這些現在無讀無寫，直接砍）。
  index.html 從這個 session 開始時的 5550 行，經過這一連串清理後剩 3600 行。
  build/lint/test 32 項全過（新增測試覆蓋這次的移除範圍）。

  **同一輪也依使用者三個回饋調整咒語內容**（核心原則：對 GPT Image/Flux/SDXL 這類模型，過度
  精確描述反而吃 token、降低遵循率，改成「講重點，剩下交給模型判斷」）：
  1. TEXT QUALITY RULES 從約 30 行的 FORBIDDEN/REQUIRED 條列砍到 2 段話；NEGATIVE PROMPT 從
     約 39 個「no X」項目砍到約 17 個、統一成單一區塊（原本 isReal/else 各自重複一份，改成
     用三元運算子插入差異句）。
  2. 「人物＋情緒特效」實測後使用者反饋出圖跟一般圖沒兩樣：不再逐字塞入 EMOTION_CARDS 的
     `face`/`bgFx` 細節描述，改成極簡一句「Character reacts with an exaggerated「情緒卡名稱」-style
     expression...Use your own judgment for the exact pose and effect details.」，直接讓
     ChatGPT 自己詮釋「晴天霹靂」「石化」這類詞的視覺效果，不寫死五官與背景特效機械式描述。
  3. 「純文字主體」使用者測試後決定不要角色小圖了（推翻上一輪「角色一定要出現 5-10%」的決定），
     改成 100% 純文字、無角色，走美術字/海報排版風格，同樣改成極簡指令＋「Use your own judgment」。
     `combineAll()` 對應把 `usesEmotion` 變數整個拿掉（改法後沒有讀取端了）。
  三個模式的 UI 提示文字（`creation-mode-hint`）也同步改了說法。
- 2026-07-24（凌晨，修正圖片上傳的移除方向 + 精簡狀態指示與咒語）：
  **修正**：使用者澄清「拿掉圖片上傳」原意是拿掉「上傳照片到這個工具」的機制，不是拿掉「依照
  上傳照片人物」這個角色來源選項——實際流程是使用者事後直接在 ChatGPT 對話框把照片和咒語一起貼上，
  這個工具只需要負責在咒語裡正確下指令。已恢復角色區塊的「依照上傳照片人物」分頁（`tab-img`，
  無 dropzone/file-input，只有說明文字＋非必填的「補充五官/服裝備註」欄位 `char-img-note`），
  `combineAll()` 對應恢復 ABSOLUTE PRIORITY/IDENTITY LOCK/HAIR LOCK 與 COSTUME LOCK 段落，
  文字改成「使用者會在這個 ChatGPT 對話裡附上照片」的措辭，不再講「上傳到本工具」。
  切到這個分頁會自動把服裝模式同步成「沿用參考造型」，切離則同步回「AI 自動選服裝」
  （`switchCharTab()` 內建同步邏輯，取代原本孤兒的 `selectOutfitMode()`）。
  **狀態指示精簡**：畫面下方的設定完成度圓點（status-dots）逐一核對後，「服裝風格」「色系」
  「構圖」「美顏」這四個完全沒有對應可操作介面（相關 UI 從沒掛到畫面上），已從 `dotLabels`
  拿掉，只留「角色描述／貼圖數量／比例風格／字體／背景／腳本」六個跟畫面上真實存在的控制項對應。
  **咒語同步精簡**：`combineAll()` 移除了「FACE BEAUTY FILTER」（美顏濾鏡永遠是同一段固定文字，
  沒有開關可調）與「OUTFIT COLOR PALETTE」（色系永遠是「AI 自動決定」，沒有色票可選）兩個區塊；
  服裝段落簡化成兩種狀態：`依照上傳照片人物` → COSTUME LOCK — Reference Photo，其餘 → AI 自動選服裝
  （拿掉了原本永遠不會被用到的「手動選服裝細項＋隨機補款」分支，那段仰賴的 `outfitData` 巨大服裝
  細項表本身也是孤兒資料，這次沒有連著刪，只是不再被 `combineAll()` 引用）。
  補了對應測試（`local image upload UI stays removed...`／`status dots only list...`／
  `generated prompt drops settings with no on-screen control...`），build/lint/test 32 項全過，
  並用 `npx serve .` + curl 驗證實際頁面內容正確。
  **這次仍沒動、記錄下來的孤兒 UI**（都是「寫好邏輯但沒掛到畫面」同一種模式，非本輪要求範圍）：
  1. `outfitData`（服裝細項描述表）＋整組分類/細項選擇 function（`initOutfitGrid`/`openOutfitCat`/
     `toggleOutfitItem`/`renderOutfitTags`/`selectOutfitMode` 等）——`combineAll()` 已經不再依賴它們，
     純粹是未串接的死程式碼。
  2. `presets` 陣列背後的「快速套餐」grid picker（`initPresets`/`renderPresetGrid`/`applyPreset`/
     `ensurePresetTargetCount` 等）——`presets` 陣列本身仍在用（`guessPresetForTemplate()` 會讀取，
     是現行角色模板套用流程的一部分），但點選套餐的畫面本身沒有掛上去。
  3. `randomizeAll()`（隨機套用全部設定）整個函式沒有任何按鈕連到它。
  4. 細部「身型畫風」grid（`initBodyUI`/`body-cats`/`body-ratio-grid`）——目前人物造型只有
     Q版／真實人物二選一，更細的畫風分類（水彩、油畫、全息等近 30 種）沒有對應畫面。
- 2026-07-24（凌晨，接續移除圖片上傳後）：移除「水墨塗鴉日常女主」角色模板：
  這個模板（`characterTemplates` id `daily-ink-doodle`）的角色描述整段建立在「上傳參考圖」上
  （「以上傳參考圖人物作為主角，臉部相似度約80%」），圖片上傳分頁拿掉後這段話變成指向不存在
  的東西，使用者直接決定整個模板不要了。移除範圍：`characterTemplates` 該筆、`templateGroups.daily`
  裡的引用、`scriptQuickCombos` 的 `ink-doodle-daily`（水墨日常範例包）、`guessPresetForTemplate`/
  `guessComboForTemplate` 裡對應這個模板 id 的特殊規則、`applyCharacterTemplate()` 裡整段模板專屬設定
  （其中還連到已經是孤兒 id 的 `out-img-mode`/`outfit-manual` 等元素，一併清掉）。
  **保留**：一般「水墨塗鴉」畫風選項（`inkdoodle` body style）、「水墨手寫」字體選項——這兩個是
  獨立於該模板的一般風格選擇，不依賴任何上傳圖片，繼續可用；`combineAll()` 裡原本判斷
  `isInkDoodleExample`（模板 id 或畫風皆觸發）改成只看畫風，變數改名 `isInkDoodleStyle`；
  對應的 prompt 區塊標題從「REFERENCE STYLE LOCK — INK DOODLE DAILY STICKER EXAMPLE」改成
  「INK DOODLE STYLE LOCK」，拿掉「80% facial similarity to the uploaded reference image」這句，
  其餘畫風描述（日系手繪、半身構圖、水墨濺色裝飾元素等）維持給選這個畫風的人使用。
  `presets` 陣列裡的通用預設 `ink-doodle-daily-girl`（水墨手繪日常女主，body/font/color 組合）
  沒有動——它不隸屬 `characterTemplates`，本身不假設任何上傳圖片，是跟其他 ~30 個通用預設一樣的
  獨立條目，只拿掉了把它跟已刪模板綁在一起的那條 override 規則。
  補了對應測試（`ink doodle daily template stays removed`），build/lint/test 30 項全過，
  用 `npx serve .` + curl 確認實際頁面沒有殘留「水墨塗鴉日常女主」/`daily-ink-doodle` 字樣。
  **還沒處理**：整組「服裝細項選擇」UI（`outfitData` 分類網格等）仍是孤兒功能，上次記錄下來但
  這次使用者只確認要拿掉水墨塗鴉模板，服裝 UI 的去留還沒問過。
- 2026-07-24（凌晨）：移除「圖片上傳」角色分頁：
  使用者確認「沒這功能」，整個分頁拿掉，角色區塊只剩「文字輸入」＋「現行角色模板」。
  移除範圍：HTML（`tab-img`、`char-img-panel`、dropzone/preview/file-in）、CSS（`.dropzone`
  系列、`#preview-img`、連帶變成孤兒的 `dropGlow`/`floatIcon`/`spin` keyframes）、JS
  （`handleFile`/`handleDrop`/`clearImg`、`state.imgBase64`/`imgType`/`imgDesc`、
  `combineAll()` 裡整組「用照片鎖定五官」的 ABSOLUTE PRIORITY/IDENTITY LOCK/HAIR LOCK 分支、
  `buildPromptFromFormat()`/`updateDots()` 裡的 `charTab==='img'` 判斷）；`state.charTab`
  預設從 `'img'` 改成 `'text'`；`restoreWorkspace()` 對舊 localStorage 存檔（charTab 可能還是
  `'img'`）會安全退回文字分頁，不會壞掉。
  **順手修的連帶 bug**：`state.outfitRef` 預設是 `true`（服裝沿用「參考上傳圖」），這個模式的
  咒語內容是「Base the outfit DIRECTLY on the uploaded reference image」——但角色一律用文字輸入後，
  這句話變成連結不到任何實際圖片、根本沒意義的指令。已把預設改成 `outfitRef: false, outfitAI: true`
  （AI 自動選服裝）。
  **發現但沒動、需要之後決定的東西**：
  1. 「水墨塗鴉日常女主」模板（`daily-ink-doodle`）的角色描述文字寫死「以上傳參考圖人物作為主角，
     臉部相似度約 80%」——這個模板的整個設計前提就是要有上傳的參考照片，現在圖片上傳拿掉了，
     套用這個模板送出的咒語會出現「請參考上傳圖片」但其實沒有圖片可參考的矛盾。`applyCharacterTemplate()`
     裡套用這個模板時仍會把 `state.outfitRef` 設回 `true`（同樣的「沿用上傳圖服裝」問題）。
  2. 審查時發現整組「服裝細項選擇 UI」（`outfitData` 分類網格、`selectOutfitMode`/`toggleOutfitRef`/
     `toggleOutfitAI`、`out-ref`/`out-manual-mode`/`outfit-manual`/`outfit-main-grid` 等）完全沒有掛到
     畫面上——跟先前清過的 AI 圖片分析、封面圖／標籤圖是同一種「寫好但沒接 UI」模式，這次沒動，
     只是記錄下來。
  補了對應測試（`image upload feature stays removed`），build/lint/test 30 項全過，並用
  `npx serve .` + curl 確認實際 HTML 回應裡真的沒有上傳相關元素、`charTab` 預設確實是 text。
- 2026-07-24（更深夜）：縮短咒語長度 + 調整「人物＋文字」模式比例為 50/50：
  應使用者要求「咒語字數過多」，對 `combineAll()` 裡最冗贅的區塊做語意不變的壓縮
  （把逐行重複的「Preserve original X」「Keep original X」「No crossing X」「No cropped X」
  類條列合併成單句，移除跟 CHARACTER CONSISTENCY 完全重疊的獨立 STYLE LOCK 區塊）：
  STICKER SHEET SIZE/PANEL SPACING/ANTI-CONTAMINATION/SAFE AREA、IDENTITY LOCK/HAIR LOCK、
  CHARACTER CONSISTENCY、COSTUME LOCK、FACE BEAUTY FILTER、TEXT QUALITY 的 FORBIDDEN/REQUIRED
  清單、COMPOSITION & DYNAMIC RULES、NEGATIVE PROMPT 尾段，實測這些區塊合計從 8162 字元
  減到 5891 字元（約 -28%）。
  同時使用者確認「人物＋文字」模式比例要改成人物/文字約各 50%（原本是角色 55%／文字 35%／
  裝飾 10%，文字上限 40%），已同步改掉 `TEXT QUALITY RULES` 的 FONT SIZE 規則與 SCRIPT RULES
  裡的對應文字，UI 模式提示（`creation-mode-hint` 預設文字 + `selectCreationMode()` 裡的 hints
  物件）也一併更新为 50/50 說法；「情緒特效」模式提示文字從「文字可留空」改成「不放文字」更精確；
  「純文字主體」模式維持上一輪「角色一定要出現」的決定，並補上具體比例（約 5-10%）避免和
  「人物＋文字」的說法混淆。
  build/lint/test 30 項全過。
  下一步：若還要再縮，`bodyRatioData`/`bodyData`/`fontData`/`layoutData`/`bgData` 這幾個依選項
  切換的資料表還沒動過，是下一輪可壓縮的目標；另外 script 段落長度會隨腳本行數（最多 16 行）
  線性增加，這部分是必要內容、非重複贅字，通常不建議壓縮。
- 2026-07-24（深夜）：修「模式切換」相關 bug + 強化「純文字主體」角色一定要出現：
  發現 `🎲 隨機填入`／`🎲 從目前清單隨機選`／`補滿 16 句` 三個按鈕完全沒判斷 `state.creationMode`，
  永遠從一般文字句庫抓句子——導致「人物＋情緒特效」模式下按隨機，選進來的其實是普通文字、不是情緒卡。
  新增 `getRandomFillPool()` 統一依模式回傳對應（且已標好 `[情緒]`/`[文字]` 標籤的）選項池，三個按鈕
  改呼叫它；同時「快速套用組合包」面板也改用 `comboCreationMode(combo) === state.creationMode` 篩選，
  情緒特效模式下只會顯示 `emotion-fx` 這組，其餘 18 組（純文字系）暫時隱藏（等未來有 `[文字]` 標籤的
  快速包才會出現在純文字主體模式）。
  「純文字主體」模式使用者確認維持「16 格皆可為大字」的原始設計，但要求角色一定要出現——原本
  prompt 寫「Character (if present in this sheet)」是選擇性用語，且 `char-input` 留空時會送出
  「（未填寫）」這種對 AI 沒意義的字串，兩者疊加就是「整張只有大字、完全沒角色」的根因。已改成
  TEXT-HERO 相關兩處 prompt 明確要求「角色一定要出現、只是縮小放角落」，並把空白角色描述的 fallback
  換成一段具體可畫的預設角色描述，不再送出「未填寫」。
  補了 4 個對應測試，build/lint/test 30 項全過，並用 `npx serve .` + curl 驗證新程式碼確實有出現在
  實際回應內容裡。
  下一步：如果之後要讓「純文字主體」模式的快速套用組合包也有得選，需要新增幾組 `[文字]` 標籤的
  scriptQuickCombos。
- 2026-07-24（晚）：依使用者指定主題新增 5 組快速文字腳本包，並移除「⑥ 封面圖／標籤圖」區塊：
  新增 `greeting-daily`（打招呼＋日常生活用語）／`workplace-common`（職場常用）／
  `couple-daily`（情侶生活用語）／`emotion-words`（情緒用語）／`emotion-fx`（情緒特效，
  16 行皆帶 `[情緒] ` 標籤、直接對應 EMOTION_CARDS 卡名，套用後會自動把 `state.creationMode`
  切成 emotion，新增 `comboCreationMode()` 判斷輔助函式）；連同上一輪的 5 組共 19 組快速包。
  移除「封面圖／標籤圖」整節（`cover-section`、`buildCoverPrompt`/`copyCoverPrompt`）——
  使用者決定：16 張貼圖之一即可取代主圖/標籤圖用途，不需要獨立 Prompt 產生器；
  status-dots 進度指示與這節無關，確認移除不影響其他區塊。
  補了對應測試（新 5 包內容完整性、emotion-fx 標籤與卡名比對、封面區塊不回歸），
  build/lint/test 26 項全過，並用 `npx serve .` 起本機伺服器 curl 驗證實際輸出內容正確。
- 2026-07-24（下午）：Claude 重新設計「⑤ 貼圖文字腳本」區塊 UX：
  發現 `scriptQuickCombos`（9 組現成 16 句快速組合包）、`renderScriptComboPanel()`／
  `renderFixSuggestionPanel()`（健康度檢查：重複句/過短/過長/語氣太集中）等功能早就寫好，
  但對應的 DOM 容器（`scriptComboPanel`／`fixSuggestionPanel`）從未掛載到畫面上，使用者只能
  一句一句手動點選 16 句，這是「很不好用」的主因；同時發現 `restoreWorkspace()` 會用另外存的
  `payload.scriptEditor` 字串覆蓋 textarea，但這欄位在第一次造訪時從未被同步，導致新使用者
  首次打開時 textarea 顯示空白、但計數器卻顯示「已選 16/16」的矛盾——已移除這個重複來源，
  改成統一由 `renderSelectedTags()` 依 state 陣列同步。
  UI 改動：在分類/搜尋上方新增「⚡ 快速套用組合包」橫向捲動卡片區（套用/加到目前腳本兩個按鈕），
  在編輯器工具列下方新增健康度檢查面板；區塊改用既有但未套用的 `.script-layout`/`.script-pane`/
  `.script-editor-pane.editor-sticky` class 取代原本大量 inline style。
  另新增 5 組新的快速組合包（`couple-flirty` 戀愛放閃／`pet-parent` 貓奴狗奴寵物／
  `binge-lazy` 追劇耍廢迷因／`broke-humor` 月光荷包警報／`meme-comeback` 廢文迷因嘴砲），
  皆取材自既有 `scriptData` 句庫，16 句零重複、單句 ≤6 字。
  補了 3 個對應測試，build/lint/test 25 項全過。未做瀏覽器實際點擊測試（環境無現成 headless
  browser，未安裝 Playwright），已用 `npx serve .` 起本機伺服器確認實際 HTTP 回應含新內容。
  下一步：建議實際在瀏覽器跑一次「套用這組」流程確認視覺效果；若要看其他也被埋起來的功能
  （模板分組摘要、輸出格式 full/compact/json 切換等，同樣有 render 函式但沒掛容器），可以之後再挖。
- 2026-07-24（上午）：Claude 做了一次咒語邏輯／UX 審查與修 bug：
  修掉 `combineAll()` 中「固定寫死白底 JPG」與 `bgData[state.bgStyle]`（預設青綠去背）互相矛盾的輸出指令；
  修掉套用「水墨塗鴉」模板後背景按鈕（bg-white / bg-green）視覺狀態不同步於 `state.bgStyle` 的問題；
  移除從未真正可用的「AI 分析五官特徵」死功能（`analyzeImage()`、`getApiKey`/`setApiKey`、
  重複的第二套「AI IMAGE WORKFLOW」模組、對應 `.ai-*` CSS 約 150 行）——UI 上從無設定 API Key 的入口，
  使用者上傳圖片後永遠卡在「請先在設定輸入 Anthropic API Key」；同步更新 `scripts/lint.mjs` 與
  `tests/smoke.test.mjs`（新增「dead AI image-analysis feature stays removed」測試取代舊的 API config 測試）。
  build/lint/test 22 項全過。
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
