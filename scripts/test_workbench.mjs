#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

async function text(path) {
  return readFile(resolve(root, path), "utf8");
}

function includesAll(source, snippets, label) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `${label} missing: ${snippet}`);
  }
}

function excludesAll(source, snippets, label) {
  for (const snippet of snippets) {
    assert.ok(!source.includes(snippet), `${label} must not contain: ${snippet}`);
  }
}

const [main, styles, docxExport, packageJson, dataText] = await Promise.all([
  text("src/main.tsx"),
  text("src/styles.css"),
  text("src/lib/docxExport.ts"),
  text("package.json"),
  text("public/proposal-data.json"),
]);

const pkg = JSON.parse(packageJson);
const data = JSON.parse(dataText);

assert.ok(Array.isArray(data.projects) && data.projects.length > 0, "proposal-data.json should contain projects");
assert.equal(pkg.dependencies?.jszip, undefined, "jszip must not be a direct dependency");

includesAll(
  main,
  [
    "h-dvh overflow-hidden",
    "grid h-dvh min-h-0",
    "flex h-dvh min-h-0 flex-col overflow-hidden",
    "mt-3 min-h-0 flex-1 overflow-auto",
    "flex h-dvh min-w-0 flex-col overflow-hidden",
    "grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_260px]",
    "proposal-scroll min-h-0 overflow-y-auto overflow-x-hidden",
    "proposal-scroll min-h-0 space-y-3 overflow-y-auto overflow-x-hidden",
    "正文大纲",
    "逐个下载勾选项目的 DOCX",
    "for (const [index, project] of checkedProjects.entries())",
    "await exportProjectDocx(project)",
  ],
  "workbench regression",
);

includesAll(
  styles,
  [
    "html,\nbody,\n#root",
    "height: 100%",
    ".proposal-scroll",
    "overscroll-behavior: contain",
    "scrollbar-gutter: stable",
  ],
  "scroll containment",
);

includesAll(docxExport, ["export async function exportProjectDocx", "export function docxFilename"], "docx export");
excludesAll(main + packageJson, ["import JSZip", "new JSZip", "proposal-docx.zip", "打包"], "single-docx workflow");

for (const project of data.projects) {
  assert.ok(project.markdown.includes("## 一、需求分析"), `${project.name} missing proposal outline`);
  assert.ok(project.stats?.totalAmount >= 0, `${project.name} should expose totalAmount`);
}

console.log(`Workbench regression passed: ${data.projects.length} project(s) checked`);
