const data = window.HONGBING_DATA;

const state = {
  source: "image",
  qty: 16,
  selectedLines: [],
  styles: new Set(data.defaults.selectedStyles)
};

const $ = (id) => document.getElementById(id);

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function setActive(container, selector, matcher) {
  container.querySelectorAll(selector).forEach((node) => {
    node.classList.toggle("active", matcher(node));
  });
}

function fillSelect(id, options) {
  $(id).innerHTML = options.map((option) => (
    `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`
  )).join("");
}

function renderStyles() {
  $("styleChips").innerHTML = data.styleOptions.map((name) => {
    const active = state.styles.has(name) ? " active" : "";
    return `<button class="chip${active}" type="button" data-style="${escapeHtml(name)}">${escapeHtml(name)}</button>`;
  }).join("");
}

function renderScripts() {
  const customLines = getCustomLines();
  const allLines = getAllLines();

  $("lineTotal").textContent = state.qty;
  $("lineCount").textContent = allLines.length;
  $("scriptGrid").innerHTML = data.scripts.map((line) => {
    const active = state.selectedLines.includes(line) ? " active" : "";
    return `<button class="script-card${active}" type="button" data-line="${escapeHtml(line)}">${escapeHtml(line)}</button>`;
  }).join("");

  renderPreview(allLines.length ? allLines : customLines);
}

function renderPreview(lines) {
  const cells = Array.from({ length: state.qty }, (_, index) => lines[index] || `Panel ${index + 1}`);
  const columns = state.qty === 1 ? "1fr" : state.qty === 4 ? "repeat(2, 1fr)" : state.qty === 9 ? "repeat(3, 1fr)" : "repeat(4, 1fr)";

  $("previewGrid").style.gridTemplateColumns = columns;
  $("previewGrid").innerHTML = cells.map((line) => `<div class="sticker-cell">${escapeHtml(line)}</div>`).join("");
}

function getCustomLines() {
  return $("customLines").value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, state.qty);
}

function getAllLines() {
  const merged = [...state.selectedLines, ...getCustomLines()];
  return [...new Set(merged)].slice(0, state.qty);
}

function randomPick(list, count) {
  return list.slice().sort(() => Math.random() - 0.5).slice(0, count);
}

function randomize() {
  const preset = data.presets[Math.floor(Math.random() * data.presets.length)];

  $("character").value = preset.character;
  $("identityNotes").value = data.defaults.identityNotes;
  $("outfit").value = preset.outfit;
  $("customLines").value = "";

  state.styles = new Set(preset.styles);
  state.selectedLines = randomPick(preset.lines.concat(data.scripts), Math.min(state.qty, 8));

  renderStyles();
  renderScripts();
  generate();
}

function buildPrompt() {
  const lines = getAllLines();
  const character = $("character").value.trim();
  const identity = $("identityNotes").value.trim() || "Maintain consistent identity across all panels. Same face, same hairstyle, same outfit, same color palette. No identity drift.";
  const qtyLabel = getQtyLabel(state.qty);
  const sourceText = state.source === "image"
    ? "Use the uploaded reference image as the base character. Preserve the exact facial identity, hairstyle, face shape, eye shape, nose, lips, skin tone, and recognizable likeness across every panel."
    : `Create the character from this description: ${character || "紅兵角色，紅色兵裝，精緻可愛的 LINE 貼圖風格。"}`;
  const scriptBlock = lines.length ? buildScriptBlock(lines) : "AI may choose suitable short Traditional Chinese sticker phrases for each panel.";

  return `## STICKER SHEET SIZE
${qtyLabel}

## CHARACTER
${sourceText}
${character ? `Supplementary character notes: ${character}` : ""}

## IDENTITY LOCK
${identity}

## VISUAL STYLE
${Array.from(state.styles).join(", ")}
${$("bodyStyle").value}
Professional commercial LINE sticker quality, crisp edges, clean silhouette, expressive face, dynamic body language, coherent lighting.

## OUTFIT
${$("outfit").value.trim() || "AI chooses a red-themed refined outfit suitable for the Hongbing character."}
The outfit must remain consistent in every panel. Do not change costume between panels.

## FONT AND TEXT
${$("fontStyle").value}
Traditional Chinese only. Every character must be stroke-correct, immediately readable, and commercially typeset. No simplified Chinese, no fake glyphs, no broken characters.

## COMPOSITION
${$("layoutStyle").value}
Each sticker panel must be independent, with clear padding and separation. No panel content may touch the border or bleed into another panel.

## BACKGROUND
${$("background").value}

## STICKER SCRIPT
${scriptBlock}

## PANEL RULES
Every panel must have a different pose, expression, gesture, and timing.
Text must never cover the face. Character remains the dominant visual element.
Keep gutters consistent between panels.
Use cute props, motion marks, sparkles, speech decorations, or small red-gold accents only when they support the emotion.

## NEGATIVE PROMPT
No blurry face, no low resolution, no identity drift, no costume changes, no repeated poses, no unreadable Chinese text, no simplified Chinese, no invented glyphs, no distorted hands, no extra fingers, no cropped character, no watermark, no signature, no dark dirty background, no content bleeding between panels.`;
}

function getQtyLabel(qty) {
  const labels = {
    1: "1 panel",
    4: "2x2 sheet, 4 panels",
    9: "3x3 sheet, 9 panels",
    16: "4x4 sheet, 16 panels"
  };
  return labels[qty] || `${qty} panels`;
}

function buildScriptBlock(lines) {
  return lines.map((line, index) => {
    if (line === "無字" || line.toLowerCase() === "no text") {
      return `Panel ${index + 1}: NO TEXT. Use only pose, facial expression, and small decorative elements to express the emotion.`;
    }

    return `Panel ${index + 1}: Traditional Chinese text "${line}". Match the character pose and facial expression to the meaning.`;
  }).join("\n");
}

function generate() {
  $("result").textContent = buildPrompt().replace(/\n{3,}/g, "\n\n").trim();
  renderPreview(getAllLines());
}

async function copyResult() {
  const text = $("result").textContent.trim() || buildPrompt();

  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    fallbackCopy(text);
  }

  showToast();
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function showToast() {
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 1500);
}

function bindEvents() {
  $("sourceSegs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-source]");
    if (!button) return;

    state.source = button.dataset.source;
    setActive($("sourceSegs"), ".seg", (node) => node === button);
    generate();
  });

  $("qtySegs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-qty]");
    if (!button) return;

    state.qty = Number(button.dataset.qty);
    state.selectedLines = state.selectedLines.slice(0, state.qty);
    setActive($("qtySegs"), ".seg", (node) => node === button);
    renderScripts();
    generate();
  });

  $("styleChips").addEventListener("click", (event) => {
    const button = event.target.closest("[data-style]");
    if (!button) return;

    const name = button.dataset.style;
    if (state.styles.has(name)) state.styles.delete(name);
    else state.styles.add(name);

    renderStyles();
    generate();
  });

  $("scriptGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-line]");
    if (!button) return;

    const line = button.dataset.line;
    const index = state.selectedLines.indexOf(line);
    if (index >= 0) state.selectedLines.splice(index, 1);
    else if (getAllLines().length < state.qty) state.selectedLines.push(line);

    renderScripts();
    generate();
  });

  ["character", "identityNotes", "outfit", "customLines", "bodyStyle", "background", "fontStyle", "layoutStyle"].forEach((id) => {
    $(id).addEventListener("input", () => {
      renderScripts();
      generate();
    });
    $(id).addEventListener("change", () => {
      renderScripts();
      generate();
    });
  });

  $("randomBtn").addEventListener("click", randomize);
  $("randomLinesBtn").addEventListener("click", () => {
    state.selectedLines = randomPick(data.scripts, Math.min(state.qty, state.qty === 16 ? 12 : state.qty));
    $("customLines").value = "";
    renderScripts();
    generate();
  });
  $("clearLinesBtn").addEventListener("click", () => {
    state.selectedLines = [];
    $("customLines").value = "";
    renderScripts();
    generate();
  });
  $("generateBtn").addEventListener("click", generate);
  $("copyBtn").addEventListener("click", copyResult);
  $("copyTopBtn").addEventListener("click", copyResult);
}

function init() {
  fillSelect("bodyStyle", data.bodyStyles);
  fillSelect("background", data.backgrounds);
  fillSelect("fontStyle", data.fontStyles);
  fillSelect("layoutStyle", data.layoutStyles);
  renderStyles();
  renderScripts();
  bindEvents();
  generate();
}

init();
