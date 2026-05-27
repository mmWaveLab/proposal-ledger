# Proposal Ledger

mmWaveLab 申报资料台账，用于保存申报书、图片文案资料、申报结果和价格记录。

## 使用约定

每个申报按“年份 / 季度 / 购买物品名称”放在 `applications/` 下，至少包含：

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

申报书正文优先维护 `applications/YYYY/QN/物品名称/申报书.md`。需要交付给导师时，运行 `scripts/generate_proposal_docx.py --all` 生成 `exports/proposal-docx/**/物品名称-申报书.docx`。GitHub Actions 每次也会自动生成单份 DOCX 并上传到 [Update proposal statistics](https://github.com/mmWaveLab/proposal-ledger/actions/workflows/update-stats.yml) 最新运行的 Artifacts；网页工作台也支持选择项目后直接导出单份 DOCX。

## Web 预览与 DOCX 导出

仓库内置一个由 Node 驱动的 React 静态页面，用于更友好地预览 `申报书.md`，并在浏览器中直接导出 DOCX：

```bash
pnpm install
pnpm run dev
```

打开终端显示的本地地址即可按年度/季度展开项目、预览正文、查看表格和图片，并点击“当前”下载单份 Word 文档。

静态部署时运行：

```bash
pnpm run build
```

构建过程会扫描 `applications/**/申报书.md`，把 Markdown 和本地图片写入 `public/proposal-data.json`，最终产物在 `dist/`。部署 `dist/` 到 GitHub Pages、Cloudflare Pages 或任意静态文件服务后，预览和 DOCX 导出都不需要后端服务。

仓库 public 后，推荐直接用 GitHub Pages。项目已提供 `.github/workflows/deploy-pages.yml`：推送到 `main` 后会自动安装 pnpm、构建 Vite 静态页面，并发布 `dist/`。首次使用时在 GitHub 仓库 Settings -> Pages 中把 Source 设为 GitHub Actions；之后无需额外服务。

默认访问地址通常为 `https://mmwavelab.github.io/proposal-ledger/`。如果后续要使用自有域名，可以在 GitHub Pages 的 Custom domain 里绑定例如 `doc.mpas.top` 或 `ledger.mpas.top`，再把 DNS CNAME 指向 `mmwavelab.github.io`。

统计里的“已确认价格总额”只汇总已经能落到具体金额的行；如果某个项目仍有规格价待复核，会显示为“部分确认”或“待复核”，避免把起售价误当成完整预算。
校验脚本会检查申报目录层级、必填字段、价格表列、合计行、`申报书.md` 标题和本地图片/文件链接，并阻止 DOCX 生成产物进入申报目录。审查脚本会检查申报书中是否残留报销流程话术、内部素材备注、待补充痕迹和过于基础的调试目标。

## 自动统计

下面内容由 GitHub Actions 根据 `applications/**/README.md` 自动更新。

<!-- stats:start -->
- 申报总数: 8
- 已确认价格总额: ¥6,879.21
- 完整价格申报数: 8
- 部分确认金额申报数: 0
- 待复核金额申报数: 0
- 完整价格平均值: ¥859.90
- 成功率: 0.0%

| 状态 | 数量 |
| --- | ---: |
| 进行中/待补充 | 8 |

| 季度 | 申报数 | 金额 |
| --- | ---: | ---: |
| 2026/Q2 | 8 | ¥6,879.21 |

| 申报 | 归档 | 状态 | 成功情况 | 价格状态 | 金额 | 源文件 |
| --- | --- | --- | --- | --- | ---: | --- |
| [树莓派 SSD 采集计算套件采购](applications/2026/Q2/树莓派SSD计算套件/README.md) | 2026/Q2 | 待提交 | 待补充 | 已确认 | ¥2,969.00 | [md](applications/2026/Q2/树莓派SSD计算套件/申报书.md) |
| [实验室电子元器件采集](applications/2026/Q2/实验室电子元器件采集/README.md) | 2026/Q2 | 待提交 | 待补充 | 已确认 | ¥1,974.22 | [md](applications/2026/Q2/实验室电子元器件采集/申报书.md) |
| [AMS lite多材料供料系统购买](applications/2026/Q2/AMSlite多材料供料系统/README.md) | 2026/Q2 | 待提交 | 待补充 | 已确认 | ¥866.15 | [md](applications/2026/Q2/AMSlite多材料供料系统/申报书.md) |
| [3D打印实验耗材购买](applications/2026/Q2/3D打印耗材购买/README.md) | 2026/Q2 | 待提交 | 待补充 | 已确认 | ¥402.85 | [md](applications/2026/Q2/3D打印耗材购买/申报书.md) |
| [HOTO 小猴 PIXELDRIVE 电动螺丝刀采购](applications/2026/Q2/小猴电动螺丝刀/README.md) | 2026/Q2 | 待提交 | 待补充 | 已确认 | ¥289.00 | [md](applications/2026/Q2/小猴电动螺丝刀/申报书.md) |
| [BGA200内存颗粒返修工具采购](applications/2026/Q2/BGA200内存返修工具/README.md) | 2026/Q2 | 待提交 | 待补充 | 已确认 | ¥167.00 | [md](applications/2026/Q2/BGA200内存返修工具/申报书.md) |
| [瑞莎 Radxa Cubie A5E 迷你主板](applications/2026/Q2/瑞莎CubieA5E数据采集套件/README.md) | 2026/Q2 | 待提交 | 待补充 | 已确认 | ¥161.99 | [md](applications/2026/Q2/瑞莎CubieA5E数据采集套件/申报书.md) |
| [Tang Primer 25K 雷达 LVDS 采集 FPGA 套件采购](applications/2026/Q2/TangPrimer25K雷达LVDS采集FPGA/README.md) | 2026/Q2 | 待提交 | 待补充 | 已确认 | ¥49.00 | [md](applications/2026/Q2/TangPrimer25K雷达LVDS采集FPGA/申报书.md) |

| 排名 | 申报 | 价格 |
| ---: | --- | ---: |
| 1 | [树莓派 SSD 采集计算套件采购](applications/2026/Q2/树莓派SSD计算套件/README.md) | ¥2,969.00 |
| 2 | [实验室电子元器件采集](applications/2026/Q2/实验室电子元器件采集/README.md) | ¥1,974.22 |
| 3 | [AMS lite多材料供料系统购买](applications/2026/Q2/AMSlite多材料供料系统/README.md) | ¥866.15 |
| 4 | [3D打印实验耗材购买](applications/2026/Q2/3D打印耗材购买/README.md) | ¥402.85 |
| 5 | [HOTO 小猴 PIXELDRIVE 电动螺丝刀采购](applications/2026/Q2/小猴电动螺丝刀/README.md) | ¥289.00 |

_统计脚本: `scripts/update_stats.py`; 最近统计日期: 2026-05-27_
<!-- stats:end -->
