import { marked } from "marked";

export type OutlineItem = {
  id: string;
  text: string;
  depth: number;
};

export type MarkdownBlock =
  | { type: "title"; text: string }
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; rows: string[][] }
  | { type: "image"; caption: string; src: string };

const tableDivider = /^:?-{3,}:?$/;
const outlineHeadingPattern = /^(?:[一二三四五六七八九十]+、|#)/;

export function markdownToHtml(markdown: string) {
  const slugs = new Map<string, number>();
  const html = marked.parse(markdown, {
    async: false,
    breaks: false,
    gfm: true,
  }) as string;
  return html.replace(/<h([1-6])>(.*?)<\/h\1>/g, (_match, depth: string, content: string) => {
    const text = stripHtml(content);
    const id = uniqueSlug(text, slugs);
    return `<h${depth} id="${escapeAttribute(id)}">${content}</h${depth}>`;
  });
}

export function extractOutline(markdown: string): OutlineItem[] {
  const slugs = new Map<string, number>();
  return marked
    .lexer(markdown)
    .filter((token) => token.type === "heading" && token.depth <= 3)
    .map((token) => {
      const heading = token as { text: string; depth: number };
      const text = stripInline(heading.text);
      return {
        id: uniqueSlug(text, slugs),
        text,
        depth: heading.depth,
      };
    })
    .filter((item) => item.depth === 1 || outlineHeadingPattern.test(item.text));
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

function uniqueSlug(text: string, slugs: Map<string, number>) {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "section";
  const count = slugs.get(base) ?? 0;
  slugs.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").trim();
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
