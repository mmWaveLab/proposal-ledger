import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, ChevronDown, Download, ListTree, RefreshCcw, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ProposalData, ProposalProject } from "./types/proposal";
import { EmojiIcon, type EmojiIconName } from "./lib/emojiIcons";
import { docxFilename, exportProjectDocx } from "./lib/docxExport";
import { extractOutline, markdownToHtml, type OutlineItem } from "./lib/markdown";
import { scanProjectPrivacy, type PrivacyFinding } from "./lib/privacyScan";
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
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());

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

  useEffect(() => {
    setCheckedIds((current) => {
      const validIds = new Set(projects.map((project) => project.id));
      const next = new Set(Array.from(current).filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [projects]);

  function toggleOpen(key: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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

  function toggleProjectChecked(project: ProposalProject) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(project.id)) next.delete(project.id);
      else next.add(project.id);
      return next;
    });
  }

  function setProjectGroupChecked(groupProjects: ProposalProject[], checked: boolean) {
    setCheckedIds((current) => {
      const next = new Set(current);
      for (const project of groupProjects) {
        if (checked) next.add(project.id);
        else next.delete(project.id);
      }
      return next;
    });
  }

  function groupCheckState(groupProjects: ProposalProject[]) {
    const checked = groupProjects.filter((project) => checkedIds.has(project.id)).length;
    return {
      checked,
      allChecked: checked > 0 && checked === groupProjects.length,
      label: checked ? `${checked}/${groupProjects.length}` : "全选",
    };
  }

  async function handleBatchExport() {
    if (!checkedProjects.length) return;
    setExporting(true);
    setStatus(`正在下载 ${checkedProjects.length} 份 Word 文档...`);
    try {
      for (const [index, project] of checkedProjects.entries()) {
        setStatus(`正在下载第 ${index + 1}/${checkedProjects.length} 份：${docxFilename(project)}`);
        await exportProjectDocx(project);
        await sleep(180);
      }
      setStatus(`已触发下载 ${checkedProjects.length} 份 DOCX`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "批量导出失败");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="h-dvh overflow-hidden bg-[#edf2f4] text-slate-950 max-[980px]:h-auto max-[980px]:overflow-visible">
      <div className="grid h-dvh min-h-0 grid-cols-[268px_minmax(0,1fr)] max-[980px]:h-auto max-[980px]:grid-cols-1">
        <aside className="relative flex h-dvh min-h-0 flex-col overflow-hidden border-r border-white/80 bg-white/78 p-3 shadow-[12px_0_44px_rgba(20,36,50,0.07)] backdrop-blur-2xl max-[980px]:h-auto max-[980px]:border-r-0 max-[980px]:border-b">
          <div className="absolute inset-x-3 top-3 h-24 rounded-lg bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(59,130,246,0.12),rgba(244,114,182,0.12))]" />
          <div className="relative shrink-0">
            <div className="flex items-center gap-2 rounded-lg border border-white/85 bg-white/78 p-3 shadow-sm">
              <div className="grid size-9 place-items-center rounded-md bg-slate-950 text-white">
                <EmojiIcon name="app" label="工作台" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-normal">DOCX 工作台</div>
                <div className="text-[11px] text-slate-500">静态预览 · 批量下载</div>
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

            <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50/90 px-2.5 py-2 text-xs text-emerald-900">
              勾选后可批量下载单份 DOCX，点击项目名预览。
            </div>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-auto pr-0.5 max-[980px]:max-h-80">
            {groupedProjects.map((year) => (
              <AccordionSection
                key={year.key}
                label={year.label}
                count={year.quarters.reduce((sum, quarter) => sum + quarter.projects.length, 0)}
                open={openGroups.has(year.key)}
                onToggle={() => toggleOpen(year.key)}
                depth="year"
                action={
                  <GroupCheckAction
                    state={groupCheckState(year.quarters.flatMap((quarter) => quarter.projects))}
                    onToggle={(checked) => setProjectGroupChecked(year.quarters.flatMap((quarter) => quarter.projects), checked)}
                  />
                }
              >
                {year.quarters.map((quarter) => (
                    <AccordionSection
                      key={quarter.key}
                      label={quarter.label}
                      count={quarter.projects.length}
                      open={openGroups.has(quarter.key)}
                      onToggle={() => toggleOpen(quarter.key)}
                      depth="quarter"
                      action={
                        <GroupCheckAction
                          state={groupCheckState(quarter.projects)}
                          onToggle={(checked) => setProjectGroupChecked(quarter.projects, checked)}
                        />
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
                            onToggleCheck={() => toggleProjectChecked(project)}
                          />
                        ))}
                      </div>
                    </AccordionSection>
                ))}
              </AccordionSection>
            ))}
          </div>
        </aside>

        <main className="flex h-dvh min-w-0 flex-col overflow-hidden max-[980px]:h-auto max-[980px]:overflow-visible">
          <header className="shrink-0 px-4 pb-1 pt-4 max-[760px]:px-3">
            <div className="mx-auto flex max-w-[1312px] items-center justify-between gap-3 rounded-lg border border-white/80 bg-white/72 px-4 py-3 shadow-sm backdrop-blur-xl max-[760px]:items-start max-[760px]:flex-col">
              <div className="min-w-0">
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
                  title="逐个下载勾选项目的 DOCX"
                >
                  <Download size={15} />
                  批量 {checkedProjects.length || ""}
                </button>
              </div>
            </div>
            <div className="mx-auto mt-2 max-w-[1312px] rounded-md border border-slate-200 bg-white/72 px-3 py-1.5 text-xs text-slate-600 shadow-sm">
              {status}
            </div>
          </header>

          {selected ? (
            <Workspace project={selected} />
          ) : (
            <div className="min-h-0 flex-1 overflow-auto p-8 text-slate-500">没有找到项目。</div>
          )}
        </main>
      </div>
    </div>
  );
}

function Workspace({ project }: { project: ProposalProject }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const html = useMemo(() => markdownToHtml(project.markdown), [project.markdown]);
  const outline = useMemo(() => extractOutline(project.markdown), [project.markdown]);
  const [activeHeading, setActiveHeading] = useState(outline[0]?.id ?? "");
  const privacy = useMemo(() => scanProjectPrivacy(project), [project]);
  const checks: Array<{ icon: EmojiIconName; label: string; value: string }> = [
    { icon: "text", label: "字符", value: project.stats.characters.toLocaleString("zh-CN") },
    { icon: "project", label: "段落", value: project.stats.paragraphs.toString() },
    { icon: "table", label: "表格", value: project.stats.tables.toString() },
    { icon: "image", label: "图片", value: project.stats.images.toString() },
  ];

  useEffect(() => {
    setActiveHeading(outline[0]?.id ?? "");
  }, [outline]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !outline.length) return;

    const updateActiveHeading = () => {
      const headings = outline
        .map((item) => document.getElementById(item.id))
        .filter((element): element is HTMLElement => Boolean(element));
      const containerTop = container.getBoundingClientRect().top;
      const current =
        headings
          .map((heading) => ({
            id: heading.id,
            offset: heading.getBoundingClientRect().top - containerTop,
          }))
          .filter((heading) => heading.offset <= 96)
          .at(-1) ?? headings[0];
      if (current) setActiveHeading(current.id);
    };

    updateActiveHeading();
    container.addEventListener("scroll", updateActiveHeading, { passive: true });
    return () => container.removeEventListener("scroll", updateActiveHeading);
  }, [outline, project.id]);

  function jumpToHeading(id: string) {
    const heading = document.getElementById(id);
    if (!heading) return;
    heading.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveHeading(id);
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_260px] gap-3 overflow-hidden p-4 max-[980px]:grid-cols-1 max-[980px]:overflow-visible max-[760px]:p-3">
      <div ref={scrollRef} className="proposal-scroll min-h-0 overflow-y-auto overflow-x-hidden pr-1 max-[980px]:overflow-visible max-[980px]:pr-0">
        <AnimatePresence mode="wait">
          <motion.article
            key={project.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mx-auto w-full max-w-[1120px] rounded-lg border border-white bg-white px-11 py-9 shadow-[0_22px_70px_rgba(16,32,42,0.13)] max-[760px]:px-5 max-[760px]:py-6"
          >
            <div className="proposal-preview" dangerouslySetInnerHTML={{ __html: html }} />
          </motion.article>
        </AnimatePresence>
      </div>

      <aside className="proposal-scroll min-h-0 space-y-3 overflow-y-auto overflow-x-hidden pr-0.5 max-[980px]:overflow-visible max-[980px]:pr-0">
        <section className="rounded-lg border border-white bg-white/82 p-3 shadow-sm backdrop-blur">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold tracking-normal">
            <ListTree size={15} className="text-emerald-700" />
            正文大纲
          </h2>
          <div className="space-y-1">
            {outline.map((item) => (
              <OutlineButton
                key={item.id}
                item={item}
                active={activeHeading === item.id}
                onClick={() => jumpToHeading(item.id)}
              />
            ))}
          </div>
        </section>

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

        <PrivacyPanel result={privacy} />

        <section className="rounded-lg border border-white bg-slate-950 p-3 text-white shadow-sm">
          <h2 className="text-sm font-semibold tracking-normal">项目信息</h2>
          <Info label="归档" value={project.archive} />
          <Info label="日期" value={project.fields["申报日期"] || "未记录"} />
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

function OutlineButton({
  item,
  active,
  onClick,
}: {
  item: OutlineItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[11px] leading-4 transition",
        item.depth === 1 && "font-semibold",
        item.depth === 2 && "pl-4",
        item.depth >= 3 && "pl-6 text-slate-500",
        active ? "bg-emerald-50 text-emerald-900 shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-950",
      )}
    >
      <span
        className={clsx(
          "mt-1 size-1.5 shrink-0 rounded-full transition",
          active ? "bg-emerald-600" : "bg-slate-300 group-hover:bg-slate-500",
        )}
      />
      <span className="line-clamp-2">{item.text}</span>
    </button>
  );
}

function PrivacyPanel({ result }: { result: ReturnType<typeof scanProjectPrivacy> }) {
  const hasHighRisk = result.highCount > 0;
  const hasWarning = result.mediumCount > 0;
  const status = hasHighRisk ? "发现高风险" : hasWarning ? "建议复核" : "未见明显泄漏";
  const description = hasHighRisk
    ? "导出或公开前先处理红色项。"
    : hasWarning
      ? "没有敏感硬伤，但有交付措辞需要看一眼。"
      : "DOCX 正文与公开数据通过基础检查。";

  return (
    <section
      className={clsx(
        "rounded-lg border p-3 shadow-sm backdrop-blur",
        hasHighRisk
          ? "border-rose-200 bg-rose-50/92"
          : hasWarning
            ? "border-amber-200 bg-amber-50/92"
            : "border-emerald-100 bg-emerald-50/90",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-normal">
            {hasHighRisk ? (
              <ShieldAlert size={15} className="text-rose-600" />
            ) : (
              <ShieldCheck size={15} className={hasWarning ? "text-amber-600" : "text-emerald-600"} />
            )}
            隐私泄漏检查
          </h2>
          <p className="mt-1 text-[11px] leading-4 text-slate-600">{description}</p>
        </div>
        <span
          className={clsx(
            "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold",
            hasHighRisk
              ? "bg-rose-100 text-rose-700"
              : hasWarning
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-700",
          )}
        >
          {status}
        </span>
      </div>

      {result.findings.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {result.findings.map((finding) => (
            <PrivacyFindingRow key={finding.id} finding={finding} />
          ))}
        </div>
      ) : (
        <div className="mt-2 space-y-1">
          {result.passed.slice(0, 3).map((item) => (
            <div key={item} className="flex gap-1.5 text-[11px] leading-4 text-emerald-800">
              <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PrivacyFindingRow({ finding }: { finding: PrivacyFinding }) {
  const high = finding.severity === "high";
  return (
    <div className={clsx("rounded-md border bg-white/78 px-2.5 py-2", high ? "border-rose-200" : "border-amber-200")}>
      <div className="flex items-center justify-between gap-2">
        <div className={clsx("flex items-center gap-1.5 text-[12px] font-semibold", high ? "text-rose-800" : "text-amber-900")}>
          <AlertTriangle size={13} />
          {finding.label}
        </div>
        <span className={clsx("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", high ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800")}>
          {finding.count}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-slate-600">{finding.description}</p>
      {finding.examples.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {finding.examples.map((example) => (
            <code key={example} className="max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
              {example}
            </code>
          ))}
        </div>
      )}
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

function GroupCheckAction({
  state,
  onToggle,
}: {
  state: { checked: number; allChecked: boolean; label: string };
  onToggle: (checked: boolean) => void;
}) {
  return (
    <span
      role="checkbox"
      aria-checked={state.allChecked}
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        onToggle(!state.allChecked);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        onToggle(!state.allChecked);
      }}
      className={clsx(
        "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold transition",
        state.checked
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white/80 text-slate-500 hover:border-slate-300",
      )}
    >
      {state.label}
    </span>
  );
}

function ProjectRow({
  project,
  active,
  checked,
  onSelect,
  onToggleCheck,
}: {
  project: ProposalProject;
  active: boolean;
  checked: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
}) {
  return (
    <div
      className={clsx(
        "group flex w-full items-start gap-2 rounded-md border px-2 py-2 text-left transition",
        active ? "border-emerald-300 bg-emerald-50 shadow-sm" : "border-transparent bg-white/62 hover:border-slate-200 hover:bg-white",
      )}
    >
      <button
        type="button"
        onClick={onToggleCheck}
        className={clsx(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded border transition",
          checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent",
        )}
        aria-label={checked ? `取消勾选 ${project.displayName}` : `勾选 ${project.displayName}`}
        title={checked ? "取消勾选" : "勾选导出"}
      >
        <CheckCircle2 size={12} />
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <div className="line-clamp-2 text-[12px] font-semibold leading-4">{project.displayName}</div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <span className="truncate">{formatCurrency(project.stats.totalAmount) || "见正文"}</span>
          {active && <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />}
        </div>
      </button>
    </div>
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

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
