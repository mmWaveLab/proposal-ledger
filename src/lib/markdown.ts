import { marked } from "marked";

export type MarkdownBlock =
  | { type: "title"; text: string }
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; rows: string[][] }
  | { type: "image"; caption: string; src: string };

const tableDivider = /^:?-{3,}:?$/;

export function markdownToHtml(markdown: string) {
  return marked.parse(markdown, {
    async: false,
    breaks: false,
    gfm: true,
  }) as string;
}

export function parseProposalMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "title", text: line.slice(2).trim() });
    } else if (line.startsWith("## ")) {
      blocks.push({ type: "heading", text: line.slice(3).trim() });
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(stripInline(lines[index].trim().slice(2).trim()));
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        const cells = splitTableRow(lines[index]);
        if (!cells.every((cell) => tableDivider.test(cell.replace(/\s/g, "")))) {
          rows.push(cells.map(stripInline));
        }
        index += 1;
      }
      if (rows.length) blocks.push({ type: "table", rows });
      continue;
    } else if (line.startsWith("![")) {
      const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (image) blocks.push({ type: "image", caption: image[1], src: image[2] });
    } else {
      blocks.push({ type: "paragraph", text: stripInline(line) });
    }
    index += 1;
  }

  return blocks;
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function stripInline(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}
