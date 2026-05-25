#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

try:
    from docx import Document
    from docx.table import Table
    from docx.text.paragraph import Paragraph
except ModuleNotFoundError as exc:
    raise SystemExit("缺少 python-docx，请先运行: python3 -m pip install -r requirements.txt") from exc


ROOT = Path(__file__).resolve().parents[1]
APPLICATIONS_DIR = ROOT / "applications"
REQUIRED_HEADINGS = {
    "一、需求分析",
    "二、目的用途",
    "三、实现目标",
    "经费数量",
    "四、取得效果或结果",
    "五、其他",
}


def iter_blocks(document: Document):
    for child in document.element.body.iterchildren():
        if child.tag.endswith("}p"):
            yield Paragraph(child, document)
        elif child.tag.endswith("}tbl"):
            yield Table(child, document)


def table_to_markdown(table: Table) -> list[str]:
    rows = []
    for row in table.rows:
        rows.append([cell.text.replace("\n", " ").strip() for cell in row.cells])
    if not rows:
        return []
    width = max(len(row) for row in rows)
    lines = []
    header = rows[0] + [""] * (width - len(rows[0]))
    lines.append("| " + " | ".join(header) + " |")
    lines.append("| " + " | ".join("---" for _ in range(width)) + " |")
    for row in rows[1:]:
        padded = row + [""] * (width - len(row))
        lines.append("| " + " | ".join(padded) + " |")
    return lines


def export_docx(docx_path: Path) -> Path:
    document = Document(docx_path)
    output = docx_path.parent / "申报书.md"
    lines: list[str] = []
    first_paragraph = True
    for block in iter_blocks(document):
        if isinstance(block, Paragraph):
            text = block.text.strip()
            if not text:
                continue
            if first_paragraph:
                lines.append(f"# {text}")
                lines.append("")
                first_paragraph = False
            elif text in REQUIRED_HEADINGS:
                lines.append(f"## {text}")
                lines.append("")
            elif block.style and block.style.name.startswith("List"):
                lines.append(f"- {text}")
            else:
                lines.append(text)
                lines.append("")
        else:
            lines.extend(table_to_markdown(block))
            lines.append("")
    output.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return output


def main() -> int:
    count = 0
    for docx in sorted(APPLICATIONS_DIR.glob("**/*-申报书.docx")):
        print(export_docx(docx).relative_to(ROOT))
        count += 1
    print(f"exported {count} source file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
