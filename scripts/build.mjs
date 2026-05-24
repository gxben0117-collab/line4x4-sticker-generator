// Build script: copies index.html to dist/index.html as-is.
// This project uses a single-file delivery model; dist/ is the deployable
// artifact. No bundling or transformation is performed by design.
import { mkdir, readFile, writeFile } from "node:fs/promises";

const html = await readFile("index.html", "utf8");

await mkdir("dist", { recursive: true });
await writeFile("dist/index.html", html, "utf8");

console.log("Built dist/index.html");
