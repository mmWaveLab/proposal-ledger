# Proposal Ledger

mmWaveLab 申报资料台账，用于保存申报书、图片文案资料、申报结果和价格记录。

## 使用约定

每个申报按“年份 / 季度 / 购买物品名称”放在 `applications/` 下，至少包含：

- `物品名称-申报书.docx`: 写好的申报书正文，例如 `树莓派SSD计算套件-申报书.docx`。
- `申报书.md`: 申报书正文源文件，用于 Git diff 和生成 DOCX。
- `README.md`: 图片文案资料、申报成功情况、价格情况。

申报书必须严格按照 `templates/lab-materials/申报书.docx` 的提纲撰写。

建议文件夹命名格式：`applications/YYYY/QN/物品名称`，例如 `applications/2026/Q2/瑞莎CubieA5E数据采集套件`。中文 UTF-8 文件夹名可以使用，但应保持简短，避免使用 `/ : * ? " < > |` 等路径特殊字符。

`templates/lab-materials/` 是模板，不参与申报统计。

仓库内置小 AI skill:

- `skills/lab-material-proposal/SKILL.md`: 用于统一后续材料申报的资料核验、淘宝价格截图、README、DOCX 和统计更新流程。
- `skills/lab-proposal-review/SKILL.md`: 用于审查正式申报书是否仍有报销流程话术、内部素材备注、待补充痕迹和过于基础的调试目标。

提交前建议运行：

```bash
python3 -m pip install -r requirements.txt
python3 scripts/generate_proposal_docx.py --all
python3 scripts/update_stats.py
python3 scripts/validate_ledger.py
python3 scripts/review_proposals.py
```

申报书正文优先维护 `applications/YYYY/QN/物品名称/申报书.md`。需要交付给导师时，运行 `scripts/generate_proposal_docx.py --all` 生成 `物品名称-申报书.docx`。这样 Git 评审主要看 Markdown 文本差异，DOCX 作为可再生成的交付件保留。

统计里的“已确认价格总额”只汇总已经能落到具体金额的行；如果某个项目仍有规格价待复核，会显示为“部分确认”或“待复核”，避免把起售价误当成完整预算。
校验脚本会检查申报目录层级、必填字段、价格表列、合计行、`申报书.md` 标题和本地图片/文件链接，以及 DOCX 压缩结构。审查脚本会检查申报书中是否残留报销流程话术、内部素材备注、待补充痕迹和过于基础的调试目标。

## 自动统计

下面内容由 GitHub Actions 根据 `applications/**/README.md` 自动更新。

<!-- stats:start -->
- 申报总数: 5
- 已确认价格总额: ¥5,321.21
- 完整价格申报数: 5
- 部分确认金额申报数: 0
- 待复核金额申报数: 0
- 完整价格平均值: ¥1,064.24
- 成功率: 0.0%

| 状态 | 数量 |
| --- | ---: |
| 进行中/待补充 | 5 |

| 季度 | 申报数 | 金额 |
| --- | ---: | ---: |
| 2026/Q2 | 5 | ¥5,321.21 |

| 申报 | 归档 | 状态 | 成功情况 | 价格状态 | 金额 | 申报书 |
| --- | --- | --- | --- | --- | ---: | --- |
| [树莓派 SSD 采集计算套件采购](applications/2026/Q2/树莓派SSD计算套件/README.md) | 2026/Q2 | 待提交 | 待补充 | 已确认 | ¥2,969.00 | [docx](applications/2026/Q2/树莓派SSD计算套件/树莓派SSD计算套件-申报书.docx) |
| [实验室电子元器件采集](applications/2026/Q2/实验室电子元器件采集/README.md) | 2026/Q2 | 待提交 | 待补充 | 已确认 | ¥1,974.22 | [docx](applications/2026/Q2/实验室电子元器件采集/实验室电子元器件采集-申报书.docx) |
| [BGA200内存颗粒返修工具采购](applications/2026/Q2/BGA200内存返修工具/README.md) | 2026/Q2 | 待提交 | 待补充 | 已确认 | ¥167.00 | [docx](applications/2026/Q2/BGA200内存返修工具/BGA200内存返修工具-申报书.docx) |
| [瑞莎 Radxa Cubie A5E 迷你主板](applications/2026/Q2/瑞莎CubieA5E数据采集套件/README.md) | 2026/Q2 | 待提交 | 待补充 | 已确认 | ¥161.99 | [docx](applications/2026/Q2/瑞莎CubieA5E数据采集套件/瑞莎CubieA5E数据采集套件-申报书.docx) |
| [Tang Primer 25K 雷达 LVDS 采集 FPGA 套件采购](applications/2026/Q2/TangPrimer25K雷达LVDS采集FPGA/README.md) | 2026/Q2 | 待提交 | 待补充 | 已确认 | ¥49.00 | [docx](applications/2026/Q2/TangPrimer25K雷达LVDS采集FPGA/TangPrimer25K雷达LVDS采集FPGA-申报书.docx) |

| 排名 | 申报 | 价格 |
| ---: | --- | ---: |
| 1 | [树莓派 SSD 采集计算套件采购](applications/2026/Q2/树莓派SSD计算套件/README.md) | ¥2,969.00 |
| 2 | [实验室电子元器件采集](applications/2026/Q2/实验室电子元器件采集/README.md) | ¥1,974.22 |
| 3 | [BGA200内存颗粒返修工具采购](applications/2026/Q2/BGA200内存返修工具/README.md) | ¥167.00 |
| 4 | [瑞莎 Radxa Cubie A5E 迷你主板](applications/2026/Q2/瑞莎CubieA5E数据采集套件/README.md) | ¥161.99 |
| 5 | [Tang Primer 25K 雷达 LVDS 采集 FPGA 套件采购](applications/2026/Q2/TangPrimer25K雷达LVDS采集FPGA/README.md) | ¥49.00 |

_统计脚本: `scripts/update_stats.py`; 最近统计日期: 2026-05-25_
<!-- stats:end -->
