import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const { version } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const CURRENT_VERSION = `v${version}`;

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
  assert.ok(html.includes("v2.5.0"));
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
