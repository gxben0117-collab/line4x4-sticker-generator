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
  assert.ok(html.includes("EMOTION+FX PANEL"), "combineAll must branch for emotion-mode panels");
  assert.ok(html.includes("TEXT-HERO PANEL"), "combineAll must branch for text-hero-mode panels");
  assert.ok(html.includes("function buildCoverPrompt"), "main/tab cover image prompt builder must exist");
  assert.ok(html.includes('id="cover-main-btn"') && html.includes('id="cover-tab-btn"'), "cover image buttons must exist");
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

test("V4: green chroma-key background is the new default", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("bgStyle: 'green'"), "bgStyle must default to green");
  assert.ok(html.includes("green: `## BACKGROUND"), "bgData must define a green key entry");
  assert.ok(html.includes('id="bg-green"'), "green background option must exist in the UI");
});

test("workflow shell and navigation helpers are present", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("workflow-strip"));
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

test("API config is correct", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("const ANTHROPIC_API_KEY"), "API key constant must exist");
  assert.ok(html.includes("claude-sonnet-4-6"), "model ID must be current");
  assert.ok(!html.includes("claude-sonnet-4-20250514"), "deprecated model ID must be removed");
  assert.ok(html.includes("anthropic-version"), "anthropic-version header must be present");
});

test("workspace storage key uses new project namespace", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("line4x4-sticker-workspace"));
  assert.ok(!html.includes("codex-sticker-workspace"), "old storage key must be gone");
});

test("script output rules keep text usable for sticker generation", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("Exact text"), "panel text must be exact");
  assert.ok(html.includes("Map the script line-by-line"), "script must map line by line");
  assert.ok(html.includes("Do NOT merge, swap, summarize, translate, or add extra text"));
  assert.ok(html.includes("DO NOT place text over the face"));
});

test("script editor warns when sticker text is too long", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("line.length >= 7"), "7+ character lines should be flagged");
  assert.ok(html.includes("7 字以上建議縮短"), "editor status should warn about long sticker text");
  assert.ok(html.includes("建議將 7 字以上句子縮成 4-6 字"));
  assert.ok(html.includes(".script-editor-status.warn"));
});

test("image upload dropzone is functional", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes('id="dropzone"'), "character dropzone must exist");
  assert.ok(html.includes('id="preview-wrap"'), "preview wrapper must exist");
  assert.ok(html.includes('id="preview-img"'), "preview image must exist");
  assert.ok(html.includes('id="file-in"'), "file input must exist");
  assert.ok(html.includes('id="img-status"'), "img status element must exist");
});

test("cinematic hero UI is present", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("hero-particles"), "hero particles must be present");
  assert.ok(html.includes("hero-eyebrow"), "hero eyebrow must be present");
  assert.ok(html.includes("btn-hero"), "hero CTA button class must be present");
  assert.ok(html.includes("hero-actions"), "hero actions container must be present");
});

test("ink doodle daily example preset is available", async () => {
  const html = await readFile("index.html", "utf8");
  assert.ok(html.includes("daily-ink-doodle"));
  assert.ok(html.includes("ink-doodle-daily"));
  assert.ok(html.includes("ink-doodle-daily-girl"));
  assert.ok(html.includes("水墨手寫"));
  assert.ok(html.includes("REFERENCE STYLE LOCK — INK DOODLE DAILY STICKER EXAMPLE"));
  assert.ok(html.includes("The main character should keep about 80% facial similarity"));
});
