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
    year: str
    quarter: str
    title: str
    status: str
    result: str
    success: str
    total: float
    has_pending_price: bool
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


def parse_price_table(text: str) -> tuple[float, bool]:
    section = re.search(r"## 价格情况\s*(.*?)(?:\n## |\Z)", text, re.S)
    if not section:
        return 0.0, False

    rows = []
    for line in section.group(1).splitlines():
        line = line.strip()
        if not line.startswith("|") or "---" in line:
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) >= 3:
            rows.append(cells)

    if len(rows) < 2:
        return 0.0, False

    headers = rows[0]
    total = 0.0
    has_pending = False
    for cells in rows[1:]:
        first = cells[0] if cells else ""
        subtotal = None
        quantity = None
        unit_price = None
        for index, header in enumerate(headers):
            value = cells[index] if index < len(cells) else ""
            if "小计" in header or "金额" in header:
                if re.search(r"待复核|待确认|待补充", value):
                    has_pending = True
                subtotal = parse_money(value)
            elif "数量" in header:
                quantity = parse_money(value)
            elif "单价" in header:
                if re.search(r"待复核|待确认|待补充", value):
                    has_pending = True
                unit_price = parse_money(value)

        if "合计" in first or "总计" in first:
            continue

        if subtotal is not None and subtotal > 0:
            total += subtotal
        elif quantity is not None and unit_price is not None:
            total += quantity * unit_price

    return total, has_pending


def load_applications() -> list[Application]:
    apps = []
    for readme in sorted(APPLICATIONS_DIR.glob("**/README.md")):
        if readme.parent.name == "assets":
            continue

        parts = readme.relative_to(APPLICATIONS_DIR).parts
        year = parts[0] if len(parts) >= 3 else "未归档"
        quarter = parts[1] if len(parts) >= 3 else "未归档"
        text = readme.read_text(encoding="utf-8")
        total, has_pending_price = parse_price_table(text)
        title_match = re.search(r"^#\s+(.+?)\s*$", text, re.MULTILINE)
        title = title_match.group(1).strip() if title_match else readme.parent.name
        doc_candidates = sorted(readme.parent.glob("*.docx"))
        app = Application(
            slug=readme.parent.name,
            year=year,
            quarter=quarter,
            title=title,
            status=extract_field(text, "申报状态"),
            result=extract_field(text, "申报结果"),
            success=extract_field(text, "成功情况"),
            total=total,
            has_pending_price=has_pending_price,
            readme_path=readme,
            doc_path=doc_candidates[0] if doc_candidates else None,
        )
        apps.append(app)
    return apps


def yuan(value: float) -> str:
    return f"¥{value:,.2f}"


def yuan_with_pending(app: Application) -> str:
    suffix = " + 待复核" if app.has_pending_price else ""
    return f"{yuan(app.total)}{suffix}"


def price_state(app: Application) -> str:
    if app.has_pending_price and app.total > 0:
        return "部分确认"
    if app.has_pending_price:
        return "待复核"
    if app.total > 0:
        return "已确认"
    return "未填写"


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def build_stats(apps: list[Application]) -> str:
    total_amount = sum(app.total for app in apps)
    status_counts = Counter(normalize_status(app) for app in apps)
    period_counts = Counter(f"{app.year}/{app.quarter}" for app in apps)
    period_amounts = {
        period: sum(app.total for app in apps if f"{app.year}/{app.quarter}" == period)
        for period in period_counts
    }
    complete_prices = [app for app in apps if app.total > 0 and not app.has_pending_price]
    partial_prices = [app for app in apps if app.total > 0 and app.has_pending_price]
    pending_prices = [app for app in apps if app.has_pending_price]
    average_complete = (
        sum(app.total for app in complete_prices) / len(complete_prices)
        if complete_prices
        else 0.0
    )
    success_apps = status_counts.get("成功", 0)
    success_rate = success_apps / len(apps) * 100 if apps else 0.0

    lines = [
        f"- 申报总数: {len(apps)}",
        f"- 已确认价格总额: {yuan(total_amount)}",
        f"- 完整价格申报数: {len(complete_prices)}",
        f"- 部分确认金额申报数: {len(partial_prices)}",
        f"- 待复核金额申报数: {len(pending_prices)}",
        f"- 完整价格平均值: {yuan(average_complete)}",
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
            "| 季度 | 申报数 | 金额 |",
            "| --- | ---: | ---: |",
        ]
    )
    for period, count in sorted(period_counts.items()):
        pending = any(f"{app.year}/{app.quarter}" == period and app.has_pending_price for app in apps)
        lines.append(f"| {period} | {count} | {yuan(period_amounts[period])}{' + 待复核' if pending else ''} |")

    lines.extend(
        [
            "",
            "| 申报 | 归档 | 状态 | 成功情况 | 价格状态 | 金额 | 申报书 |",
            "| --- | --- | --- | --- | --- | ---: | --- |",
        ]
    )

    for app in sorted(apps, key=lambda item: item.total, reverse=True):
        readme_link = f"[{app.title}]({rel(app.readme_path)})"
        doc_link = f"[docx]({rel(app.doc_path)})" if app.doc_path else "缺失"
        lines.append(
            f"| {readme_link} | {app.year}/{app.quarter} | {app.status} | {app.success} | {price_state(app)} | {yuan_with_pending(app)} | {doc_link} |"
        )

    if pending_prices:
        lines.extend(
            [
                "",
                "| 待复核事项 | 当前已确认金额 | 说明 |",
                "| --- | ---: | --- |",
            ]
        )
        for app in sorted(pending_prices, key=lambda item: (item.year, item.quarter, item.title)):
            lines.append(
                f"| [{app.title}]({rel(app.readme_path)}) | {yuan(app.total)} | 需要补齐待复核项后再作为完整预算使用 |"
            )

    lines.extend(
        [
            "",
            "| 排名 | 申报 | 价格 |",
            "| ---: | --- | ---: |",
        ]
    )
    for index, app in enumerate(sorted(apps, key=lambda item: item.total, reverse=True)[:5], 1):
        lines.append(f"| {index} | [{app.title}]({rel(app.readme_path)}) | {yuan_with_pending(app)} |")

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
