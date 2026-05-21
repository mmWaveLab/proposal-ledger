# Proposal Ledger

mmWaveLab 申报资料台账，用于保存申报书、图片文案资料、申报结果和价格记录。

## 使用约定

每个申报单独放在 `applications/` 下的一个文件夹中，至少包含：

- `申报书.docx`: 写好的申报书正文。
- `README.md`: 图片文案资料、申报成功情况、价格情况。

建议文件夹命名格式：`YYYY-MM-简短主题`，例如 `2026-05-team-lab-materials`。

## 自动统计

下面内容由 GitHub Actions 根据 `applications/*/README.md` 自动更新。

<!-- stats:start -->
- 申报总数: 1
- 价格总额: ¥0.00
- 已填价格申报数: 0
- 平均价格: ¥0.00
- 成功率: 0.0%

| 状态 | 数量 |
| --- | ---: |
| 进行中/待补充 | 1 |

| 申报 | 状态 | 成功情况 | 价格 | 申报书 |
| --- | --- | --- | ---: | --- |
| [团队实验材料购置和经费需要论证](applications/2026-05-team-lab-materials/README.md) | 待补充 | 待补充 | ¥0.00 | [docx](applications/2026-05-team-lab-materials/申报书.docx) |

| 排名 | 申报 | 价格 |
| ---: | --- | ---: |
| 1 | [团队实验材料购置和经费需要论证](applications/2026-05-team-lab-materials/README.md) | ¥0.00 |

_统计脚本: `scripts/update_stats.py`; 最近统计日期: 2026-05-21_
<!-- stats:end -->
