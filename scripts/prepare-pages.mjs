import { cp, readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const clientDirectory = fileURLToPath(new URL("../dist/client/", import.meta.url));
const indexPath = join(clientDirectory, "index.html");
const textExtensions = new Set([".css", ".html", ".js", ".json", ".map", ".svg", ".txt"]);

// GitHub Pages serves project sites from /<repository>/, while the app is
// built at /. Rewrite only our local root-relative assets to relative paths so
// the same artifact works at the repository Pages URL without changing the
// local preview or exposing a deployment-specific base path to the app.
const assetPrefixes = [
  "/_next/",
  "/avatars/",
  "/decorations/",
  "/recipes/",
  "/showcase/",
  "/favicon.svg",
  "/file.svg",
  "/globe.svg",
  "/window.svg",
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

const files = await walk(clientDirectory);
for (const file of files) {
  if (!textExtensions.has(extname(file).toLowerCase())) continue;
  let content = await readFile(file, "utf8");
  for (const prefix of assetPrefixes) {
    const relativePrefix = `./${prefix.slice(1)}`;
    content = content
      .replaceAll(`"${prefix}`, `"${relativePrefix}`)
      .replaceAll(`'${prefix}`, `'${relativePrefix}`)
      .replaceAll(`(${prefix}`, `(${relativePrefix}`);
  }
  await writeFile(file, content);
}

await writeFile(join(clientDirectory, ".nojekyll"), "");
// A project-site visitor may arrive at a deep client route after a refresh.
// The showcase is a single-page product demo, so use the app shell as the
// Pages fallback as well.
await cp(indexPath, join(clientDirectory, "404.html"));

console.log(`Prepared GitHub Pages artifact in ${clientDirectory}`);

