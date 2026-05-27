// Structural lint: checks that key identifiers and functions still exist in
// index.html after edits. Update CURRENT_VERSION when bumping the version.
import { readFile } from "node:fs/promises";

const CURRENT_VERSION = "v2.0.9";

const html = await readFile("index.html", "utf8");

const requiredSnippets = [
  CURRENT_VERSION,
  // Page identity
  "LINE 貼圖 4×4 咒語產生器",
  // API config
  "const ANTHROPIC_API_KEY",
  "claude-sonnet-4-6",
  // Workspace
  "line4x4-sticker-workspace",
  // UI panels
  'id="workspaceSummary"',
  'id="templateGroupSummary"',
  'id="templateGroupPanel"',
  'id="fixSuggestionPanel"',
  'id="scriptComboPanel"',
  'id="batchOutputPanel"',
  'id="smart-workbench-section"',
  'id="workspaceModeToolbar"',
  'id="advancedSummaryBar"',
  // Core rules
  "4×4 固定輸出",
  "全部都要模式",
  // Core functions
  "function renderFixSuggestionPanel()",
  "function renderBatchOutputPanel()",
  "function applyCharacterTemplate(templateId)",
  "function blendToneScriptEditor()",
  "function rebuildBalancedPack()",
  "function setBatchMode(mode)",
  "function setWorkspaceMode(mode)",
  "function smartFillWorkspace()",
  "function persistWorkspace()",
  "function restoreWorkspace()",
  // Data constants
  "const templateGroups = [",
  "const characterTemplates = [",
  "const scriptQuickCombos = [",
  "daily-ink-doodle",
  "ink-doodle-daily",
  "inkdoodle",
  "水墨手寫",
  "REFERENCE STYLE LOCK — INK DOODLE DAILY STICKER EXAMPLE",
  // AI image workflow
  'id="ai-image-section"',
  'id="ai-prompt-result"',
  "function generateAIImagePrompt()",
  "function handleAIFile(file)",
  "function renderAIHistory()",
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
