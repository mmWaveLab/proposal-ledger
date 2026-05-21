# Proposal Ledger

mmWaveLab 申报资料台账，用于保存申报书、图片文案资料、申报结果和价格记录。

## 使用约定

每个申报按“年份 / 季度 / 购买物品名称”放在 `applications/` 下，至少包含：

- `申报书.docx`: 写好的申报书正文。
- `README.md`: 图片文案资料、申报成功情况、价格情况。

申报书必须严格按照 `templates/lab-materials/申报书.docx` 的提纲撰写。

建议文件夹命名格式：`applications/YYYY/QN/物品名称`，例如 `applications/2026/Q2/瑞莎CubieA5E数据采集套件`。中文 UTF-8 文件夹名可以使用，但应保持简短，避免使用 `/ : * ? " < > |` 等路径特殊字符。

`templates/lab-materials/` 是模板，不参与申报统计。

仓库内置小 AI skill: `skills/lab-material-proposal/SKILL.md`，用于统一后续材料申报的资料核验、淘宝价格截图、README、DOCX 和统计更新流程。

提交前建议运行：

```bash
python3 scripts/update_stats.py
python3 scripts/validate_ledger.py
```

统计里的“已确认价格总额”只汇总已经能落到具体金额的行；如果某个项目仍有规格价待复核，会显示为“部分确认”或“待复核”，避免把起售价误当成完整预算。
校验脚本会检查申报目录层级、必填字段、价格表列、合计行、本地图片/文件链接，以及 DOCX 压缩结构。

## 自动统计

下面内容由 GitHub Actions 根据 `applications/**/README.md` 自动更新。

<!-- stats:start -->
- 申报总数: 2
- 已确认价格总额: ¥55.00
- 完整价格申报数: 1
- 部分确认金额申报数: 1
- 待复核金额申报数: 1
- 完整价格平均值: ¥49.00
- 成功率: 0.0%

| 状态 | 数量 |
| --- | ---: |
| 进行中/待补充 | 2 |

| 季度 | 申报数 | 金额 |
| --- | ---: | ---: |
| 2026/Q2 | 2 | ¥55.00 + 待复核 |

| 申报 | 归档 | 状态 | 成功情况 | 价格状态 | 金额 | 申报书 |
| --- | --- | --- | --- | --- | ---: | --- |
| [Tang Primer 25K 雷达 LVDS 采集 FPGA 套件采购](applications/2026/Q2/TangPrimer25K雷达LVDS采集FPGA/README.md) | 2026/Q2 | 待提交 | 待补充 | 已确认 | ¥49.00 | [docx](applications/2026/Q2/TangPrimer25K雷达LVDS采集FPGA/申报书.docx) |
| [双网口数据采集计算终端套件采购](applications/2026/Q2/瑞莎CubieA5E数据采集套件/README.md) | 2026/Q2 | 待提交 | 待补充 | 部分确认 | ¥6.00 + 待复核 | [docx](applications/2026/Q2/瑞莎CubieA5E数据采集套件/申报书.docx) |

| 待复核事项 | 当前已确认金额 | 说明 |
| --- | ---: | --- |
| [双网口数据采集计算终端套件采购](applications/2026/Q2/瑞莎CubieA5E数据采集套件/README.md) | ¥6.00 | 待复核: Radxa Cubie A5E 4GB 商业级计算终端 |

| 排名 | 申报 | 价格 |
| ---: | --- | ---: |
| 1 | [Tang Primer 25K 雷达 LVDS 采集 FPGA 套件采购](applications/2026/Q2/TangPrimer25K雷达LVDS采集FPGA/README.md) | ¥49.00 |
| 2 | [双网口数据采集计算终端套件采购](applications/2026/Q2/瑞莎CubieA5E数据采集套件/README.md) | ¥6.00 + 待复核 |

_统计脚本: `scripts/update_stats.py`; 最近统计日期: 2026-05-21_
<!-- stats:end -->
