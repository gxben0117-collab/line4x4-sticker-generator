import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const { version } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const CURRENT_VERSION = `v${version}`;

function extractConstArray(html, constName, nextToken) {
  const start = html.indexOf(`const ${constName} = [`);
  const end = html.indexOf(nextToken, start);
  assert.ok(start >= 0 && end > start, `${constName} block must exist`);
  return new Function(`${html.slice(start, end)}; return ${constName};`)();
}

function extractScriptData(html) {
  const start = html.indexOf("const scriptData = {");
  const end = html.indexOf("const allCats", start);
  assert.ok(start >= 0 && end > start, "scriptData block must exist");
  return new Function(`${html.slice(start, end)}; return scriptData;`)();
}

function extractScriptTaxonomy(html) {
  const start = html.indexOf("const scriptTaxonomy = [");
  const end = html.indexOf("const hotFirst", start);
  assert.ok(start >= 0 && end > start, "scriptTaxonomy block must exist");
  return new Function(`${html.slice(start, end)}; return scriptTaxonomy;`)();
}

function extractEmotionCards(html) {
  const start = html.indexOf("const EMOTION_CARDS = [");
  const end = html.indexOf("const EMOTION_MAP", start);
  assert.ok(start >= 0 && end > start, "EMOTION_CARDS block must exist");
  return new Function(`${html.slice(start, end)}; return EMOTION_CARDS;`)();
}

function extractModeTagHelpers(html) {
  const start = html.indexOf("function stripModeTag");
  const end = html.indexOf("function selectCreationMode", start);
  assert.ok(start >= 0 && end > start, "mode tag helpers must exist");
  return new Function(`${html.slice(start, end)}; return { stripModeTag, parseModeTag };`)();
}

test("main html has expected title version", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes(CURRENT_VERSION));
});

test("page title uses new project name", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("LINE 貼圖 4×4 咒語產生器"));
  assert.ok(!html.includes("紅兵 LINE 貼圖咒語產生器"), "old project name should not appear in title");
});

test("historical versions are preserved", async () => {
  const files = await readdir("versions");
  assert.ok(files.includes("紅兵LINE貼圖咒語產生器-v1.5.7.html"));
  assert.ok(files.includes("紅兵LINE貼圖咒語產生器-v1.5.8.html"));
  assert.ok(files.includes("紅兵LINE貼圖咒語產生器-v1.5.9.html"));
  assert.ok(files.includes("紅兵LINE貼圖咒語產生器-v1.5.10.html"));
  assert.ok(files.includes("紅兵LINE貼圖咒語產生器-v1.5.11.html"));
  assert.ok(files.includes("紅兵LINE貼圖咒語產生器-v1.5.12.html"));
  assert.ok(files.includes("紅兵LINE貼圖咒語產生器-v2.0.8.html"));
  assert.ok(files.includes("貼圖line4x4咒語產生器-v2.0.7.html"));
  assert.ok(files.includes("貼圖line4x4咒語產生器-v2.0.8.html"));
});

test("build output exists after build", async () => {
  const html = await readFile("dist/index.html", "utf8");
  assert.ok(html.includes(CURRENT_VERSION));
});

test("V3 taxonomy, hot-100 and script search exist", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("const scriptTaxonomy = ["), "V3 taxonomy data must exist");
  assert.ok(html.includes("const HOT_SENTENCES = ["), "hot-100 list must exist");
  assert.ok(html.includes("currentCat: '熱門100'"), "hot-100 must be the default category");
  assert.ok(html.includes('id="script-search"'), "script search input must exist");
  assert.ok(html.includes("const scriptSubData = {}"), "sub-category data must be derived");
  assert.ok(!html.includes("�"), "no mojibake characters in data");
});

test("V3 script taxonomy is internally consistent", async () => {
  const html = await readFile("index.html", "utf8");
  const scriptData = extractScriptData(html);
  const hotSentences = extractConstArray(html, "HOT_SENTENCES", "const HOT_SET");
  const taxonomy = extractScriptTaxonomy(html);

  assert.equal(hotSentences.length, 100, "hot list should be exactly 100 sentences");
  assert.equal(new Set(hotSentences).size, 100, "hot list should not contain duplicates");

  const allSentences = new Set(Object.values(scriptData).flat());
  const missingHot = hotSentences.filter((line) => !allSentences.has(line));
  assert.deepEqual(missingHot, [], "hot sentences must exist in scriptData");

  const mappedCats = new Set(
    taxonomy.flatMap((main) => main.subs.flatMap((sub) => sub.cats)),
  );
  const missingCats = Object.keys(scriptData).filter((cat) => !mappedCats.has(cat));
  const staleCats = [...mappedCats].filter((cat) => !scriptData[cat]);
  assert.deepEqual(missingCats, [], "all old scriptData categories must map to V3 taxonomy");
  assert.deepEqual(staleCats, [], "V3 taxonomy should not reference missing old categories");

  assert.equal(taxonomy[0].name, "熱門100", "hot-100 should remain first");
  assert.equal(taxonomy.at(-1).name, "特殊主題", "low-priority special topics should remain last");
});

test("V4: three creation modes (character/emotion/text) are merged into one tool", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("creationMode: 'character'"), "creationMode must default to character (backward compatible)");
  assert.ok(html.includes('id="creation-mode-switch"'), "mode switch UI must exist");
  assert.ok(html.includes("function selectCreationMode"), "mode switch handler must exist");
  assert.ok(html.includes("const EMOTION_CARDS = ["), "emotion card data must exist");
  assert.ok(html.includes("function renderEmotionPicker"), "emotion picker must exist");
  assert.ok(html.includes("function toggleEmotionCard"), "emotion card toggle must exist");
  assert.ok(html.includes("mode === 'emotion'"), "combineAll must branch for emotion-mode panels");
  assert.ok(html.includes("mode === 'text'"), "combineAll must branch for text-hero-mode panels");
});

test("cover/tab image prompt section stays removed (one of the 16 panels substitutes)", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(!html.includes('id="cover-section"'), "cover/tab image section must not come back");
  assert.ok(!html.includes("function buildCoverPrompt"), "cover/tab prompt builder must not come back");
});

test("V4: emotion card data is well-formed and unique", async () => {
  const html = await readFile("index.html", "utf8");
  const cards = extractEmotionCards(html);
  assert.ok(cards.length >= 20, "should have a healthy spread of emotion cards");
  assert.equal(new Set(cards.map((c) => c.name)).size, cards.length, "emotion card names must be unique");
  for (const card of cards) {
    assert.ok(card.face && card.face.length > 0, `card "${card.name}" must have a face description`);
    assert.ok(card.bgFx && card.bgFx.length > 0, `card "${card.name}" must have a background FX description`);
  }
});

test("V4: mode tag parsing is backward compatible and correctly tagged", async () => {
  const html = await readFile("index.html", "utf8");
  const { stripModeTag, parseModeTag } = extractModeTagHelpers(html);
  assert.deepEqual(parseModeTag("早安"), { mode: "character", text: "早安" }, "untagged lines must default to character mode");
  assert.deepEqual(parseModeTag("[情緒] 晴天霹靂"), { mode: "emotion", text: "晴天霹靂" });
  assert.deepEqual(parseModeTag("[文字] 早安"), { mode: "text", text: "早安" });
  assert.equal(stripModeTag("[情緒] 晴天霹靂"), "晴天霹靂");
  assert.equal(stripModeTag("早安"), "早安", "stripModeTag must be a no-op on untagged lines");
});

test("background options are white/AI only (green chroma-key removed)", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("bgStyle: 'white'"), "bgStyle must default to white");
  assert.ok(!html.includes('id="bg-green"'), "green background option must not exist in the UI");
  assert.ok(!html.includes("selectBg('green')"), "no control should be able to select the removed green option");
  assert.ok(!html.includes("chroma-key green"), "chroma-key green background prompt text must be gone");
});

test("workflow shell and navigation helpers are present", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("jumpToSection('script-section')"));
  assert.ok(html.includes("jumpToSection('combine-section')"));
});

test("preset and script workspace still exists", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes('id="script-section"'));
  assert.ok(html.includes('id="script-edit-area"'));
  assert.ok(html.includes("script-editor-status"));
  assert.ok(html.includes("fillScriptToSlots"));
  assert.ok(html.includes("dedupeScriptEditor"));
  assert.ok(html.includes("sortScriptEditor"));
  assert.ok(html.includes("blendToneScriptEditor"));
  assert.ok(html.includes("rebuildBalancedPack"));
});

test("script editor UI is optimized for 4x4 production", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("script-workflow"));
  assert.ok(html.includes("一行一張貼圖"));
  assert.ok(html.includes("補滿 16 句"));
  assert.ok(html.includes('id="copy-script-btn"'));
  assert.ok(html.includes("copyToClipboard(ta.value.trim(), document.getElementById('copy-script-btn'))"));
});

test("output is locked to 4x4 only", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("4×4 固定輸出"));
  assert.ok(html.includes("固定輸出 4×4"));
  assert.ok(html.includes("4×4 (16 panels)"));
  assert.ok(!html.includes("id=\"qty-1\""));
  assert.ok(!html.includes("id=\"qty-4\""));
  assert.ok(!html.includes("id=\"qty-9\""));
});

test("template and output logic exists", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("const templateGroups = ["));
  assert.ok(html.includes("const characterTemplates = ["));
  assert.ok(html.includes("const scriptQuickCombos = ["));
  assert.ok(html.includes("'daily-life-1'"), "daily-life-1 combo must exist");
  assert.ok(html.includes("'daily-life-2'"), "daily-life-2 combo must exist");
  assert.ok(html.includes("'daily-life-3'"), "daily-life-3 combo must exist");
  assert.ok(html.includes("id === 'daily-life-1'"), "default combo preset must apply daily-life-1");
  assert.ok(html.includes("function applyCharacterTemplate(templateId)"));
  assert.ok(html.includes("function fillScriptToSlots()"));
  assert.ok(html.includes("function copyScriptEditor()"));
  assert.ok(html.includes("function persistWorkspace()"));
  assert.ok(html.includes("function restoreWorkspace()"));
});

test("dead AI image-analysis feature stays removed", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(!html.includes("getApiKey"), "no-op API key helpers must not come back without a real settings UI");
  assert.ok(!html.includes("api.anthropic.com"), "unwired Anthropic fetch calls must not come back");
});

test("workspace storage key uses new project namespace", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("line4x4-sticker-workspace"));
  assert.ok(!html.includes("codex-sticker-workspace"), "old storage key must be gone");
});

test("script output rules keep text usable for sticker generation", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("Map the script line-by-line"), "script must map line by line");
  assert.ok(html.includes("no merging, swapping, summarizing, translating"));
  assert.ok(html.includes("do not cover the face"));
});

test("script editor warns when sticker text is too long", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("line.length >= 7"), "7+ character lines should be flagged");
  assert.ok(html.includes("7 字以上建議縮短"), "editor status should warn about long sticker text");
  assert.ok(html.includes("建議將 7 字以上句子縮成 4-6 字"));
  assert.ok(html.includes(".script-editor-status.warn"));
});

test("local image upload UI stays removed, but the 'paste photo in ChatGPT' character mode still exists", async () => {
  const html = await readFile("index.html", "utf8");
  // No local upload/preview mechanics — the photo is attached directly in ChatGPT, not this tool.
  assert.ok(!html.includes('id="dropzone"'), "character dropzone must not come back");
  assert.ok(!html.includes('id="preview-wrap"'), "preview wrapper must not come back");
  assert.ok(!html.includes('id="file-in"'), "file input must not come back");
  assert.ok(!html.includes("function handleFile"), "handleFile must not come back");
  // The character-mode tab itself is intentional: it flags the prompt to expect a photo pasted into ChatGPT.
  assert.ok(html.includes('id="tab-img"'), "the '依照上傳照片人物' character tab must exist");
  assert.ok(html.includes('id="char-img-note"'), "optional supplementary-notes field for the photo mode must exist");
  assert.ok(html.includes("attach a reference photo directly in this ChatGPT conversation"), "the img-mode prompt must describe pasting the photo into ChatGPT, not uploading to this tool");
});

test("cinematic hero UI is present", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("hero-particles"), "hero particles must be present");
  assert.ok(html.includes("hero-eyebrow"), "hero eyebrow must be present");
  assert.ok(html.includes("btn-hero"), "hero CTA button class must be present");
  assert.ok(html.includes("hero-actions"), "hero actions container must be present");
});

test("ink doodle daily template stays removed (photo-dependent, no upload feature anymore)", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(!html.includes("daily-ink-doodle"), "the removed character template must not come back");
  assert.ok(!html.includes("id: 'ink-doodle-daily',"), "the removed quick-pack combo must not come back");
  assert.ok(!html.includes("The main character should keep about 80% facial similarity"), "photo-dependent facial-similarity instruction must not come back");
  // The general ink-doodle art style (independent of the removed template) is still a valid choice.
  assert.ok(html.includes("inkdoodle"), "the general ink-doodle body style option must still exist");
  assert.ok(html.includes("水墨手寫"), "the general ink-brush font option must still exist");
  assert.ok(html.includes("isInkDoodleStyle"), "the ink-doodle style flag must be keyed off body style, not the removed template");
});

test("script section quick-pack and health-check panels are mounted", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes('id="scriptComboPanel"'), "quick-pack combo panel must be mounted in the script section");
  assert.ok(html.includes('id="fixSuggestionPanel"'), "script health-check panel must be mounted in the script section");
  assert.ok(html.includes("renderScriptComboPanel();"), "combo panel must be rendered on init");
  assert.ok(html.includes("renderFixSuggestionPanel();"), "fix suggestion panel must be rendered on init");
  assert.ok(html.includes("renderSelectedTags();"), "textarea must be synced from selected/custom items on init");
});

test("workspace restore no longer double-sources the script textarea", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(!html.includes("payload.scriptEditor"), "restore must derive the textarea from customItems/scriptSelected, not a separately-saved raw string");
});

test("scriptQuickCombos: every pack has exactly 16 unique, sticker-length lines", async () => {
  const html = await readFile("index.html", "utf8");
  const combos = extractConstArray(html, "scriptQuickCombos", "\n\n// ── RANDOM CHAR DESC");
  assert.ok(combos.length >= 14, "at least the 9 original + 5 new quick packs must exist");
  const ids = combos.map((c) => c.id);
  assert.strictEqual(new Set(ids).size, ids.length, "combo ids must be unique");
  for (const combo of combos) {
    assert.strictEqual(combo.lines.length, 16, `${combo.id} must have exactly 16 lines`);
    assert.strictEqual(new Set(combo.lines).size, 16, `${combo.id} must not contain duplicate lines`);
    for (const line of combo.lines) {
      const text = line.replace(/^\[(情緒|文字)\]\s*/, "");
      assert.ok(text.length <= 6, `${combo.id} line "${line}" should stay within the 6-char sticker-text guideline`);
    }
  }
  for (const id of ["couple-flirty", "pet-parent", "binge-lazy", "broke-humor", "meme-comeback", "greeting-daily", "workplace-common", "couple-daily", "emotion-words", "emotion-fx"]) {
    assert.ok(ids.includes(id), `new quick pack "${id}" must be present`);
  }
  const emotionCombo = combos.find((c) => c.id === "emotion-fx");
  const emotionCards = extractConstArray(html, "EMOTION_CARDS", "\nconst EMOTION_MAP");
  const emotionNames = new Set(emotionCards.map((c) => c.name));
  for (const line of emotionCombo.lines) {
    assert.match(line, /^\[情緒\] /, `emotion-fx line "${line}" must carry the [情緒] tag`);
    const name = line.replace(/^\[情緒\]\s*/, "");
    assert.ok(emotionNames.has(name), `emotion-fx references unknown emotion card "${name}"`);
  }
});

test("random-fill and fill-to-slots respect the current creation mode", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("function getRandomFillPool()"), "shared mode-aware random pool helper must exist");

  const poolStart = html.indexOf("function getRandomFillPool()");
  const poolEnd = html.indexOf("\n}", poolStart);
  const poolBody = html.slice(poolStart, poolEnd);
  assert.match(poolBody, /EMOTION_CARDS/, "pool must branch to emotion cards");
  assert.match(poolBody, /\[文字\]/, "pool must tag text-hero picks with [文字]");

  for (const fn of ["randomCurrentCatScripts", "randomScript", "fillScriptToSlots"]) {
    const start = html.indexOf(`function ${fn}(`);
    assert.ok(start >= 0, `${fn} must exist`);
    const end = html.indexOf("\n}", start);
    const body = html.slice(start, end);
    assert.ok(body.includes("getRandomFillPool()"), `${fn} must source items from getRandomFillPool(), not the raw text-only pool`);
    assert.ok(!body.includes("getVisibleScriptItems()"), `${fn} must not bypass mode-awareness by calling getVisibleScriptItems() directly`);
  }
});

test("quick-pack panel filters by creation mode", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("function comboCreationMode(combo)"), "combo mode detector must exist");
  const start = html.indexOf("function renderScriptComboPanel()");
  const end = html.indexOf("\n}", start);
  const body = html.slice(start, end);
  assert.ok(body.includes("comboCreationMode(combo) === state.creationMode"), "combo panel must only list packs matching the active creation mode");
});

test("text-hero and emotion panels use short per-panel tags, with the mode explained once (not repeated per panel)", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("[TEXT-ONLY] 「${v}」"), "text-hero panels must be a short tagged line, not a repeated full sentence");
  assert.ok(html.includes("[EMOTION-FX] 「${emotionName}」"), "emotion panels must be a short tagged line, not a repeated full sentence");
  assert.ok(html.includes("[NO-TEXT POSE] 「${v}」"), "silent panels must be a short tagged line, not a repeated full sentence");
  assert.match(html, /\[TEXT-ONLY\] panels[^`]*NO character[^`]*use your own judgment/, "TEXT-ONLY explanation (stated once) must exclude the character and defer details to the model");
  assert.match(html, /\[EMOTION-FX\] panels[^`]*no text[^`]*use your own judgment/i, "EMOTION-FX explanation (stated once) must forbid text and defer details to the model");
});

test("a script made entirely of text-only panels skips every character/body/outfit prompt section", async () => {
  const html = await readFile("index.html", "utf8");
  const start = html.indexOf("function combineAll(");
  let i = html.indexOf("{", start);
  let depth = 0, end = i;
  for (; end < html.length; end++) {
    if (html[end] === "{") depth++;
    else if (html[end] === "}") { depth--; if (depth === 0) { end++; break; } }
  }
  const body = html.slice(start, end);
  assert.ok(body.includes("const allTextHero = allSelected.length > 0 && allSelected.every"), "combineAll must detect when every panel is text-only");
  // Every character/body/outfit/border push must be gated so it cannot fire when allTextHero is true.
  const gatedBlockStart = body.indexOf("if (allTextHero) {\n    // no-op");
  const gatedBlockEnd = body.indexOf("if (!allTextHero) {");
  assert.ok(gatedBlockStart >= 0, "character section must short-circuit to a no-op when allTextHero");
  assert.ok(gatedBlockEnd > gatedBlockStart, "render quality / body / outfit section must be gated behind !allTextHero");
  const bodyOutfitBlock = body.slice(gatedBlockEnd, body.indexOf("// font", gatedBlockEnd));
  assert.ok(bodyOutfitBlock.includes("RENDER QUALITY") && bodyOutfitBlock.includes("COSTUME LOCK"), "render quality and costume lock must live inside the !allTextHero block");
  assert.ok(body.includes("if (!allTextHero && state.borderStyle === 'outline')"), "border style (character-only concept) must also be gated behind !allTextHero");
  assert.ok(body.includes("no character or person of any kind in any panel"), "text-only negative prompt must explicitly forbid any character");
});

test("empty character-text fallback still describes a drawable character", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(!html.includes("|| '（未填寫）'"), "empty character text must not fall back to a bare 'not filled in' placeholder");
});

test("status dots only list settings that actually have on-screen controls", async () => {
  const html = await readFile("index.html", "utf8");
  const match = html.match(/const dotLabels = (\[[^\]]*\]);/);
  assert.ok(match, "dotLabels array must exist");
  const labels = JSON.parse(match[1].replace(/'/g, '"'));
  assert.deepStrictEqual(labels, ['角色描述', '貼圖數量', '比例風格', '字體', '背景', '腳本']);
  for (const removed of ['服裝風格', '色系', '構圖', '美顏']) {
    assert.ok(!labels.includes(removed), `"${removed}" has no on-screen control and must not be a status dot`);
  }
});

test("generated prompt drops settings with no on-screen control (beauty filter, color palette)", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(!html.includes("FACE BEAUTY FILTER"), "beauty filter section must not be generated — there is no UI toggle for it");
  assert.ok(!html.includes("OUTFIT COLOR PALETTE"), "color palette section must not be generated — there is no UI color picker");
  assert.ok(!html.includes("OUTFIT STYLE — Selected"), "the unreachable manual/detailed outfit-picker branch must not be generated");
});
