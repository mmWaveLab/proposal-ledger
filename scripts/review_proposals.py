#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
APPLICATIONS_DIR = ROOT / "applications"
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


@dataclass(frozen=True)
class Rule:
    code: str
    severity: str
    pattern: re.Pattern[str]
    message: str


DOCX_RULES = [
    Rule(
        "DOCX-PRICE-WORKFLOW",
        "error",
        re.compile(r"本次经费按当前记录价格测算|实际采购金额|实际以.*?(订单|发票)|订单及发票为准|发票为准"),
        "申报书不要写下单、发票、实际采购金额等报销/流程口径；改成正式预算表述。",
    ),
    Rule(
        "DOCX-INTERNAL-NOTE",
        "error",
        re.compile(r"接口标注|截图识别|采购后补充|待补充|TODO|待写|随便补"),
        "申报书不要保留内部工作备注、素材说明或待补充痕迹；改成可交付正文。",
    ),
    Rule(
        "DOCX-BASIC-DEBUG",
        "error",
        re.compile(r"点灯|基础点灯|建立.*?工程|烧录测试|基础 Python|系统启动"),
        "实现目标不要写入门调试动作；改成实验室可验收成果。",
    ),
    Rule(
        "DOCX-CURRENT-PRICE",
        "warning",
        re.compile(r"当前记录价|当前记录价格"),
        "正式申报书中尽量用预算单价、申报金额、合计等表述；价格来源细节放 README。",
    ),
]


README_RULES = [
    Rule(
        "README-DOCX-HINT",
        "warning",
        re.compile(r"申报书.*?(实际采购金额|发票为准|接口标注|截图识别)"),
        "README 可以保存证据流程，但不要指导把这些话写入正式申报书。",
    ),
]


def docx_paragraphs(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    paragraphs: list[str] = []
    for paragraph in root.findall(".//w:p", NS):
        text = "".join(node.text or "" for node in paragraph.findall(".//w:t", NS)).strip()
        if text:
            paragraphs.append(text)
    return paragraphs


def scan_text(path: Path, paragraphs: list[str], rules: list[Rule]) -> list[str]:
    findings: list[str] = []
    rel = path.relative_to(ROOT)
    for index, text in enumerate(paragraphs, 1):
        for rule in rules:
            if rule.pattern.search(text):
                snippet = text if len(text) <= 120 else text[:117] + "..."
                findings.append(
                    f"[{rule.severity.upper()}] {rule.code} {rel}:{index}: {rule.message}\n"
                    f"    {snippet}"
                )
    return findings


def review() -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    for docx in sorted(APPLICATIONS_DIR.glob("**/*-申报书.docx")):
        findings = scan_text(docx, docx_paragraphs(docx), DOCX_RULES)
        for finding in findings:
            if finding.startswith("[ERROR]"):
                errors.append(finding)
            else:
                warnings.append(finding)

    for readme in sorted(APPLICATIONS_DIR.glob("**/README.md")):
        if readme.parent.name == "assets":
            continue
        paragraphs = [line.strip() for line in readme.read_text(encoding="utf-8").splitlines() if line.strip()]
        findings = scan_text(readme, paragraphs, README_RULES)
        warnings.extend(findings)

    return errors, warnings


def main() -> int:
    errors, warnings = review()
    if errors or warnings:
        print("Proposal review findings:")
        for finding in errors + warnings:
            print(f"- {finding}")
    if errors:
        print(f"\nProposal review failed: {len(errors)} error(s), {len(warnings)} warning(s)")
        return 1
    print(f"Proposal review passed: 0 error(s), {len(warnings)} warning(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
