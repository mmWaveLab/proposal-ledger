# Tang Primer 25K 雷达 LVDS 采集 FPGA 套件采购

- 申报日期: 2026-05-21
- 申报状态: 待提交
- 申报结果: 待补充
- 成功情况: 待补充
- 负责人: 待补充
- 申报书: [申报书.docx](./申报书.docx)

## 图片文案资料

### 商品信息

- 商品名称: Sipeed Tang Primer 25K 高云 GW5A RISC-V FPGA 开发板 PMOD SDRAM
- 申报名称: Tang Primer 25K 雷达 LVDS 原始数据采集 FPGA 套件
- 选定规格: Tang Primer 25K 核心板 + 25K Dock 底板套件
- 主要用途: 用于雷达 LVDS 原始数据采集链路验证，并服务自研 1Gbps USB3.0 雷达采集卡开发。
- 淘宝搜索关键词: `Tang Primer 25K`
- 淘宝记录: 2026-05-21 淘宝桌面版短搜 `Tang Primer 25K`，当前记录价 `¥49.00`，后续以下单页复核为准。
- 官方文档页: https://wiki.sipeed.com/hardware/zh/tang/tang-primer-25k/primer-25k.html
- 官方硬件资料页: https://dl.sipeed.com/shareURL/TANG/Primer_25K
- 资料来源: 淘宝桌面版搜索截图；Sipeed 官方 Wiki 和硬件资料页。

### 图片

- 核心板产品图: ![Tang Primer 25K 核心板](assets/tang-primer-25k-core.jpg)
- Dock 底板产品图: ![Tang Primer 25K Dock](assets/tang-primer-25k-dock.jpg)
- Dock 顶视图: ![Tang Primer 25K Dock 顶视图](assets/tang-primer-25k-dock-top.jpg)
- 雷达采集卡实物预览图: ![雷达采集卡实物预览图](assets/radar-acquisition-card-preview.jpg)
- 待补充: 自研 1Gbps USB3.0 雷达采集卡连接关系图，建议保存到 `assets/radar-usb3-connection.png`。

### 文案

本项目拟购置 Tang Primer 25K FPGA 开发套件，包含基于 Gowin GW5A-LV25MG121 的 Tang Primer 25K 核心板及 25K Dock 底板。官方资料显示，该核心板提供 23040 个 LUT4 逻辑单元、23040 个寄存器、1008Kbit B-SRAM、28 个 18x18 乘法器、6 个 PLL、64Mbit NOR Flash、普通 IO 约 75 路和 MIPI 高速 IO；Dock 底板提供板载高速调试器、JTAG+UART、USB-C 烧录、USB-A、2x20Pin 插针、3 个 PMOD、按键和 64x40mm 板卡形态。

该套件拟用于雷达 LVDS 原始数据采集前端验证。雷达原始 ADC/LVDS 数据具有并行高速、时序约束严格、对同步和缓存路径敏感等特点，直接用普通 MCU 或上位机软件采集不利于稳定复现链路问题。FPGA 能够在硬件时序层完成 LVDS 接收、帧同步、解串、缓冲、测试 pattern 生成、采样时钟验证和错误计数，为后续 1Gbps USB3.0 雷达采集卡提供可验证的前端逻辑基础。

本采购与自研 1Gbps USB3.0 雷达采集卡形成互补：直接在采集卡上集成 FPGA 芯片成功率较低，因此先使用现有 FPGA 核心板贴合验证 LVDS 接收、时序约束、接口映射、测试向量和缓存策略。待采集链路稳定后，再将验证后的逻辑和接口方案固化到自研 USB3.0 雷达采集卡中，降低 PCB 回板后的定位成本。

### 资料提取结论

| 资料项 | 访问结果 | 对申报的作用 |
| --- | --- | --- |
| 淘宝搜索页 | 短搜 `Tang Primer 25K` 记录当前价 `¥49.00`，价格后续以下单页复核 | 支撑预算估算和采购对象 |
| Sipeed 官方 Wiki | 说明 Tang Primer 25K 核心板与 25K Dock 底板配套，列出 FPGA 和 Dock 参数 | 支撑技术规格和用途论证 |
| 官方硬件资料页 | 提供规格书、原理图、尺寸图、点位图、3D 模型和管脚资料 | 支撑后续 LVDS 接线、时序约束和采集卡联调 |
| 实物预览图 | 已保存现有核心板贴合雷达采集卡调试的实物照片 | 支撑“先用现有核心板验证 LVDS 接收”的技术路线 |

## 申报成功情况

- 当前状态: 待提交
- 结果说明: 待提交后补充
- 复盘记录: 待补充

## 价格情况

| 项目 | 数量 | 单价(CNY) | 小计(CNY) | 备注 |
| --- | ---: | ---: | ---: | --- |
| Tang Primer 25K FPGA 开发套件 | 1 | 49.00 | 49.00 | 当前记录价，核心板 + 25K Dock 套件；后续以下单页复核 |
| 合计 |  |  | 49.00 | 实际以审批后订单及发票为准 |

## 采购理由

- 用于雷达 LVDS 原始数据采集前端逻辑验证，避免直接在采集卡上集成 FPGA 芯片导致较低成功率。
- FPGA 适合实现 LVDS 接收、解串、帧同步、缓存、错误计数和测试 pattern 生成。
- 25K 规模足以开展中小型高速采集链路原型验证，成本低，适合作为实验室可复用验证平台。
- Dock 底板提供 PMOD、插针、USB-C 调试和板载调试器，便于快速接线、烧录和波形验证。
- 官方提供原理图、点位图、尺寸图和管脚资料，便于和自研 1Gbps USB3.0 雷达采集卡进行接口映射。
- 可形成 Gowin FPGA 工具链、时序约束、LVDS 约束、跨时钟域处理和高速采集链路调试记录。

## 使用计划

1. 完成 Tang Primer 25K 与 Dock 到货验收，确认烧录和 JTAG/UART 调试链路。
2. 建立 Gowin IDE 工程，完成基础点灯、时钟、PLL 和管脚约束验证。
3. 编写 LVDS 接收、解串、帧同步和测试 pattern 验证逻辑。
4. 使用逻辑分析仪或示波器验证关键时钟、同步信号和数据有效窗口。
5. 与自研 1Gbps USB3.0 雷达采集卡接口定义对齐，形成 FPGA 前端数据输出格式。
6. 输出一次完整联调记录，为后续自研采集卡固件/FPGA 逻辑移植提供参考。

## 验收标准

- 开发板能够稳定烧录并通过 JTAG/UART 完成调试。
- 至少完成一次 LVDS 接收或测试 pattern 采集链路验证。
- 能够形成管脚约束、时序约束和接口映射记录。
- 能够说明与自研 1Gbps USB3.0 雷达采集卡的连接关系和数据流路径。
- 商品截图、订单截图和到货照片补充到 `assets/`。
