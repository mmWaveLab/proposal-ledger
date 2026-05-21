#!/usr/bin/env python3
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APPLICATIONS_DIR = ROOT / "applications"
README_PATH = ROOT / "README.md"
START = "<!-- stats:start -->"
END = "<!-- stats:end -->"


@dataclass
class Application:
    slug: str
    title: str
    status: str
    result: str
    success: str
    total: float
    readme_path: Path
    doc_path: Path | None


def parse_money(value: str) -> float:
    cleaned = (
        value.replace(",", "")
        .replace("￥", "")
        .replace("¥", "")
        .replace("元", "")
        .replace("CNY", "")
        .strip()
    )
    match = re.search(r"-?\d+(?:\.\d+)?", cleaned)
    return float(match.group(0)) if match else 0.0


def extract_field(text: str, name: str) -> str:
    match = re.search(rf"^- {re.escape(name)}:\s*(.+?)\s*$", text, re.MULTILINE)
    return match.group(1).strip() if match else "未填写"


def normalize_status(app: Application) -> str:
    blob = " ".join([app.status, app.result, app.success])
    if re.search(r"成功|通过|获批|批准|中标|已完成", blob):
        return "成功"
    if re.search(r"失败|未通过|驳回|未获批|取消|放弃", blob):
        return "未成功"
    if re.search(r"待|进行|提交|评审|未知|未填写", blob):
        return "进行中/待补充"
    return app.status or "未分类"


def parse_price_table(text: str) -> float:
    section = re.search(r"## 价格情况\s*(.*?)(?:\n## |\Z)", text, re.S)
    if not section:
        return 0.0

    rows = []
    for line in section.group(1).splitlines():
        line = line.strip()
        if not line.startswith("|") or "---" in line:
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) >= 3:
            rows.append(cells)

    if len(rows) < 2:
        return 0.0

    headers = rows[0]
    total = 0.0
    for cells in rows[1:]:
        first = cells[0] if cells else ""
        if "合计" in first or "总计" in first:
            continue

        subtotal = None
        quantity = None
        unit_price = None
        for index, header in enumerate(headers):
            value = cells[index] if index < len(cells) else ""
            if "小计" in header or "金额" in header:
                subtotal = parse_money(value)
            elif "数量" in header:
                quantity = parse_money(value)
            elif "单价" in header:
                unit_price = parse_money(value)

        if subtotal is not None and subtotal > 0:
            total += subtotal
        elif quantity is not None and unit_price is not None:
            total += quantity * unit_price

    return total


def load_applications() -> list[Application]:
    apps = []
    for readme in sorted(APPLICATIONS_DIR.glob("*/README.md")):
        text = readme.read_text(encoding="utf-8")
        title_match = re.search(r"^#\s+(.+?)\s*$", text, re.MULTILINE)
        title = title_match.group(1).strip() if title_match else readme.parent.name
        doc_candidates = sorted(readme.parent.glob("*.docx"))
        app = Application(
            slug=readme.parent.name,
            title=title,
            status=extract_field(text, "申报状态"),
            result=extract_field(text, "申报结果"),
            success=extract_field(text, "成功情况"),
            total=parse_price_table(text),
            readme_path=readme,
            doc_path=doc_candidates[0] if doc_candidates else None,
        )
        apps.append(app)
    return apps


def yuan(value: float) -> str:
    return f"¥{value:,.2f}"


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def build_stats(apps: list[Application]) -> str:
    total_amount = sum(app.total for app in apps)
    status_counts = Counter(normalize_status(app) for app in apps)
    known_prices = [app for app in apps if app.total > 0]
    average = total_amount / len(known_prices) if known_prices else 0.0
    success_apps = status_counts.get("成功", 0)
    success_rate = success_apps / len(apps) * 100 if apps else 0.0

    lines = [
        f"- 申报总数: {len(apps)}",
        f"- 价格总额: {yuan(total_amount)}",
        f"- 已填价格申报数: {len(known_prices)}",
        f"- 平均价格: {yuan(average)}",
        f"- 成功率: {success_rate:.1f}%",
        "",
        "| 状态 | 数量 |",
        "| --- | ---: |",
    ]

    for status, count in sorted(status_counts.items()):
        lines.append(f"| {status} | {count} |")

    lines.extend(
        [
            "",
            "| 申报 | 状态 | 成功情况 | 价格 | 申报书 |",
            "| --- | --- | --- | ---: | --- |",
        ]
    )

    for app in sorted(apps, key=lambda item: item.total, reverse=True):
        readme_link = f"[{app.title}]({rel(app.readme_path)})"
        doc_link = f"[docx]({rel(app.doc_path)})" if app.doc_path else "缺失"
        lines.append(
            f"| {readme_link} | {app.status} | {app.success} | {yuan(app.total)} | {doc_link} |"
        )

    lines.extend(
        [
            "",
            "| 排名 | 申报 | 价格 |",
            "| ---: | --- | ---: |",
        ]
    )
    for index, app in enumerate(sorted(apps, key=lambda item: item.total, reverse=True)[:5], 1):
        lines.append(f"| {index} | [{app.title}]({rel(app.readme_path)}) | {yuan(app.total)} |")

    lines.append("")
    lines.append(f"_统计脚本: `scripts/update_stats.py`; 最近统计日期: {date.today().isoformat()}_")
    return "\n".join(lines)


def update_readme(stats: str) -> None:
    readme = README_PATH.read_text(encoding="utf-8")
    replacement = f"{START}\n{stats}\n{END}"
    if START in readme and END in readme:
        readme = re.sub(rf"{re.escape(START)}.*?{re.escape(END)}", replacement, readme, flags=re.S)
    else:
        readme = readme.rstrip() + "\n\n" + replacement + "\n"
    README_PATH.write_text(readme, encoding="utf-8")


def main() -> None:
    apps = load_applications()
    update_readme(build_stats(apps))


if __name__ == "__main__":
    main()
