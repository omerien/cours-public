
import MarkdownIt from "markdown-it";
import { katex } from "@mdit/plugin-katex";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const outputDir = path.join(root, "dist");
const assetsDir = path.join(outputDir, "assets");

// Configure Markdown-it and KaTeX.
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
});

md.use(katex, {
  mathFence: true,
  delimiters: "all",
  throwOnError: false
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

async function main() {
  const documents = JSON.parse(
    await fs.readFile(
      path.join(root, "index.json"),
      "utf8"
    )
  );

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(assetsDir, { recursive: true });

  // Copy KaTeX stylesheet and fonts locally.
  const katexDir = path.dirname(
    path.dirname(
      fileURLToPath(import.meta.resolve("katex/dist/katex.min.css"))
    )
  );

  await fs.copyFile(
    path.join(katexDir, "dist", "katex.min.css"),
    path.join(assetsDir, "katex.min.css")
  );

  await fs.cp(
    path.join(katexDir, "dist", "fonts"),
    path.join(assetsDir, "fonts"),
    { recursive: true }
  );

  const indexEntries = [];
  const usedOutputs = new Set();

  for (const document of documents) {
    const { annee, file, title } = document;

    if (typeof file !== "string" || !file.endsWith(".md")) {
      throw new Error(`Fichier invalide: ${file}`);
    }

    // Resolve the source relative to the repository root.
    const source = path.resolve(root, annee, file);
    const relativeSource = path.relative(root, source);

    // Prevent paths escaping the repository.
    if (
      relativeSource === ".." ||
      relativeSource.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeSource)
    ) {
      throw new Error(`Document must be inside the repository: ${file}`);
    }

    // Verify that the source is a regular file.
    const stat = await fs.stat(source);

    if (!stat.isFile()) {
      throw new Error(`Not a regular file: ${file}`);
    }

    const relativeOutput = path.join(
      "documents",
      relativeSource.replace(/\.md$/i, ".html")
    );

    if (usedOutputs.has(relativeOutput)) {
      throw new Error(`Duplicate output filename: ${relativeOutput}`);
    }
    usedOutputs.add(relativeOutput);

    const output = path.join(outputDir, relativeOutput);

    await fs.mkdir(path.dirname(output), { recursive: true });

    const markdown = await fs.readFile(source, "utf8");
    const html = md.render(markdown);

    const cssPath = path.relative(
      path.dirname(output),
      path.join(assetsDir, "katex.min.css")
    ).split(path.sep).join("/");

    const homePath = path.relative(
      path.dirname(output),
      path.join(outputDir, "index.html")
    ).split(path.sep).join("/");

    const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${cssPath}">
  <style>
    body {
      max-width: 900px;
      margin: 40px auto;
      padding: 0 24px;
      font-family: system-ui, sans-serif;
      line-height: 1.7;
      color: #242424;
    }
    h1, h2, h3 { line-height: 1.3; }
    pre {
      padding: 16px;
      overflow-x: auto;
      background: #f5f5f5;
      border-radius: 6px;
    }
    code { font-family: monospace; }
    .katex-display {
      overflow-x: auto;
      overflow-y: hidden;
      padding: 8px 0;
    }
    img { max-width: 100%; }
    a { color: #2563eb; }
    .navigation {
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px solid #ddd;
    }
    @media print {
      body { margin: 0; max-width: none; }
      .navigation { display: none; }
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
    }

    th, td {
      border: 1px solid #888;
      padding: 10px 14px;
      text-align: left;
    }

    th {
      font-weight: 600;
      background: #f0f0f0;
    }

    tr:nth-child(even) {
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div class="navigation">
    <a href="${homePath}">← Liste des documents</a>
  </div>
  <main>
    ${html}
  </main>
</body>
</html>`;

    await fs.writeFile(output, page, "utf8");
    indexEntries.push({
      title,
      annee,
      href: relativeOutput.split(path.sep).join("/")
    });

    console.log(`Rendered: ${file} -> ${relativeOutput}`);
  }

  // Generate the website homepage.
  let links = "";
  while (indexEntries.length > 0) {
    let currSection = indexEntries[indexEntries.length-1].annee;
    links += `<h2>${currSection}</h2><ul>`;
    for (let i = indexEntries.length - 1; i >= 0; i--) {
      if (indexEntries[i].annee == currSection) {
        links += `<li><a href="${escapeHtml(indexEntries[i].href)}">${escapeHtml(indexEntries[i].title)}</a></li>`;
        indexEntries.splice(i, 1);
      }
    }
    links += "</ul>";
  }

  const index = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>omerien/cours-public</title>
  <link rel="stylesheet" href="./assets/katex.min.css">
  <style>
    body {
      max-width: 900px;
      margin: 60px auto;
      padding: 0 24px;
      font-family: system-ui, sans-serif;
      line-height: 1.7;
      color: #242424;
    }
    a { color: #2563eb; }
    li { margin: 12px 0; }
  </style>
</head>
<body>
  <h1>Tous les cours disponibles</h1>
  ${links}
</body>
</html>`;

  await fs.writeFile(
    path.join(outputDir, "index.html"),
    index,
    "utf8"
  );
  console.log("Rendered the homepage");

  console.log(`Successfully rendered ${documents.length+1} documents.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
