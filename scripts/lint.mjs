// Structural lint: checks that key identifiers and functions still exist in
// index.html after edits. Update CURRENT_VERSION when bumping the version.
import { readFile } from "node:fs/promises";

const { version } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const CURRENT_VERSION = `v${version}`;

const html = await readFile("index.html", "utf8");

const requiredSnippets = [
  CURRENT_VERSION,
  // Page identity
  "LINE 貼圖 4×4 咒語產生器",
  // Workspace
  "line4x4-sticker-workspace",
  // Simple production UI
  'id="char-section"',
  'id="char-input"',
  'id="script-section"',
  'id="script-edit-area"',
  'id="script-editor-status"',
  'id="copy-script-btn"',
  "script-workflow",
  // Core rules
  "4×4 固定輸出",
  "一行一張貼圖",
  "補滿 16 句",
  // Core functions
  "function applyCharacterTemplate(templateId)",
  "function blendToneScriptEditor()",
  "function rebuildBalancedPack()",
  "function copyScriptEditor()",
  "function fillScriptToSlots()",
  "function dedupeScriptEditor()",
  "function sortScriptEditor()",
  "function persistWorkspace()",
  "function restoreWorkspace()",
  // Data constants
  "const templateGroups = [",
  "const characterTemplates = [",
  "const scriptQuickCombos = [",
  "inkdoodle",
  "水墨手寫",
  // Output rules
  "Exact text",
  "Map the script line-by-line",
  "do not cover the face",
  // Hero UI elements
  "hero-particles",
  "hero-eyebrow",
  "btn-hero"
];

const failures = requiredSnippets.filter((snippet) => !html.includes(snippet));

if (failures.length) {
  console.error("Lint failed:");
  for (const failure of failures) {
    console.error(`- missing snippet: ${failure}`);
  }
  process.exit(1);
}

console.log("Lint passed");
