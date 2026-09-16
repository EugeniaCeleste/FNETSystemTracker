"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, ExternalLink, Filter, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { TaskStatus } from "@/contracts";
import type { PendingVisit, PreventiveAnalyticsData, PreventiveAnalyticsRow, PreventiveSiteSummary } from "@/contracts";

type PageState = "loading" | "ready" | "error";
type SiteStateFilter = "all" | "complete" | "incomplete";

const statusOptions: Array<[TaskStatus, string]> = [
  [TaskStatus.APPROVED, "Aprobado"],
  [TaskStatus.IN_PROGRESS, "En proceso"],
  [TaskStatus.IN_REVIEW, "En revisión"],
  [TaskStatus.REJECTED, "Rechazado"],
  [TaskStatus.APPROVED_WITH_PENDING, "Aprobado con pendientes"],
  [TaskStatus.OPEN, "Abierto"],
  [TaskStatus.SENT, "Enviada"],
  [TaskStatus.CANCELLED, "Cancelado"],
];

function statusLabel(status: TaskStatus): string {
  return statusOptions.find(([value]) => value === status)?.[1] ?? status;
}

function statusTone(status: TaskStatus): string {
  if (status === TaskStatus.APPROVED) return "success";
  if (status === TaskStatus.APPROVED_WITH_PENDING || status === TaskStatus.IN_PROGRESS || status === TaskStatus.IN_REVIEW) return "warning";
  if (status === TaskStatus.REJECTED || status === TaskStatus.CANCELLED) return "danger";
  return "neutral";
}

function dateOnly(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function dateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function responsibleValues(item: PreventiveAnalyticsRow): string[] {
  return [item.responsible, item.collaborator, item.contractor, item.supplierResponsibles].filter((value): value is string => Boolean(value?.trim()));
}

function siteSummary(items: PreventiveAnalyticsRow[], source: PreventiveSiteSummary[]): PreventiveSiteSummary[] {
  const pendingMap = new Map(source.map((site) => [site.siteCode, site.previousVisitPending]));
  const grouped = new Map<string, PreventiveAnalyticsRow[]>();
  for (const item of items) {
    if (!item.siteCode) continue;
    grouped.set(item.siteCode, [...(grouped.get(item.siteCode) ?? []), item]);
  }
  return [...grouped.entries()].map(([siteCode, forms]) => {
    const approved = forms.filter((form) => form.status === TaskStatus.APPROVED).length;
    return {
      siteCode,
      siteName: forms.find((form) => form.siteName)?.siteName ?? null,
      total: forms.length,
      approved,
      pending: forms.length - approved,
      complete: forms.length > 0 && approved === forms.length,
      forms,
      previousVisitPending: pendingMap.get(siteCode) ?? [],
    };
  }).sort((left, right) => left.siteCode.localeCompare(right.siteCode));
}

function Metric({ label, value, detail, tone, onClick }: { label: string; value: number | string; detail: string; tone: string; onClick?: () => void }) {
  const content = <><span>{label}</span><strong>{value}</strong><small>{detail}{onClick && <ArrowUpRight size={11} />}</small></>;
  return onClick ? <button className={`summary-card preventive-metric-card accent-${tone}`} type="button" onClick={onClick}>{content}</button> : <div className={`summary-card preventive-metric-card accent-${tone}`}>{content}</div>;
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`status-badge ${statusTone(status)}`}><span className="status-dot" />{statusLabel(status)}</span>;
}

function PreviousPending({ items }: { items: PendingVisit[] }) {
  if (items.length === 0) return <p className="table-muted">No hay pendientes de visitas anteriores relacionados por `codigo_sitio`.</p>;
  return <div className="preventive-pending-list">{items.map((item) => <div className="preventive-pending-row" key={item.id}><strong>{item.formulario}</strong><span>{item.comments ?? item.question ?? "Pendiente sin comentario informado"}</span><small>{item.pendingStatus}</small></div>)}</div>;
}

function SiteDetail({ site, onClose }: { site: PreventiveSiteSummary; onClose: () => void }) {
  const firstLink = site.forms.find((form) => form.link)?.link ?? null;
  return <section className="panel preventive-site-detail" aria-label={`Detalle del sitio ${site.siteCode}`}><div className="panel-heading"><div><p className="eyebrow">Detalle del sitio</p><h2>{site.siteCode}</h2><p className="page-subtitle">{site.siteName ?? "Sin nombre informado"}</p></div><button className="icon-button" type="button" aria-label="Cerrar detalle del sitio" onClick={onClose}><X size={17} /></button></div><div className="preventive-detail-grid"><div><span>Código</span><strong>{site.siteCode}</strong></div><div><span>Estado</span><strong>{site.complete ? "Completo" : "Incompleto"}</strong></div><div><span>Formularios</span><strong>{site.total}</strong></div><div><span>Aprobados</span><strong>{site.approved}</strong></div><div><span>Pendientes</span><strong>{site.pending}</strong></div></div><div className="preventive-detail-block"><h3>Formularios del sitio</h3><div className="preventive-detail-table">{site.forms.map((form) => <div className="preventive-detail-form" key={form.id}><div><strong>{form.code}</strong><small>{form.template ?? "Sin plantilla informada"}</small></div><StatusBadge status={form.status} /><span>{dateOnly(form.plannedAt)}</span><span>{responsibleValues(form).join(" · ") || "Sin responsables informados"}</span>{form.link && <a href={form.link} target="_blank" rel="noreferrer" aria-label={`Abrir ${form.code} en Sytex`}><ExternalLink size={14} /></a>}</div>)}</div></div><div className="preventive-detail-block"><h3>Pendientes de visitas anteriores</h3><PreviousPending items={site.previousVisitPending} /></div>{firstLink && <a className="button secondary small preventive-sytex-link" href={firstLink} target="_blank" rel="noreferrer">Abrir en Sytex <ExternalLink size={14} /></a>}</section>;
}

export function PreventiveAnalyticsPage() {
  const [data, setData] = useState<PreventiveAnalyticsData | null>(null);
  const [state, setState] = useState<PageState>("loading");
  const [reloadToken, setReloadToken] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [project, setProject] = useState("");
  const [site, setSite] = useState("");
  const [status, setStatus] = useState("");
  const [template, setTemplate] = useState("");
  const [siteState, setSiteState] = useState<SiteStateFilter>("all");
  const [selectedSiteCode, setSelectedSiteCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/preventivos/analytics", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("database_unavailable");
      return response.json() as Promise<PreventiveAnalyticsData>;
    }).then((nextData) => { if (!cancelled) { setData(nextData); setState("ready"); } }).catch(() => { if (!cancelled) { setData(null); setState("error"); } });
    return () => { cancelled = true; };
  }, [reloadToken]);

  const projects = useMemo(() => [...new Set((data?.items ?? []).map((item) => item.project).filter((value): value is string => Boolean(value)))].sort(), [data]);
  const templates = useMemo(() => [...new Set((data?.items ?? []).map((item) => item.template).filter((value): value is string => Boolean(value)))].sort(), [data]);
  const filteredItems = useMemo(() => (data?.items ?? []).filter((item) => {
    const plannedDate = dateInputValue(item.plannedAt);
    return (!dateFrom || (plannedDate && plannedDate >= dateFrom)) && (!dateTo || (plannedDate && plannedDate <= dateTo)) && (!project || item.project === project) && (!site || `${item.siteCode ?? ""} ${item.siteName ?? ""}`.toLowerCase().includes(site.toLowerCase())) && (!status || item.status === status) && (!template || item.template === template);
  }), [data, dateFrom, dateTo, project, site, status, template]);
  const allSites = useMemo(() => siteSummary(filteredItems, data?.sites ?? []), [data, filteredItems]);
  const sites = useMemo(() => allSites.filter((item) => siteState === "all" || (siteState === "complete" ? item.complete : !item.complete)), [allSites, siteState]);
  const siteCodesForDisplay = useMemo(() => new Set(sites.map((item) => item.siteCode)), [sites]);
  const displayItems = siteState === "all" ? filteredItems : filteredItems.filter((item) => item.siteCode !== null && siteCodesForDisplay.has(item.siteCode));
  const selectedSite = sites.find((item) => item.siteCode === selectedSiteCode) ?? null;
  const counts = useMemo(() => ({
    total: filteredItems.length,
    approved: filteredItems.filter((item) => item.status === TaskStatus.APPROVED).length,
    inProgress: filteredItems.filter((item) => item.status === TaskStatus.IN_PROGRESS).length,
    inReview: filteredItems.filter((item) => item.status === TaskStatus.IN_REVIEW).length,
    rejected: filteredItems.filter((item) => item.status === TaskStatus.REJECTED).length,
    approvedWithPending: filteredItems.filter((item) => item.status === TaskStatus.APPROVED_WITH_PENDING).length,
  }), [filteredItems]);
  const projectStatuses = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const item of filteredItems) {
      const key = `${item.project ?? "Sin proyecto informado"}\u0000${item.status}`;
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }
    return [...grouped.entries()].map(([key, count]) => { const [projectName, statusValue] = key.split("\u0000"); return { project: projectName, status: statusValue as TaskStatus, count }; }).sort((left, right) => left.project.localeCompare(right.project) || left.status.localeCompare(right.status));
  }, [filteredItems]);
  const completeSites = sites.filter((item) => item.complete).length;
  const incompleteSites = sites.length - completeSites;
  const clearFilters = () => { setDateFrom(""); setDateTo(""); setProject(""); setSite(""); setStatus(""); setTemplate(""); setSiteState("all"); };
  const refresh = () => { setState("loading"); setReloadToken((value) => value + 1); };
  const chooseStatus = (value: string) => { setStatus(value); setSiteState("all"); document.getElementById("preventive-forms")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const chooseProjectStatus = (projectName: string, statusValue: TaskStatus) => { setProject(projectName === "Sin proyecto informado" ? "" : projectName); setStatus(statusValue); setSiteState("all"); document.getElementById("preventive-forms")?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  return <main className="standalone-resource-page preventive-analytics-page"><div className="standalone-resource-header"><div><p className="eyebrow">FNET System Tracker · fuente oficial</p><h1>Preventivos</h1><p className="page-subtitle">Formularios, cumplimiento por sitio y desglose por proyecto.</p></div><div className="operational-header-actions"><div className="data-source-tag"><span className="signal-dot" /> PostgreSQL · solo lectura</div><button className="button secondary small" type="button" onClick={refresh}><RefreshCw size={15} /> {state === "loading" ? "Consultando" : "Actualizar"}</button></div></div>{state === "error" && <div className="urgent-banner"><div className="urgent-symbol"><AlertTriangle size={20} /></div><div><strong>No se pudo consultar PostgreSQL</strong><span>La vista no incorpora mocks. Verificá la conectividad desde tu PC.</span></div><button type="button" onClick={refresh}>Reintentar <RefreshCw size={15} /></button></div>}{state === "loading" && <div className="resource-empty">Consultando PostgreSQL…</div>}{state === "ready" && data && <><section className="panel preventive-filter-panel"><div className="panel-heading"><div><p className="eyebrow">Filtros oficiales</p><h2>Período y alcance</h2></div><button className="text-button" type="button" onClick={clearFilters}><Filter size={14} /> Limpiar filtros</button></div><div className="preventive-filters"><label>Desde<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label>Hasta<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label><label>Proyecto<select value={project} onChange={(event) => setProject(event.target.value)}><option value="">Todos</option>{projects.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Sitio<div className="preventive-search-input"><Search size={14} /><input placeholder="Código o nombre" value={site} onChange={(event) => setSite(event.target.value)} /></div></label><label>Estado<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Plantilla<select value={template} onChange={(event) => setTemplate(event.target.value)}><option value="">Todas</option>{templates.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div></section><div className="operational-kpis preventive-kpis"><Metric label="Formularios totales" value={counts.total} detail="conjunto filtrado" tone="blue" onClick={() => chooseStatus("")} /><Metric label="Aprobados" value={counts.approved} detail="estado aprobado" tone="green" onClick={() => chooseStatus(TaskStatus.APPROVED)} /><Metric label="En proceso" value={counts.inProgress} detail="estado oficial" tone="orange" onClick={() => chooseStatus(TaskStatus.IN_PROGRESS)} /><Metric label="En revisión" value={counts.inReview} detail="estado oficial" tone="purple" onClick={() => chooseStatus(TaskStatus.IN_REVIEW)} /><Metric label="Rechazados" value={counts.rejected} detail="requieren corrección" tone="red" onClick={() => chooseStatus(TaskStatus.REJECTED)} /><Metric label="Aprobados con pendientes" value={counts.approvedWithPending} detail="pendientes separados" tone="orange" onClick={() => chooseStatus(TaskStatus.APPROVED_WITH_PENDING)} /><Metric label="Sitios completos" value={completeSites} detail="todos sus formularios aprobados" tone="green" onClick={() => setSiteState("complete")} /><Metric label="Sitios incompletos" value={incompleteSites} detail="algún formulario pendiente" tone="red" onClick={() => setSiteState("incomplete")} /></div><div className="preventive-analytics-grid"><section className="panel preventive-project-panel"><div className="panel-heading"><div><p className="eyebrow">Desglose por proyecto</p><h2>Proyecto + estado</h2></div><span className="table-muted">{projectStatuses.length} combinaciones</span></div>{projectStatuses.length === 0 ? <div className="resource-empty">Sin datos para los filtros seleccionados.</div> : <div className="preventive-project-list">{projectStatuses.map((entry) => <button type="button" className="preventive-project-row" key={`${entry.project}-${entry.status}`} onClick={() => chooseProjectStatus(entry.project, entry.status)}><span><strong>{entry.project}</strong><small><StatusBadge status={entry.status} /></small></span><strong>{entry.count}</strong><ArrowUpRight size={14} /></button>)}</div>}</section><section className="panel preventive-sites-panel"><div className="panel-heading"><div><p className="eyebrow">Cumplimiento por sitio</p><h2>Sitios</h2></div><span className="table-muted">{sites.length} con código informado</span></div>{sites.length === 0 ? <div className="resource-empty">No hay sitios con `codigo_sitio` para estos filtros.</div> : <div className="preventive-site-list">{sites.map((item) => <button type="button" className="preventive-site-row" key={item.siteCode} onClick={() => setSelectedSiteCode(item.siteCode)}><span><strong>{item.siteCode}</strong><small>{item.siteName ?? "Sin nombre informado"}</small></span><span><b>{item.approved}/{item.total}</b><small>{item.complete ? "Completo" : `${item.pending} pendiente${item.pending === 1 ? "" : "s"}`}</small></span><span className={`status-badge ${item.complete ? "success" : "danger"}`}><span className="status-dot" />{item.complete ? "Completo" : "Incompleto"}</span><ArrowUpRight size={14} /></button>)}</div>}</section></div><section className="panel preventive-forms-panel" id="preventive-forms"><div className="panel-heading"><div><p className="eyebrow">Listado real · {displayItems.length} formularios</p><h2>Formularios preventivos</h2></div><span className="table-muted">{siteState === "all" ? "Todos los sitios" : siteState === "complete" ? "Solo completos" : "Solo incompletos"}</span></div><div className="data-table preventive-forms-table"><div className="data-table-head"><span>Formulario</span><span>Sitio</span><span>Proyecto</span><span>Plantilla</span><span>Estado</span><span>Fecha</span><span>Responsables</span></div>{displayItems.length === 0 ? <div className="resource-empty">No hay preventivos para los filtros seleccionados.</div> : displayItems.slice(0, 300).map((item) => <div className="data-table-row" key={item.id}><span><strong>{item.code}</strong><small>{item.description}</small></span><span><strong>{item.siteCode ?? "Sin código"}</strong><small>{item.siteName ?? "Sin nombre informado"}</small></span><span className="table-muted">{item.project ?? "Sin proyecto"}</span><span className="table-muted">{item.template ?? "Sin plantilla"}</span><span><StatusBadge status={item.status} /><small>{item.rawStatus ?? "Sin estado fuente"}</small></span><span className="table-muted">{dateOnly(item.plannedAt)}</span><span className="table-muted">{responsibleValues(item).join(" · ") || "Sin responsables"}</span></div>)}</div>{displayItems.length > 300 && <div className="source-footnote">Se muestran 300 filas en pantalla; los KPI y agrupamientos usan todo el conjunto filtrado.</div>}<div className="source-footnote"><ShieldCheck size={14} /> Datos oficiales de `preventivos`, sin combinación con mocks ni acciones de escritura.</div></section>{selectedSite && <SiteDetail site={selectedSite} onClose={() => setSelectedSiteCode(null)} />}</>}</main>;
}
