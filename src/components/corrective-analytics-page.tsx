"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, ExternalLink, Filter, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { TaskCriticality, TaskStatus } from "@/contracts";
import type { CorrectiveAnalyticsData, CorrectiveAnalyticsRow, InternalTaskAssignmentResponse, PostgresQuote } from "@/contracts";
import { ageBucketFrom, ageDaysFrom, isActiveCorrectiveStatus, type AgeBucket, type WorkType, workTypeLabels } from "@/lib/corrective-rules";

type PageState = "loading" | "ready" | "error";
type QuoteFilter = "all" | "with" | "without";
type AssignmentFilter = "all" | "unassigned";

const ageOptions: Array<[AgeBucket, string]> = [["0_7", "0–7 días"], ["8_14", "8–14 días"], ["15_21", "15–21 días"], ["OVER_21", "> 21 días"], ["NO_DATA", "Sin fecha"]];
const statusOptions: Array<[TaskStatus, string]> = [[TaskStatus.OPEN, "Abierto"], [TaskStatus.IN_PROGRESS, "En proceso"], [TaskStatus.IN_REVIEW, "En revisión"], [TaskStatus.SENT, "Enviada"], [TaskStatus.REJECTED, "Rechazado"], [TaskStatus.APPROVED_WITH_PENDING, "Aprobado con pendientes"], [TaskStatus.APPROVED, "Aprobado"], [TaskStatus.CANCELLED, "Cancelado"]];

function statusLabel(status: TaskStatus): string { return statusOptions.find(([value]) => value === status)?.[1] ?? status; }
function ageLabel(bucket: AgeBucket): string { return ageOptions.find(([value]) => value === bucket)?.[1] ?? "Sin fecha"; }
function ageTone(bucket: AgeBucket): string { return bucket === "OVER_21" ? "danger" : bucket === "NO_DATA" ? "neutral" : bucket === "15_21" ? "warning" : "success"; }
function statusTone(status: TaskStatus): string { return status === TaskStatus.APPROVED ? "success" : status === TaskStatus.CANCELLED || status === TaskStatus.REJECTED ? "danger" : status === TaskStatus.IN_PROGRESS || status === TaskStatus.IN_REVIEW || status === TaskStatus.APPROVED_WITH_PENDING ? "warning" : "neutral"; }
function dateOnly(value: string | null): string { return value ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)) : "—"; }
function formatAmount(quotes: PostgresQuote[]): string {
  const valid = quotes.map((quote) => ({ amount: Number(quote.total), currency: quote.currency ?? "" })).filter((quote) => Number.isFinite(quote.amount));
  const currencies = new Set(valid.map((quote) => quote.currency));
  if (valid.length === 0 || currencies.size > 1) return "—";
  const currency = valid[0].currency;
  return `${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valid.reduce((sum, quote) => sum + quote.amount, 0))}${currency ? ` ${currency}` : ""}`;
}
function assigned(item: CorrectiveAnalyticsRow): boolean { return Boolean(item.internalAssignment); }
function responsibleText(item: CorrectiveAnalyticsRow): string { return [item.responsible, item.collaborator, item.contractor, item.supplierResponsibles].filter((value): value is string => Boolean(value?.trim())).join(" · ") || "Sin responsables informados"; }
function statusBadge(status: TaskStatus) { return <span className={`status-badge ${statusTone(status)}`}><span className="status-dot" />{statusLabel(status)}</span>; }
function ageBadge(item: CorrectiveAnalyticsRow) { const bucket = ageBucketFrom(ageDaysFrom(item.originDate)); return <span className={`status-badge ${ageTone(bucket)} corrective-age-badge`}>{ageLabel(bucket)}</span>; }

function Metric({ label, value, detail, tone, onClick }: { label: string; value: number; detail: string; tone: string; onClick: () => void }) {
  return <button className={`summary-card corrective-metric-card accent-${tone}`} type="button" onClick={onClick}><span>{label}</span><strong>{value}</strong><small>{detail}<ArrowUpRight size={11} /></small></button>;
}

function QuoteList({ quotes }: { quotes: PostgresQuote[] }) {
  if (quotes.length === 0) return <p className="table-muted">No hay cotizaciones relacionadas por `codigo_tarea`.</p>;
  return <div className="corrective-quote-list">{quotes.map((quote) => <div className="corrective-quote-row" key={quote.id}><div><strong>{quote.code}</strong><small>{quote.supplier ?? "Proveedor no informado"}</small></div><span>{quote.status}</span><strong>{quote.total ? `${quote.total} ${quote.currency ?? ""}`.trim() : "Monto no informado"}</strong>{quote.link && <a href={quote.link} target="_blank" rel="noreferrer" aria-label={`Abrir ${quote.code}`}><ExternalLink size={14} /></a>}</div>)}</div>;
}

function InternalAssignmentBlock({ item, onSaved }: { item: CorrectiveAnalyticsRow; onSaved: () => void }) {
  const [response, setResponse] = useState<InternalTaskAssignmentResponse | null>(null);
  const [primary, setPrimary] = useState("");
  const [collaborator, setCollaborator] = useState("");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "saving" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/task-assignments?taskType=CORRECTIVO&taskCode=${encodeURIComponent(item.code)}`, { cache: "no-store" })
      .then(async (result) => { if (!result.ok) throw new Error("assignment_unavailable"); return result.json() as Promise<InternalTaskAssignmentResponse>; })
      .then((next) => { if (!cancelled) { setResponse(next); setPrimary(next.assignment ? next.technicians.find((technician) => technician.name === next.assignment?.technicianPrimary)?.id ?? "" : ""); setCollaborator(next.assignment ? next.technicians.find((technician) => technician.name === next.assignment?.technicianCollaborator)?.id ?? "" : ""); setState("idle"); } })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [item.code]);
  const assignment = response?.assignment ?? item.internalAssignment;
  const technicians = response?.technicians ?? [];
  const save = async () => {
    setState("saving");
    try {
      const result = await fetch("/api/task-assignments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskType: "CORRECTIVO", taskCode: item.code, technicianPrimary: primary, technicianCollaborator: collaborator, actor: "DEMO_COORDINATOR" }) });
      if (!result.ok) throw new Error("assignment_save_failed");
      const next = await result.json() as InternalTaskAssignmentResponse;
      setResponse(next);
      setOpen(false);
      setState("idle");
      onSaved();
    } catch { setState("error"); }
  };
  const canSave = Boolean(primary && collaborator && primary !== collaborator && technicians.length > 0);
  return <div className="corrective-detail-block corrective-assignment-block"><div className="corrective-detail-heading"><div><h3>Cuadrilla interna FNET</h3><small>Asignación propia · no modifica Sytex</small></div><span className={`status-badge ${assignment ? "success" : "warning"}`}>{assignment ? "Asignada" : "SIN CUADRILLA"}</span></div>{assignment && !open && <p className="corrective-detail-copy"><strong>{assignment.technicianPrimary}</strong> + <strong>{assignment.technicianCollaborator}</strong></p>}{!assignment && !open && <p className="table-muted">El correctivo histórico no tiene una cuadrilla interna atribuible.</p>}{state === "error" && <p className="assignment-error">No se pudo leer o guardar la asignación. Verificá que hayas ejecutado el SQL de FNET.</p>}{open && <div className="assignment-editor"><label>Técnico principal<select value={primary} onChange={(event) => setPrimary(event.target.value)}><option value="">Seleccionar</option>{technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}</option>)}</select></label><label>Técnico colaborador<select value={collaborator} onChange={(event) => setCollaborator(event.target.value)}><option value="">Seleccionar</option>{technicians.map((technician) => <option key={technician.id} value={technician.id} disabled={technician.id === primary}>{technician.name}</option>)}</select></label><div className="assignment-editor-actions"><button className="button primary small" type="button" disabled={!canSave || state === "saving"} onClick={save}>{state === "saving" ? "Guardando…" : "Guardar asignación"}</button><button className="button secondary small" type="button" onClick={() => setOpen(false)}>Cancelar</button></div></div>}{!open && <button className="button secondary small" type="button" disabled={state === "loading"} onClick={() => setOpen(true)}>{assignment ? "Cambiar cuadrilla" : "Asignar cuadrilla"}</button>}<small className="assignment-demo-note">Autorización actual: DEMO_COORDINATOR. Requiere autenticación server-side real para producción.</small></div>;
}

function CorrectiveDetail({ item, onClose, pending, onAssignmentSaved }: { item: CorrectiveAnalyticsRow; onClose: () => void; pending: import("@/contracts").PendingVisit[]; onAssignmentSaved: () => void }) {
  const days = ageDaysFrom(item.originDate);
  return <section className="panel corrective-detail-panel" aria-label={`Detalle de ${item.code}`}><div className="panel-heading"><div><p className="eyebrow">Detalle de TA</p><h2>{item.code}</h2><p className="page-subtitle">{item.description}</p></div><button className="icon-button" type="button" aria-label="Cerrar detalle" onClick={onClose}><X size={17} /></button></div><div className="corrective-detail-grid"><div><span>Sitio</span><strong>{item.siteCode ?? "Sin código de sitio"}</strong><small>{item.siteName ?? "Sin nombre informado"}</small></div><div><span>Proyecto</span><strong>{item.project ?? "Sin proyecto informado"}</strong></div><div><span>Estado</span><strong>{statusLabel(item.status)}</strong><small>{item.rawStatus ?? "Sin estado fuente"}</small></div><div><span>Antigüedad</span><strong>{days === null ? "Sin fecha" : `${days} días`}</strong><small>{item.originDateSource ?? "Sin fecha origen"}</small></div><div><span>Tipo derivado</span><strong>{workTypeLabels[item.workType]}</strong></div><div><span>Fecha origen</span><strong>{dateOnly(item.originDate)}</strong></div></div><InternalAssignmentBlock item={item} onSaved={onAssignmentSaved} /><div className="corrective-detail-block"><h3>Responsables oficiales</h3><p className="corrective-detail-copy">{responsibleText(item)}</p></div><div className="corrective-detail-block"><div className="corrective-detail-heading"><h3>Cotizaciones relacionadas ({item.quotes.length})</h3><strong>Monto válido: {formatAmount(item.quotes)}</strong></div><QuoteList quotes={item.quotes} /></div><div className="corrective-detail-block"><h3>Pendientes del sitio</h3>{item.siteCode ? <>{pending.length === 0 ? <p className="table-muted">No hay pendientes de visitas anteriores para este código de sitio.</p> : <div className="corrective-quote-list">{pending.map((row) => <div className="corrective-pending-row" key={row.id}><strong>{row.formulario}</strong><span>{row.comments ?? row.question ?? "Pendiente sin comentario informado"}</span><small>{row.pendingStatus}</small></div>)}</div>}</> : <p className="table-muted">No se consultan pendientes porque la TA no tiene `codigo_sitio`.</p>}</div>{item.link && <a className="button secondary small corrective-sytex-link" href={item.link} target="_blank" rel="noreferrer">Abrir TA en Sytex <ExternalLink size={14} /></a>}</section>;
}

export function CorrectiveAnalyticsPage() {
  const [data, setData] = useState<CorrectiveAnalyticsData | null>(null);
  const [state, setState] = useState<PageState>("loading");
  const [reloadToken, setReloadToken] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [site, setSite] = useState("");
  const [project, setProject] = useState("");
  const [workType, setWorkType] = useState<WorkType | "">("");
  const [age, setAge] = useState<AgeBucket | "">("");
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [criticality, setCriticality] = useState<"all" | "urgent">("all");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/correctivos/analytics", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error("database_unavailable"); return response.json() as Promise<CorrectiveAnalyticsData>; }).then((nextData) => { if (!cancelled) { setData(nextData); setState("ready"); } }).catch(() => { if (!cancelled) { setData(null); setState("error"); } });
    return () => { cancelled = true; };
  }, [reloadToken]);

  const projects = useMemo(() => [...new Set((data?.items ?? []).map((item) => item.project).filter((value): value is string => Boolean(value)))].sort(), [data]);
  const filteredItems = useMemo(() => (data?.items ?? []).filter((item) => {
    const origin = item.originDate?.slice(0, 10) ?? "";
    const itemAge = ageBucketFrom(ageDaysFrom(item.originDate));
    return (!dateFrom || (origin && origin >= dateFrom)) && (!dateTo || (origin && origin <= dateTo)) && (!status || item.status === status) && (!site || `${item.siteCode ?? ""} ${item.siteName ?? ""}`.toLowerCase().includes(site.toLowerCase())) && (!project || item.project === project) && (!workType || item.workType === workType) && (!age || itemAge === age) && (!activeOnly || isActiveCorrectiveStatus(item.status)) && (!criticality || criticality === "all" || item.criticality === TaskCriticality.URGENT) && (assignmentFilter === "all" || !assigned(item)) && (quoteFilter === "all" || (quoteFilter === "with" ? item.quotes.length > 0 : item.quotes.length === 0));
  }), [activeOnly, age, assignmentFilter, criticality, data, dateFrom, dateTo, project, quoteFilter, site, status, workType]);
  const counts = useMemo(() => {
    const active = filteredItems.filter((item) => isActiveCorrectiveStatus(item.status));
    return { active: active.length, overdue: active.filter((item) => ageDaysFrom(item.originDate) !== null && (ageDaysFrom(item.originDate) ?? 0) > 21).length, urgent: active.filter((item) => item.criticality === TaskCriticality.URGENT).length, unassigned: active.filter((item) => !assigned(item)).length, withQuotes: active.filter((item) => item.quotes.length > 0).length, withoutQuotes: active.filter((item) => item.quotes.length === 0).length };
  }, [filteredItems]);
  const workTypeCounts = useMemo(() => (["AA", "GE", "ALTURA", "COTA_0", "OTROS"] as WorkType[]).map((value) => ({ value, count: filteredItems.filter((item) => item.workType === value).length })), [filteredItems]);
  const selected = filteredItems.find((item) => item.code === selectedCode) ?? null;
  const pendingForSelected = selected?.siteCode ? data?.pendingBySite[selected.siteCode] ?? [] : [];
  const clearFilters = () => { setDateFrom(""); setDateTo(""); setStatus(""); setSite(""); setProject(""); setWorkType(""); setAge(""); setQuoteFilter("all"); setAssignmentFilter("all"); setActiveOnly(false); setCriticality("all"); };
  const refresh = () => { setState("loading"); setReloadToken((value) => value + 1); };
  const drill = (next: () => void) => { next(); document.getElementById("corrective-list")?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  return <main className="standalone-resource-page corrective-analytics-page"><div className="standalone-resource-header"><div><p className="eyebrow">FNET System Tracker · fuente oficial</p><h1>Correctivos</h1><p className="page-subtitle">Antigüedad de TA, clasificación operativa, cuadrilla interna y cotizaciones relacionadas.</p></div><div className="operational-header-actions"><div className="data-source-tag"><span className="signal-dot" /> PostgreSQL · fuente oficial + FNET</div><button className="button secondary small" type="button" onClick={refresh}><RefreshCw size={15} /> {state === "loading" ? "Consultando" : "Actualizar"}</button></div></div>{state === "error" && <div className="urgent-banner"><div className="urgent-symbol"><AlertTriangle size={20} /></div><div><strong>No se pudo consultar PostgreSQL</strong><span>La vista no incorpora mocks. Verificá la conectividad desde tu PC.</span></div><button type="button" onClick={refresh}>Reintentar <RefreshCw size={15} /></button></div>}{state === "loading" && <div className="resource-empty">Consultando PostgreSQL…</div>}{state === "ready" && data && <><section className="panel corrective-filter-panel"><div className="panel-heading"><div><p className="eyebrow">Filtros oficiales</p><h2>Alcance de la consulta</h2></div><button className="text-button" type="button" onClick={clearFilters}><Filter size={14} /> Limpiar filtros</button></div><div className="corrective-filters"><label>Desde<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label>Hasta<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label><label>Estado<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Sitio<div className="corrective-search-input"><Search size={14} /><input placeholder="Código o nombre" value={site} onChange={(event) => setSite(event.target.value)} /></div></label><label>Proyecto<select value={project} onChange={(event) => setProject(event.target.value)}><option value="">Todos</option>{projects.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Tipo de trabajo<select value={workType} onChange={(event) => setWorkType(event.target.value as WorkType | "")}><option value="">Todos</option>{Object.entries(workTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Antigüedad<select value={age} onChange={(event) => setAge(event.target.value as AgeBucket | "")}><option value="">Todas</option>{ageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>QO<select value={quoteFilter} onChange={(event) => setQuoteFilter(event.target.value as QuoteFilter)}><option value="all">Todas</option><option value="with">Con QO</option><option value="without">Sin QO</option></select></label></div></section><div className="operational-kpis corrective-kpis"><Metric label="TA activas" value={counts.active} detail="estados no terminales" tone="blue" onClick={() => drill(() => { setActiveOnly(true); setAge(""); })} /><Metric label="TA >21 días" value={counts.overdue} detail="desde fecha de origen" tone="red" onClick={() => drill(() => { setActiveOnly(true); setAge("OVER_21"); })} /><Metric label="Urgentes" value={counts.urgent} detail="criticidad oficial disponible" tone="red" onClick={() => drill(() => { setActiveOnly(true); setCriticality("urgent"); })} /><Metric label="Sin cuadrilla" value={counts.unassigned} detail="sin asignación FNET" tone="orange" onClick={() => drill(() => { setActiveOnly(true); setAssignmentFilter("unassigned"); })} /><Metric label="Con QO" value={counts.withQuotes} detail="relación exacta por código" tone="purple" onClick={() => drill(() => { setActiveOnly(true); setQuoteFilter("with"); })} /><Metric label="Sin QO" value={counts.withoutQuotes} detail="sin cotización relacionada" tone="green" onClick={() => drill(() => { setActiveOnly(true); setQuoteFilter("without"); })} /></div><div className="corrective-worktype-breakdown"><div className="panel-heading"><div><p className="eyebrow">Clasificación derivada para UI</p><h2>Tipo de trabajo</h2></div><span className="table-muted">No modifica Sytex</span></div><div className="corrective-worktype-list">{workTypeCounts.map((entry) => <button type="button" key={entry.value} onClick={() => drill(() => { setWorkType(entry.value); setActiveOnly(false); })}><span>{workTypeLabels[entry.value]}</span><strong>{entry.count}</strong><ArrowUpRight size={14} /></button>)}</div></div>{selected && <CorrectiveDetail item={selected} onClose={() => setSelectedCode(null)} pending={pendingForSelected} onAssignmentSaved={refresh} />}<section className="panel corrective-list-panel" id="corrective-list"><div className="panel-heading"><div><p className="eyebrow">Listado real · {filteredItems.length} registros</p><h2>Tareas correctivas</h2></div><span className="table-muted">{activeOnly ? "Solo activas" : "Todos los estados"}</span></div><div className="data-table corrective-table"><div className="data-table-head"><span>TA</span><span>Sitio</span><span>Proyecto</span><span>Tipo</span><span>Estado</span><span>Antigüedad</span><span>QO</span><span>Detalle</span></div>{filteredItems.length === 0 ? <div className="resource-empty">No hay correctivos para los filtros seleccionados.</div> : filteredItems.slice(0, 300).map((item) => <button type="button" className="data-table-row corrective-table-row" key={item.id} onClick={() => setSelectedCode(item.code)}><span><strong>{item.code}</strong><small>{item.description}</small></span><span><strong>{item.siteCode ?? "Sin código"}</strong><small>{item.siteName ?? "Sin nombre informado"}</small></span><span className="table-muted">{item.project ?? "Sin proyecto"}</span><span className="table-muted">{workTypeLabels[item.workType]}</span><span>{statusBadge(item.status)}<small>{item.rawStatus ?? "Sin estado fuente"}</small></span><span>{ageBadge(item)}<small>{dateOnly(item.originDate)}</small></span><span><strong>{item.quotes.length}</strong><small>{formatAmount(item.quotes)}</small></span><span className="corrective-detail-action">Abrir <ArrowUpRight size={13} /></span></button>)}</div>{filteredItems.length > 300 && <div className="source-footnote">Se muestran 300 filas en pantalla; los KPI usan todo el conjunto filtrado.</div>}<div className="source-footnote"><ShieldCheck size={14} /> Datos oficiales de `correctivos`, cotizaciones relacionadas por coincidencia exacta de código y asignaciones internas FNET separadas de Sytex.</div></section></>}</main>;
}
