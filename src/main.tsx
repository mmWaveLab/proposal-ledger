import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import JSZip from "jszip";
import { CheckCircle2, ChevronDown, Download, PackageCheck, RefreshCcw, Search, Sparkles } from "lucide-react";
import type { ProposalData, ProposalProject } from "./types/proposal";
import { EmojiIcon, type EmojiIconName } from "./lib/emojiIcons";
import { createProjectDocxBlob, docxFilename, downloadBlob, exportProjectDocx } from "./lib/docxExport";
import { markdownToHtml } from "./lib/markdown";
import "./styles.css";

type QuarterGroup = {
  key: string;
  label: string;
  projects: ProposalProject[];
};

type YearGroup = {
  key: string;
  label: string;
  quarters: QuarterGroup[];
};

function App() {
  const [data, setData] = useState<ProposalData | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState("正在读取申报项目...");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    fetch("./proposal-data.json")
      .then((response) => {
        if (!response.ok) throw new Error("没有找到 proposal-data.json，请先运行 pnpm run data。");
        return response.json() as Promise<ProposalData>;
      })
      .then((payload) => {
        setData(payload);
        setSelectedId(payload.projects[0]?.id ?? "");
        setOpenGroups(new Set(payload.projects.flatMap((project) => openKeysFor(project))));
        setStatus(`已载入 ${payload.projects.length} 个项目`);
      })
      .catch((error: Error) => setStatus(error.message));
  }, []);

  const projects = data?.projects ?? [];
  const filteredProjects = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return projects;
    return projects.filter((project) =>
      [project.displayName, project.name, project.archive, project.sourceRel].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    );
  }, [projects, query]);

  const groupedProjects = useMemo(() => groupProjects(filteredProjects), [filteredProjects]);
  const selected = projects.find((project) => project.id === selectedId) ?? filteredProjects[0] ?? projects[0];
  const checkedProjects = useMemo(
    () => projects.filter((project) => checkedIds.has(project.id)),
    [checkedIds, projects],
  );
  const totalAmount = useMemo(
    () => projects.reduce((sum, project) => sum + project.stats.totalAmount, 0),
    [projects],
  );

  function toggleOpen(key: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleChecked(projectId: string) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  function setQuarterChecked(projectIds: string[], checked: boolean) {
    setCheckedIds((current) => {
      const next = new Set(current);
      for (const id of projectIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function handleExport(project: ProposalProject) {
    setExporting(true);
    setStatus("正在生成当前 Word 文档...");
    try {
      await exportProjectDocx(project);
      setStatus(`已导出 ${docxFilename(project)}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "导出失败");
    } finally {
      setExporting(false);
    }
  }

  async function handleBatchExport() {
    if (!checkedProjects.length) return;
    setExporting(true);
    setStatus(`正在打包 ${checkedProjects.length} 份 DOCX...`);
    try {
      const zip = new JSZip();
      for (const project of checkedProjects) {
        const blob = await createProjectDocxBlob(project);
        zip.file(`${project.archive}/${docxFilename(project)}`, blob);
      }
      const packed = await zip.generateAsync({ type: "blob" });
      downloadBlob(packed, `proposal-docx-${checkedProjects.length}份.zip`);
      setStatus(`已打包导出 ${checkedProjects.length} 份 DOCX`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "批量导出失败");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#edf2f4] text-slate-950">
      <div className="grid min-h-screen grid-cols-[268px_minmax(0,1fr)] max-[980px]:grid-cols-1">
        <aside className="relative border-r border-white/80 bg-white/78 p-3 shadow-[12px_0_44px_rgba(20,36,50,0.07)] backdrop-blur-2xl max-[980px]:border-r-0 max-[980px]:border-b">
          <div className="absolute inset-x-3 top-3 h-24 rounded-lg bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(59,130,246,0.12),rgba(244,114,182,0.12))]" />
          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg border border-white/85 bg-white/78 p-3 shadow-sm">
              <div className="grid size-9 place-items-center rounded-md bg-slate-950 text-white">
                <EmojiIcon name="app" label="工作台" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-normal">DOCX 工作台</div>
                <div className="text-[11px] text-slate-500">静态预览 · 批量导出</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <Metric icon="project" label="项目" value={projects.length.toString()} />
              <Metric icon="budget" label="预算" value={totalAmount ? formatCurrency(totalAmount) : "待定"} />
              <Metric
                icon="image"
                label="图片"
                value={projects.reduce((sum, project) => sum + project.stats.images, 0).toString()}
              />
            </div>

            <label className="mt-3 flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-xs shadow-sm">
              <Search size={14} className="text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
                placeholder="搜索项目 / 年度 / 季度"
              />
            </label>

            <div className="mt-3 flex items-center justify-between rounded-md border border-emerald-100 bg-emerald-50/90 px-2.5 py-2 text-xs text-emerald-900">
              <span>已勾选 {checkedProjects.length} 项</span>
              <button
                disabled={!checkedProjects.length}
                onClick={() => setCheckedIds(new Set())}
                className="font-semibold text-emerald-700 disabled:opacity-40"
              >
                清空
              </button>
            </div>
          </div>

          <div className="mt-3 max-h-[calc(100vh-218px)] overflow-auto pr-0.5 max-[980px]:max-h-80">
            {groupedProjects.map((year) => (
              <AccordionSection
                key={year.key}
                label={year.label}
                count={year.quarters.reduce((sum, quarter) => sum + quarter.projects.length, 0)}
                open={openGroups.has(year.key)}
                onToggle={() => toggleOpen(year.key)}
                depth="year"
              >
                {year.quarters.map((quarter) => {
                  const ids = quarter.projects.map((project) => project.id);
                  const checkedCount = ids.filter((id) => checkedIds.has(id)).length;
                  return (
                    <AccordionSection
                      key={quarter.key}
                      label={quarter.label}
                      count={quarter.projects.length}
                      open={openGroups.has(quarter.key)}
                      onToggle={() => toggleOpen(quarter.key)}
                      depth="quarter"
                      action={
                        <label
                          className="flex items-center gap-1.5 text-[11px] text-slate-500"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={checkedCount === ids.length && ids.length > 0}
                            ref={(node) => {
                              if (node) node.indeterminate = checkedCount > 0 && checkedCount < ids.length;
                            }}
                            onChange={(event) => setQuarterChecked(ids, event.target.checked)}
                          />
                          全选
                        </label>
                      }
                    >
                      <div className="space-y-1.5 pb-2 pl-2">
                        {quarter.projects.map((project) => (
                          <ProjectRow
                            key={project.id}
                            project={project}
                            active={selected?.id === project.id}
                            checked={checkedIds.has(project.id)}
                            onSelect={() => setSelectedId(project.id)}
                            onChecked={() => toggleChecked(project.id)}
                          />
                        ))}
                      </div>
                    </AccordionSection>
                  );
                })}
              </AccordionSection>
            ))}
          </div>
        </aside>

        <main className="min-w-0">
          <header className="px-4 pb-1 pt-4 max-[760px]:px-3">
            <div className="mx-auto flex max-w-[1312px] items-center justify-between gap-3 rounded-lg border border-white/80 bg-white/72 px-4 py-3 shadow-sm backdrop-blur-xl max-[760px]:items-start max-[760px]:flex-col">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  <Sparkles size={13} />
                  Proposal Ledger
                </div>
                <h1 className="text-balance text-xl font-semibold leading-tight tracking-normal text-slate-950 max-[760px]:text-lg">
                  {selected?.displayName ?? "申报书预览"}
                </h1>
                <p className="mt-1 break-all text-xs text-slate-500">{selected?.sourceRel ?? "等待数据载入"}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <button onClick={() => window.location.reload()} className="control-button compact" title="重新读取静态数据">
                  <RefreshCcw size={15} />
                  刷新
                </button>
                <button
                  disabled={!selected || exporting}
                  onClick={() => selected && handleExport(selected)}
                  className="control-button compact"
                  title="在浏览器中生成并下载当前 DOCX"
                >
                  <Download size={15} />
                  当前
                </button>
                <button
                  disabled={!checkedProjects.length || exporting}
                  onClick={handleBatchExport}
                  className="control-button compact primary"
                  title="将勾选项目打包为 ZIP"
                >
                  <PackageCheck size={15} />
                  批量 {checkedProjects.length || ""}
                </button>
              </div>
            </div>
            <div className="mx-auto mt-2 max-w-[1312px] rounded-md border border-slate-200 bg-white/72 px-3 py-1.5 text-xs text-slate-600 shadow-sm">
              {status}
            </div>
          </header>

          {selected ? <Workspace project={selected} /> : <div className="p-8 text-slate-500">没有找到项目。</div>}
        </main>
      </div>
    </div>
  );
}

function Workspace({ project }: { project: ProposalProject }) {
  const html = useMemo(() => markdownToHtml(project.markdown), [project.markdown]);
  const checks: Array<{ icon: EmojiIconName; label: string; value: string }> = [
    { icon: "text", label: "字符", value: project.stats.characters.toLocaleString("zh-CN") },
    { icon: "project", label: "段落", value: project.stats.paragraphs.toString() },
    { icon: "table", label: "表格", value: project.stats.tables.toString() },
    { icon: "image", label: "图片", value: project.stats.images.toString() },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_220px] gap-3 p-4 max-[1180px]:grid-cols-1 max-[760px]:p-3">
      <AnimatePresence mode="wait">
        <motion.article
          key={project.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mx-auto w-full max-w-[1080px] rounded-lg border border-white bg-white px-10 py-9 shadow-[0_22px_70px_rgba(16,32,42,0.13)] max-[760px]:px-5 max-[760px]:py-6"
        >
          <div className="proposal-preview" dangerouslySetInnerHTML={{ __html: html }} />
        </motion.article>
      </AnimatePresence>

      <aside className="space-y-3">
        <section className="rounded-lg border border-white bg-white/78 p-3 shadow-sm backdrop-blur">
          <h2 className="mb-2 text-sm font-semibold tracking-normal">交付检查</h2>
          <div className="grid grid-cols-2 gap-1.5">
            {checks.map((item) => (
              <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <EmojiIcon name={item.icon} label={item.label} />
                  {item.label}
                </div>
                <div className="mt-0.5 text-sm font-semibold">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-white bg-slate-950 p-3 text-white shadow-sm">
          <h2 className="text-sm font-semibold tracking-normal">项目信息</h2>
          <Info label="归档" value={project.archive} />
          <Info label="状态" value={project.fields["申报状态"] || "待提交"} />
          <Info label="结果" value={project.fields["申报结果"] || "待补充"} />
          <Info label="总价" value={project.stats.totalAmount ? formatCurrency(project.stats.totalAmount) : "见正文"} />
        </section>

        <section className="rounded-lg border border-white bg-white/78 p-3 shadow-sm backdrop-blur">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold tracking-normal">
            <EmojiIcon name="deploy" label="部署" />
            静态部署
          </h2>
          <p className="text-xs leading-5 text-slate-600">Markdown 和图片会写入静态 JSON，部署后仍可预览与导出。</p>
        </section>
      </aside>
    </div>
  );
}

function AccordionSection({
  label,
  count,
  open,
  onToggle,
  children,
  depth,
  action,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  depth: "year" | "quarter";
  action?: React.ReactNode;
}) {
  return (
    <section className={clsx("mb-1.5 rounded-lg", depth === "year" && "border border-white/80 bg-white/48")}>
      <button
        type="button"
        onClick={onToggle}
        className={clsx(
          "flex w-full items-center justify-between gap-2 rounded-lg text-left transition hover:bg-white/80",
          depth === "year" ? "px-2.5 py-2" : "px-2 py-1.5",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <ChevronDown
            size={14}
            className={clsx("shrink-0 text-slate-400 transition", open ? "rotate-0" : "-rotate-90")}
          />
          <span className={clsx("truncate font-semibold", depth === "year" ? "text-xs" : "text-[12px] text-slate-700")}>
            {label}
          </span>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{count}</span>
        </span>
        {action}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className={depth === "year" ? "px-1 pb-1" : ""}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ProjectRow({
  project,
  active,
  checked,
  onSelect,
  onChecked,
}: {
  project: ProposalProject;
  active: boolean;
  checked: boolean;
  onSelect: () => void;
  onChecked: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "group flex w-full items-start gap-2 rounded-md border px-2 py-2 text-left transition",
        active ? "border-emerald-300 bg-emerald-50 shadow-sm" : "border-transparent bg-white/62 hover:border-slate-200 hover:bg-white",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onClick={(event) => event.stopPropagation()}
        onChange={onChecked}
        className="mt-0.5 size-3.5 accent-emerald-700"
      />
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-[12px] font-semibold leading-4">{project.displayName}</div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <span className="truncate">{formatCurrency(project.stats.totalAmount) || "见正文"}</span>
          {active && <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />}
        </div>
      </div>
    </button>
  );
}

function Metric({ icon, label, value }: { icon: EmojiIconName; label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/80 bg-white/72 px-2 py-2 shadow-sm">
      <div className="flex items-center gap-1 text-[10px] text-slate-500">
        <EmojiIcon name={icon} label={label} />
        {label}
      </div>
      <div className="mt-0.5 truncate text-[13px] font-semibold">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2.5 border-t border-white/12 pt-2.5">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-0.5 break-words text-xs">{value}</div>
    </div>
  );
}

function groupProjects(projects: ProposalProject[]): YearGroup[] {
  const years = new Map<string, Map<string, ProposalProject[]>>();
  for (const project of projects) {
    const [year = "未归档", quarter = "未分组"] = project.archive.split("/");
    if (!years.has(year)) years.set(year, new Map());
    const quarters = years.get(year)!;
    if (!quarters.has(quarter)) quarters.set(quarter, []);
    quarters.get(quarter)!.push(project);
  }

  return Array.from(years.entries())
    .sort(([a], [b]) => b.localeCompare(a, "zh-CN"))
    .map(([year, quarters]) => ({
      key: `year:${year}`,
      label: year,
      quarters: Array.from(quarters.entries())
        .sort(([a], [b]) => b.localeCompare(a, "zh-CN"))
        .map(([quarter, quarterProjects]) => ({
          key: `quarter:${year}/${quarter}`,
          label: quarter,
          projects: quarterProjects,
        })),
    }));
}

function openKeysFor(project: ProposalProject) {
  const [year = "未归档", quarter = "未分组"] = project.archive.split("/");
  return [`year:${year}`, `quarter:${year}/${quarter}`];
}

function formatCurrency(value: number) {
  if (!value) return "";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

const container = document.getElementById("root")!;
const globalRoot = globalThis as typeof globalThis & {
  __proposalLedgerRoot?: ReturnType<typeof createRoot>;
};
const root = globalRoot.__proposalLedgerRoot ?? createRoot(container);
globalRoot.__proposalLedgerRoot = root;

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
