// 產生 docs/line-sticker-sentences.md
// 從 index.html 的 scriptData 取目前實際句庫，列出分類、字數、7 字以上標記與去重總表。
// 用法：node scripts/build-sentences-report.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const start = html.indexOf('const scriptData = {');
const end = html.indexOf('const allCats', start);
if (start < 0 || end < 0) throw new Error('index.html 找不到 scriptData 區塊');

const scriptData = new Function(`${html.slice(start, end)}; return scriptData;`)();
const charCount = (text) => [...text].length;
const warn = (text) => charCount(text) >= 7 ? ' ⚠' : '';

const categoryNames = Object.keys(scriptData);
const totalLines = categoryNames.reduce((sum, cat) => sum + scriptData[cat].length, 0);
const longLines = categoryNames.flatMap((cat) => scriptData[cat].filter((text) => charCount(text) >= 7).map((text) => ({ cat, text })));

const seen = new Map();
for (const cat of categoryNames) {
  for (const text of scriptData[cat]) {
    if (!seen.has(text)) seen.set(text, new Set());
    seen.get(text).add(cat);
  }
}

const uniqueRows = [...seen.entries()].map(([text, cats]) => ({ text, cats: [...cats] }));
const uniqueLongRows = uniqueRows.filter(({ text }) => charCount(text) >= 7);

let out = `# LINE 貼圖句子總表

版本：V1.01
產生日期：2026-07-09
產生方式：\`node scripts/build-sentences-report.mjs\`
資料來源：\`index.html\` 的實際 \`scriptData\`

標記說明：
- \`⚠\` = 7 字以上，建議縮短或做 UI 提醒。
- 字數用 JavaScript Unicode 字元計數，英文與標點也計入。

## 統計

- 分類數：${categoryNames.length}
- 句子總數：${totalLines}
- 去重後句子數：${uniqueRows.length}
- 7 字以上句子數：${longLines.length}
- 去重後 7 字以上句子數：${uniqueLongRows.length}

## 依目前分類
`;

for (const cat of categoryNames) {
  const items = scriptData[cat];
  out += `\n### ${cat}（${items.length} 句）\n\n`;
  items.forEach((text, index) => {
    out += `${index + 1}. ${text}（${charCount(text)} 字）${warn(text)}\n`;
  });
}

out += `\n## 去重總表\n\n`;
uniqueRows.forEach(({ text, cats }, index) => {
  out += `${index + 1}. ${text}（${charCount(text)} 字）${warn(text)}｜分類：${cats.join('、')}\n`;
});

writeFileSync(join(root, 'docs', 'line-sticker-sentences.md'), out, 'utf8');
console.log(`OK：${categoryNames.length} 分類 / ${totalLines} 句 / 去重 ${uniqueRows.length} 句`);
