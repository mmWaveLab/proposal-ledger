import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const applicationsDir = path.join(root, "applications");
const publicDir = path.join(root, "public");
const outputPath = path.join(publicDir, "proposal-data.json");
const sourceName = "申报书.md";
const deliveryNoteHeaders = new Set(["备注"]);
const tableDivider = /^:?-{3,}:?$/;

const imageTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".gif", "image/gif"],
  [".bmp", "image/bmp"],
  [".webp", "image/webp"],
]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function parseReadme(text) {
  const fields = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^-\s*([^:：]+)[:：]\s*(.+?)\s*$/);
    if (match) fields[match[1].trim()] = match[2].trim();
  }
  return fields;
}

function extractSourceMeta(markdown) {
  const meta = {};
  const lines = markdown.split(/\r?\n/);
  const cleaned = lines.filter((line) => {
    const trimmed = line.trim();
    if (!/^申报日期[:：]/.test(trimmed) || !/申报状态[:：]/.test(trimmed)) return true;

    const date = trimmed.match(/申报日期[:：]\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/)?.[1];
    const status = trimmed.match(/申报状态[:：]\s*(.+?)\s*$/)?.[1];
    if (date) meta["申报日期"] = date;
    if (status) meta["申报状态"] = status;
    return false;
  });
  return { markdown: cleaned.join("\n"), meta };
}

function cleanDeliveryMarkdownTables(markdown) {
  const lines = markdown.split(/\r?\n/);
  const cleaned = [];
  let index = 0;

  while (index < lines.length) {
    if (!lines[index].trim().startsWith("|")) {
      cleaned.push(lines[index]);
      index += 1;
      continue;
    }

    const tableLines = [];
    while (index < lines.length && lines[index].trim().startsWith("|")) {
      tableLines.push(lines[index]);
      index += 1;
    }
    cleaned.push(...cleanMarkdownTable(tableLines));
  }

  return cleaned.join("\n");
}

function cleanMarkdownTable(tableLines) {
  const rows = tableLines.map((line) => {
    const cells = splitTableRow(line);
    return {
      cells,
      divider: cells.every((cell) => tableDivider.test(cell.replace(/\s/g, ""))),
    };
  });
  const header = rows.find((row) => !row.divider);
  if (!header) return tableLines;

  const dropColumns = new Set();
  header.cells.forEach((cell, index) => {
    if (deliveryNoteHeaders.has(cell.trim())) dropColumns.add(index);
  });
  if (!dropColumns.size) return tableLines;

  return rows.map((row) => {
    const cells = row.cells.filter((_, index) => !dropColumns.has(index));
    const normalized = row.divider ? cells.map(() => "---") : cells;
    return `| ${normalized.join(" | ")} |`;
  });
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function tableCount(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^\s*\|/.test(line))
    .reduce((count, line, index, lines) => {
      const previousIsTable = index > 0 && /^\s*\|/.test(lines[index - 1]);
      return previousIsTable ? count : count + 1;
    }, 0);
}

function extractTotalAmount(text) {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!/^\s*\|/.test(line) || !line.includes("合计")) continue;
    const cells = line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
    for (let index = cells.length - 1; index >= 0; index -= 1) {
      const cell = cells[index].replace(/,/g, "");
      if (!/^[¥￥]?\s*\d+(?:\.\d+)?\s*(?:元)?$/.test(cell)) continue;
      const value = Number(cell.replace(/[^\d.]/g, ""));
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return 0;
}

async function embedImages(markdown, sourceDir) {
  const images = [];
  const replaced = await replaceAsync(
    markdown,
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    async (match, caption, target) => {
      if (/^https?:\/\//.test(target) || target.startsWith("data:")) return match;
      const imagePath = path.resolve(sourceDir, decodeURIComponent(target));
      const relativeImagePath = path.relative(sourceDir, imagePath);
      if (relativeImagePath.startsWith("..") || path.isAbsolute(relativeImagePath)) return match;
      try {
        const info = await stat(imagePath);
        if (!info.isFile()) return match;
        const ext = path.extname(imagePath).toLowerCase();
        const mime = imageTypes.get(ext);
        if (!mime) return match;
        const data = await readFile(imagePath);
        const dataUrl = `data:${mime};base64,${data.toString("base64")}`;
        images.push({ caption, source: target, mime, dataUrl });
        return `![${caption}](${dataUrl})`;
      } catch {
        return match;
      }
    }
  );
  return { markdown: replaced, images };
}

async function replaceAsync(value, regex, replacer) {
  const promises = [];
  value.replace(regex, (...args) => {
    promises.push(replacer(...args));
    return "";
  });
  const replacements = await Promise.all(promises);
  let index = 0;
  return value.replace(regex, () => replacements[index++]);
}

function extractTitle(markdown, fallback) {
  return markdown.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() || fallback;
}

async function main() {
  const files = (await walk(applicationsDir)).filter((file) => path.basename(file) === sourceName);
  const projects = [];

  for (const source of files.sort()) {
    const dir = path.dirname(source);
    const relDir = path.relative(applicationsDir, dir).split(path.sep).join("/");
    const sourceRel = path.relative(root, source).split(path.sep).join("/");
    const rawMarkdown = await readFile(source, "utf8");
    const sourceMeta = extractSourceMeta(rawMarkdown);
    const deliveryMarkdown = cleanDeliveryMarkdownTables(sourceMeta.markdown);
    const readmePath = path.join(dir, "README.md");
    let readme = {};
    let readmeText = "";
    try {
      readmeText = await readFile(readmePath, "utf8");
      readme = parseReadme(readmeText);
    } catch {
      readme = {};
    }
    const totalAmount = extractTotalAmount(readmeText);
    const embedded = await embedImages(deliveryMarkdown, dir);
    const lines = deliveryMarkdown.split(/\r?\n/);
    const paragraphCount = lines.filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("|") && !trimmed.startsWith("!");
    }).length;

    projects.push({
      id: relDir,
      name: path.basename(dir),
      title: extractTitle(deliveryMarkdown, path.basename(dir)),
      displayName: readme["项目名称"] || extractTitle(sourceMeta.markdown, path.basename(dir)),
      archive: relDir.split("/").slice(0, 2).join("/"),
      sourceRel,
      markdown: embedded.markdown,
      images: embedded.images,
      fields: { ...sourceMeta.meta, ...readme },
      stats: {
        paragraphs: paragraphCount,
        tables: tableCount(deliveryMarkdown),
        images: embedded.images.length,
        characters: deliveryMarkdown.replace(/\s/g, "").length,
        totalAmount,
      },
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    projects,
  };
  await mkdir(publicDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${path.relative(root, outputPath)} with ${projects.length} project(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
