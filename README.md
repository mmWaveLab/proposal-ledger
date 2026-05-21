# Proposal Ledger

mmWaveLab 申报资料台账，用于保存申报书、图片文案资料、申报结果和价格记录。

## 使用约定

每个申报按“年份 / 季度 / 购买物品名称”放在 `applications/` 下，至少包含：

- `申报书.docx`: 写好的申报书正文。
- `README.md`: 图片文案资料、申报成功情况、价格情况。

申报书必须严格按照 `templates/lab-materials/申报书.docx` 的提纲撰写。

建议文件夹命名格式：`applications/YYYY/QN/物品名称`，例如 `applications/2026/Q2/瑞莎CubieA5E数据采集套件`。中文 UTF-8 文件夹名可以使用，但应保持简短，避免使用 `/ : * ? " < > |` 等路径特殊字符。

`templates/lab-materials/` 是模板，不参与申报统计。

## 自动统计

下面内容由 GitHub Actions 根据 `applications/**/README.md` 自动更新。

<!-- stats:start -->
- 申报总数: 1
- 价格总额: ¥0.00
- 已填价格申报数: 0
- 平均价格: ¥0.00
- 成功率: 0.0%

| 状态 | 数量 |
| --- | ---: |
| 进行中/待补充 | 1 |

| 季度 | 申报数 | 金额 |
| --- | ---: | ---: |
| 2026/Q2 | 1 | ¥0.00 |

| 申报 | 归档 | 状态 | 成功情况 | 价格 | 申报书 |
| --- | --- | --- | --- | ---: | --- |
| [双网口数据采集计算终端套件采购](applications/2026/Q2/瑞莎CubieA5E数据采集套件/README.md) | 2026/Q2 | 待提交 | 待补充 | ¥0.00 | [docx](applications/2026/Q2/瑞莎CubieA5E数据采集套件/申报书.docx) |

| 排名 | 申报 | 价格 |
| ---: | --- | ---: |
| 1 | [双网口数据采集计算终端套件采购](applications/2026/Q2/瑞莎CubieA5E数据采集套件/README.md) | ¥0.00 |

_统计脚本: `scripts/update_stats.py`; 最近统计日期: 2026-05-21_
<!-- stats:end -->
