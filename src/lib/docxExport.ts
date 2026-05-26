import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { IImageOptions } from "docx";
import type { ProposalProject } from "../types/proposal";
import { parseProposalMarkdown } from "./markdown";

const pageWidthPx = 620;

export async function exportProjectDocx(project: ProposalProject) {
  const blob = await createProjectDocxBlob(project);
  downloadBlob(blob, docxFilename(project));
}

export async function createProjectDocxBlob(project: ProposalProject) {
  const blocks = parseProposalMarkdown(project.markdown);
  const children = [];

  for (const block of blocks) {
    if (block.type === "title") {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 360 },
          children: [new TextRun({ text: block.text, bold: true, size: 36, font: "SimHei" })],
        }),
      );
    } else if (block.type === "heading") {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 260, after: 140 },
          children: [new TextRun({ text: block.text, bold: true, size: 28, font: "SimHei" })],
        }),
      );
    } else if (block.type === "paragraph") {
      children.push(
        new Paragraph({
          indent: { firstLine: 480 },
          spacing: { after: 120, line: 360 },
          children: [new TextRun({ text: block.text, size: 24, font: "SimSun" })],
        }),
      );
    } else if (block.type === "list") {
      for (const item of block.items) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80, line: 320 },
            children: [new TextRun({ text: item, size: 24, font: "SimSun" })],
          }),
        );
      }
    } else if (block.type === "table") {
      children.push(makeTable(block.rows));
      children.push(new Paragraph({ text: "" }));
    } else if (block.type === "image") {
      if (block.caption) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: block.caption, size: 21, font: "SimSun" })],
          }),
        );
      }
      const imageRun = await makeImageRun(block.src, block.caption);
      if (imageRun) {
        children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [imageRun] }));
      }
    }
  }

  const doc = new Document({
    creator: "Proposal Ledger",
    title: project.title,
    styles: {
      default: {
        document: {
          run: { font: "SimSun", size: 24 },
          paragraph: { spacing: { line: 360 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1360,
              right: 1530,
              bottom: 1360,
              left: 1530,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function docxFilename(project: ProposalProject) {
  return `${project.name}-申报书.docx`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function makeTable(rows: string[][]) {
  const width = Math.max(...rows.map((row) => row.length));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (row, rowIndex) =>
        new TableRow({
          children: Array.from({ length: width }, (_, colIndex) =>
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              shading:
                rowIndex === 0
                  ? {
                      type: ShadingType.CLEAR,
                      fill: "D9EAF7",
                    }
                  : undefined,
              width: { size: Math.floor(100 / width), type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: rowIndex === 0 || [1, 2, 3].includes(colIndex) ? AlignmentType.CENTER : AlignmentType.LEFT,
                  children: [
                    new TextRun({
                      text: row[colIndex] ?? "",
                      bold: rowIndex === 0,
                      size: colIndex === width - 1 ? 20 : 21,
                      font: "SimSun",
                    }),
                  ],
                }),
              ],
            }),
          ),
        }),
    ),
  });
}

async function makeImageRun(src: string, caption: string) {
  if (!src.startsWith("data:")) return null;
  const normalized = await normalizeImage(src);
  if (!normalized) return null;
  return new ImageRun({
    type: normalized.type,
    data: normalized.data,
    transformation: normalized.transformation,
    altText: {
      title: caption || "proposal image",
      description: caption || "proposal image",
      name: caption || "proposal image",
    },
  } satisfies IImageOptions);
}

async function normalizeImage(dataUrl: string): Promise<{
  type: "jpg" | "png" | "gif" | "bmp";
  data: ArrayBuffer;
  transformation: { width: number; height: number };
} | null> {
  const mime = dataUrl.match(/^data:([^;]+);base64,/)?.[1] || "";
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, pageWidthPx / image.naturalWidth);
  const transformation = {
    width: Math.max(1, Math.round(image.naturalWidth * scale)),
    height: Math.max(1, Math.round(image.naturalHeight * scale)),
  };

  if (mime === "image/jpeg" || mime === "image/jpg") {
    return { type: "jpg", data: dataUrlToArrayBuffer(dataUrl), transformation };
  }
  if (mime === "image/png") {
    return { type: "png", data: dataUrlToArrayBuffer(dataUrl), transformation };
  }
  if (mime === "image/gif") {
    return { type: "gif", data: dataUrlToArrayBuffer(dataUrl), transformation };
  }
  if (mime === "image/bmp") {
    return { type: "bmp", data: dataUrlToArrayBuffer(dataUrl), transformation };
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(image, 0, 0);
  const png = canvas.toDataURL("image/png");
  return { type: "png", data: dataUrlToArrayBuffer(png), transformation };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片无法载入"));
    image.src = src;
  });
}

function dataUrlToArrayBuffer(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}
