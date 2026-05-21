#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APPLICATIONS_DIR = ROOT / "applications"
REQUIRED_FIELDS = ["申报状态", "申报结果", "成功情况", "负责人", "申报书"]
REQUIRED_SECTIONS = ["## 图片文案资料", "## 申报成功情况", "## 价格情况"]


def has_field(text: str, field: str) -> bool:
    return bool(re.search(rf"^- {re.escape(field)}:\s*.+$", text, re.MULTILINE))


def validate_docx(path: Path) -> list[str]:
    errors: list[str] = []
    if not path.exists():
        return [f"缺少申报书: {path.relative_to(ROOT)}"]
    try:
        with zipfile.ZipFile(path) as docx:
            bad = docx.testzip()
            if bad:
                errors.append(f"DOCX 压缩结构损坏: {path.relative_to(ROOT)} -> {bad}")
    except zipfile.BadZipFile:
        errors.append(f"DOCX 不是有效压缩包: {path.relative_to(ROOT)}")
    return errors


def validate_application(readme: Path) -> list[str]:
    errors: list[str] = []
    rel = readme.relative_to(ROOT)
    text = readme.read_text(encoding="utf-8")

    if not re.search(r"^#\s+.+$", text, re.MULTILINE):
        errors.append(f"{rel}: 缺少一级标题")

    for field in REQUIRED_FIELDS:
        if not has_field(text, field):
            errors.append(f"{rel}: 缺少字段 `{field}`")

    for section in REQUIRED_SECTIONS:
        if section not in text:
            errors.append(f"{rel}: 缺少章节 `{section}`")

    price_section = re.search(r"## 价格情况\s*(.*?)(?:\n## |\Z)", text, re.S)
    if not price_section:
        errors.append(f"{rel}: 缺少价格情况表")
    else:
        price_text = price_section.group(1)
        for header in ["数量", "单价(CNY)", "小计(CNY)"]:
            if header not in price_text:
                errors.append(f"{rel}: 价格表缺少 `{header}` 列")

    docx_files = sorted(readme.parent.glob("*.docx"))
    if not docx_files:
        errors.append(f"{rel}: 目录中没有 DOCX 申报书")
    else:
        errors.extend(validate_docx(docx_files[0]))

    return errors


def main() -> int:
    readmes = [
        readme
        for readme in sorted(APPLICATIONS_DIR.glob("**/README.md"))
        if readme.parent.name != "assets"
    ]
    errors: list[str] = []

    if not readmes:
        errors.append("applications/ 下没有任何申报 README")

    for readme in readmes:
        errors.extend(validate_application(readme))

    if errors:
        print("Ledger validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Ledger validation passed: {len(readmes)} application(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
