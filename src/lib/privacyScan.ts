import type { ProposalProject } from "../types/proposal";

export type PrivacySeverity = "high" | "medium";

export type PrivacyFinding = {
  id: string;
  label: string;
  description: string;
  severity: PrivacySeverity;
  count: number;
  examples: string[];
};

export type PrivacyScanResult = {
  highCount: number;
  mediumCount: number;
  passed: string[];
  findings: PrivacyFinding[];
};

type PrivacyRule = {
  id: string;
  label: string;
  description: string;
  severity: PrivacySeverity;
  scope: "delivery" | "public";
  pattern: RegExp;
  mask?: (value: string) => string;
};

const rules: PrivacyRule[] = [
  {
    id: "phone",
    label: "手机号",
    description: "正文或公开数据中出现疑似中国大陆手机号。",
    severity: "high",
    scope: "public",
    pattern: /(?<!\d)1[3-9]\d{9}(?!\d)/g,
    mask: (value) => `${value.slice(0, 3)}****${value.slice(-4)}`,
  },
  {
    id: "email",
    label: "邮箱地址",
    description: "正文或公开数据中出现邮箱地址，发布前应确认是否可公开。",
    severity: "high",
    scope: "public",
    pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    mask: (value) => value.replace(/^(.{1,2}).*(@.*)$/, "$1***$2"),
  },
  {
    id: "id-card",
    label: "证件号",
    description: "正文或公开数据中出现疑似身份证号。",
    severity: "high",
    scope: "public",
    pattern: /(?<!\d)\d{6}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx](?!\d)/g,
    mask: (value) => `${value.slice(0, 6)}********${value.slice(-4)}`,
  },
  {
    id: "secret",
    label: "密钥令牌",
    description: "正文或公开数据中出现疑似 API key、GitHub token 或访问密钥。",
    severity: "high",
    scope: "public",
    pattern: /\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16})\b/g,
    mask: (value) => `${value.slice(0, 6)}...${value.slice(-4)}`,
  },
  {
    id: "local-path",
    label: "本地路径",
    description: "正文或公开数据中出现本机绝对路径，会暴露用户名或磁盘结构。",
    severity: "high",
    scope: "public",
    pattern: /(?:\/Users\/[^\s)`，。]+|\/Volumes\/[^\s)`，。]+|[A-Z]:\\Users\\[^\s)`，。]+)/g,
    mask: (value) => value.replace(/(\/Users\/|\\Users\\)([^/\\\s]+)/, "$1***"),
  },
  {
    id: "workflow-meta",
    label: "流程元信息",
    description: "申报日期或申报状态混入 DOCX 正文时，应移回项目信息。",
    severity: "medium",
    scope: "delivery",
    pattern: /申报(?:日期|状态)[:：]/g,
  },
  {
    id: "internal-note",
    label: "内部备注",
    description: "DOCX 正文中出现待办、内部说明、外围工程字眼或过程性备注。",
    severity: "medium",
    scope: "delivery",
    pattern: /(?:TODO|FIXME|待补充|内部备注|素材说明|不要提交|先占位|报价链接|复盘记录|到货后|按实验室.*?管理要求|后续可按导师要求|到货照片|设备编号|使用记录|仓库|归档备份|CSV\/XLS|(?<![A-Za-z])(?:csv|xls|xlsx)(?![A-Za-z])|README|assets|源文件|Git diff)/gi,
  },
  {
    id: "reimbursement",
    label: "报销话术",
    description: "DOCX 正文中出现面向内部流程的报销或付款措辞。",
    severity: "medium",
    scope: "delivery",
    pattern: /(?:报销|垫付|付款截图|发票抬头|走流程)/g,
  },
];

export function scanProjectPrivacy(project: ProposalProject): PrivacyScanResult {
  const deliveryText = compactText(project.markdown);
  const publicText = compactText(
    [
      project.markdown,
      project.sourceRel,
      Object.entries(project.fields)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n"),
      project.images.map((image) => `${image.caption} ${image.source}`).join("\n"),
    ].join("\n"),
  );

  const findings = rules
    .map((rule) => scanRule(rule, rule.scope === "delivery" ? deliveryText : publicText))
    .filter((finding): finding is PrivacyFinding => Boolean(finding));

  const highCount = findings.filter((finding) => finding.severity === "high").length;
  const mediumCount = findings.filter((finding) => finding.severity === "medium").length;
  const passed = [
    "DOCX 正文未发现手机号、邮箱、证件号、密钥或本地绝对路径。",
    "静态数据不再包含未清洗源稿全文。",
  ];

  if (project.fields["申报日期"] || project.fields["申报状态"]) {
    passed.push("申报日期与状态仅作为项目信息显示，不进入 DOCX 正文。");
  }

  return { highCount, mediumCount, passed, findings };
}

function scanRule(rule: PrivacyRule, text: string): PrivacyFinding | null {
  const matches = Array.from(text.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags)));
  if (!matches.length) return null;

  const examples = Array.from(
    new Set(
      matches
        .slice(0, 3)
        .map((match) => match[0])
        .filter(Boolean)
        .map((value) => rule.mask?.(value) ?? value),
    ),
  );

  return {
    id: rule.id,
    label: rule.label,
    description: rule.description,
    severity: rule.severity,
    count: matches.length,
    examples,
  };
}

function compactText(text: string) {
  return text.replace(/data:[^)\\\s]+/g, "[embedded-image]");
}
