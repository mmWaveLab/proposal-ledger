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
REQUIRED_DOC_HEADINGS = ["一、需求分析", "二、目的用途", "三、实现目标", "经费数量", "四、取得效果或结果", "五、其他"]
LOCAL_LINK = re.compile(r"(!?)\[[^\]]+\]\(([^)]+)\)")


def has_field(text: str, field: str) -> bool:
    return bool(re.search(rf"^- {re.escape(field)}:\s*.+$", text, re.MULTILINE))


def is_external_link(target: str) -> bool:
    return bool(re.match(r"^[a-z][a-z0-9+.-]*:", target, re.I)) or target.startswith("#")


def clean_link_target(target: str) -> str:
    target = target.strip()
    if target.startswith("<") and target.endswith(">"):
        target = target[1:-1]
    return target.split("#", 1)[0].strip()


def validate_local_links(readme: Path, text: str) -> list[str]:
    errors: list[str] = []
    rel = readme.relative_to(ROOT)
    for is_image, raw_target in LOCAL_LINK.findall(text):
        target = clean_link_target(raw_target)
        if not target or is_external_link(target):
            continue
        path = (readme.parent / target).resolve()
        try:
            path.relative_to(readme.parent.resolve())
        except ValueError:
            errors.append(f"{rel}: 本地链接越出申报目录 `{raw_target}`")
            continue
        if not path.exists():
            kind = "图片" if is_image else "链接"
            errors.append(f"{rel}: {kind}目标不存在 `{raw_target}`")
    return errors


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


def validate_source_md(path: Path) -> list[str]:
    errors: list[str] = []
    if not path.exists():
        return [f"缺少申报书源文件: {path.relative_to(ROOT)}"]
    text = path.read_text(encoding="utf-8")
    headings = re.findall(r"^##\s+(.+?)\s*$", text, re.MULTILINE)
    if headings != REQUIRED_DOC_HEADINGS:
        errors.append(
            f"{path.relative_to(ROOT)}: 申报书源文件二级标题必须严格为 "
            + "、".join(REQUIRED_DOC_HEADINGS)
        )
    errors.extend(validate_local_links(path, text))
    return errors


def validate_application(readme: Path) -> list[str]:
    errors: list[str] = []
    rel = readme.relative_to(ROOT)
    text = readme.read_text(encoding="utf-8")
    parts = readme.relative_to(APPLICATIONS_DIR).parts

    if len(parts) < 3 or not re.fullmatch(r"\d{4}", parts[0]) or not re.fullmatch(r"Q[1-4]", parts[1]):
        errors.append(f"{rel}: 路径应为 applications/YYYY/QN/物品名称/README.md")

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
        if not re.search(r"^\|\s*(合计|总计)\s*\|", price_text, re.MULTILINE):
            errors.append(f"{rel}: 价格表缺少 `合计` 行")

    errors.extend(validate_local_links(readme, text))
    errors.extend(validate_source_md(readme.parent / "申报书.md"))

    docx_files = sorted(readme.parent.glob("*.docx"))
    if not docx_files:
        errors.append(f"{rel}: 目录中没有 DOCX 申报书")
    else:
        expected_docx = f"{readme.parent.name}-申报书.docx"
        matching_docx = [path for path in docx_files if path.name == expected_docx]
        if not matching_docx:
            found = "、".join(path.name for path in docx_files)
            errors.append(f"{rel}: DOCX 文件名应为 `{expected_docx}`，当前为 `{found}`")
        if len(docx_files) > 1:
            found = "、".join(path.name for path in docx_files)
            errors.append(f"{rel}: 目录中应只有一个 DOCX 申报书，当前为 `{found}`")
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
