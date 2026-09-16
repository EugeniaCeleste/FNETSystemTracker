"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ChevronDown, RefreshCw, ShieldCheck, X } from "lucide-react";
import type { FuelCharge, FuelMetrics, PendingMetrics, PendingVisit } from "@/contracts";

type Resource = "combustible" | "pendientes";
type ApiResponse<T, M> = { source: "postgresql"; count: number; items: T[]; metrics: M };
type FuelFilters = { from: string; to: string; site: string; origin: string; fuel: string; formulario: string };
type PendingFilters = { site: string; origin: string; formulario: string; status: string };

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "No informado";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

function formatNumber(value: unknown, maximumFractionDigits = 3, minimumFractionDigits = 0): string {
  if (value === null || value === undefined || value === "") return "No informado";
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return show(value);
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits, minimumFractionDigits }).format(numericValue);
}

function formatLiters(value: unknown, maximumFractionDigits = 3): string {
  const formatted = formatNumber(value, maximumFractionDigits);
  return formatted === "No informado" ? formatted : `${formatted} L`;
}

function formatKpiLiters(value: number): string {
  return `${formatNumber(value, 2, 2)} L`;
}

function formatMonthLabel(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;
  const [year, month] = value.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1))).replace(" de ", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function fuelDetail(row: FuelCharge): Array<[string, unknown]> {
  return [
    ["Formulario", row.formulario], ["Código de tarea", row.taskCode], ["Código de sitio", row.siteCode],
    ["Nombre de sitio", row.siteName], ["Elemento de red", row.networkElement], ["Estado", row.status],
    ["Origen", row.origin], ["Tipo de formulario", row.formType], ["Clave de origen", row.sourceKey],
    ["Combustible", row.fuel], ["Tanque", row.tank], ["Litros cargados", formatLiters(row.liters)],
    ["Nivel antes", formatNumber(row.levelBefore)], ["Nivel final", formatNumber(row.levelFinal)], ["Horómetro", formatNumber(row.hourmeter)],
    ["GE en marcha", row.generatorRunning], ["Fecha del evento", row.eventAt],
    ["Última edición", row.editedAt],
  ];
}

function pendingDetail(row: PendingVisit): Array<[string, unknown]> {
  return [
    ["Formulario", row.formulario], ["Origen", row.source], ["Clave de origen", row.sourceKey],
    ["Código de sitio", row.siteCode], ["Nombre de sitio", row.siteName], ["Elemento de red", row.networkElement],
    ["Estado Sytex", row.status], ["Grupo", row.group], ["Índice", row.index], ["Pregunta", row.question],
    ["Respuesta", row.answer], ["Comentarios", row.comments], ["Posible pendiente", row.possiblePending],
    ["Estado del pendiente", row.pendingStatus], ["Última edición", row.editedAt],
    ["Editado por", row.editedBy], ["Sincronizado", row.syncedAt],
  ];
}

function metricEntries(metrics: Record<string, number>): Array<[string, number]> {
  return Object.entries(metrics).sort(([, left], [, right]) => right - left).slice(0, 6);
}

function FuelPage() {
  const [items, setItems] = useState<FuelCharge[]>([]);
  const [metrics, setMetrics] = useState<FuelMetrics | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filters, setFilters] = useState<FuelFilters>({ from: "", to: "", site: "", origin: "", fuel: "", formulario: "" });
  const [activeFilters, setActiveFilters] = useState<FuelFilters>(filters);
  const [reloadToken, setReloadToken] = useState(0);
  useEffect(() => {
    const query = new URLSearchParams(Object.entries(activeFilters).filter(([, value]) => value));
    void fetch(`/api/combustible?${query.toString()}`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("database_unavailable");
      return response.json() as Promise<ApiResponse<FuelCharge, FuelMetrics>>;
    }).then((data) => { setItems(data.items); setMetrics(data.metrics); setCount(data.count); setState("ready"); }).catch(() => { setItems([]); setMetrics(null); setCount(null); setState("error"); });
  }, [activeFilters, reloadToken]);
  const submit = (event: FormEvent) => { event.preventDefault(); setActiveFilters(filters); setReloadToken((value) => value + 1); };
  return <main className="standalone-resource-page"><OperationalHeader title="Combustible" description="Cargas de combustible de grupos electrógenos sincronizadas por n8n." state={state} onRefresh={() => setReloadToken((value) => value + 1)} /><form className="operational-filters" onSubmit={submit}><label>Desde<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label><label>Hasta<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label><label>Sitio<input placeholder="Código o nombre" value={filters.site} onChange={(event) => setFilters({ ...filters, site: event.target.value })} /></label><label>Origen<input placeholder="CORRECTIVO / PREVENTIVO / ECP" value={filters.origin} onChange={(event) => setFilters({ ...filters, origin: event.target.value })} /></label><label>Combustible<input placeholder="Diesel..." value={filters.fuel} onChange={(event) => setFilters({ ...filters, fuel: event.target.value })} /></label><label>Formulario<input placeholder="FO-..." value={filters.formulario} onChange={(event) => setFilters({ ...filters, formulario: event.target.value })} /></label><button className="button primary small" type="submit">Aplicar filtros</button></form>{state === "error" ? <Unavailable /> : <><div className="operational-kpis"><Metric label="Litros del mes" value={metrics ? formatKpiLiters(metrics.monthLiters) : "—"} detail="según fecha del evento" /><Metric label="Cargas del mes" value={metrics?.monthCharges ?? "—"} detail="registros del mes actual" /><Metric label="Litros totales" value={metrics ? formatKpiLiters(metrics.totalLiters) : "—"} detail={`${count ?? "—"} cargas accesibles`} /><Metric label="Promedio por carga" value={metrics ? formatKpiLiters(metrics.averageLiters) : "—"} detail="solo cargas con litros" /></div>{metrics && <div className="operational-breakdowns"><Breakdown title="Litros por origen" entries={metricEntries(metrics.litersByOrigin)} valueKind="liters" /><Breakdown title="Litros por sitio" entries={metricEntries(metrics.litersBySite)} valueKind="liters" /><Breakdown title="Litros por mes" entries={metricEntries(metrics.litersByMonth)} valueKind="liters" /></div>}<section className="panel table-panel"><div className="table-toolbar"><div><p className="eyebrow">Fuente oficial · solo lectura</p><h2>Cargas registradas</h2></div><span className="toolbar-spacer" /><span className="table-muted">{count ?? 0} accesibles</span></div><div className="data-table operational-table fuel-table"><div className="data-table-head"><span>Fecha</span><span>Sitio</span><span>Formulario</span><span>Origen</span><span>Combustible</span><span>Litros</span><span>Nivel</span><span>Horómetro</span></div>{state === "loading" ? <EmptyRow text="Consultando PostgreSQL…" /> : items.length === 0 ? <EmptyRow text="No hay cargas para los filtros seleccionados." /> : items.slice(0, 200).map((row) => <div className="data-table-row" key={row.id}><span className="table-muted">{show(row.eventAt)}</span><span><strong>{show(row.siteName ?? row.siteCode)}</strong><small>{show(row.siteCode)}</small></span><span className="table-muted">{row.formulario}</span><span className="table-muted">{row.origin}</span><span className="table-muted">{show(row.fuel)}</span><strong>{formatLiters(row.liters)}</strong><span className="table-muted">{formatNumber(row.levelBefore)} → {formatNumber(row.levelFinal)}</span><span className="table-muted">{formatNumber(row.hourmeter)} <DetailButton title={`Carga ${row.formulario}`} fields={fuelDetail(row)} /></span></div>)}</div></section></>}</main>;
}

function PendingPage() {
  const [items, setItems] = useState<PendingVisit[]>([]);
  const [metrics, setMetrics] = useState<PendingMetrics | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filters, setFilters] = useState<PendingFilters>({ site: "", origin: "", formulario: "", status: "" });
  const [activeFilters, setActiveFilters] = useState<PendingFilters>(filters);
  const [reloadToken, setReloadToken] = useState(0);
  useEffect(() => {
    const query = new URLSearchParams(Object.entries(activeFilters).filter(([, value]) => value));
    void fetch(`/api/pendientes?${query.toString()}`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("database_unavailable");
      return response.json() as Promise<ApiResponse<PendingVisit, PendingMetrics>>;
    }).then((data) => { setItems(data.items); setMetrics(data.metrics); setCount(data.count); setState("ready"); }).catch(() => { setItems([]); setMetrics(null); setCount(null); setState("error"); });
  }, [activeFilters, reloadToken]);
  const submit = (event: FormEvent) => { event.preventDefault(); setActiveFilters(filters); setReloadToken((value) => value + 1); };
  return <main className="standalone-resource-page"><OperationalHeader title="Pendientes para próxima visita" description="Pendientes sincronizados y relacionados por código de sitio, sin depender del formulario anterior." state={state} onRefresh={() => setReloadToken((value) => value + 1)} /><form className="operational-filters pending-filters" onSubmit={submit}><label>Sitio<input placeholder="Código o nombre" value={filters.site} onChange={(event) => setFilters({ ...filters, site: event.target.value })} /></label><label>Origen<input placeholder="PREVENTIVO / CORRECTIVO" value={filters.origin} onChange={(event) => setFilters({ ...filters, origin: event.target.value })} /></label><label>Formulario<input placeholder="FO-..." value={filters.formulario} onChange={(event) => setFilters({ ...filters, formulario: event.target.value })} /></label><label>Estado<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Todos</option><option value="PENDIENTE">PENDIENTE</option><option value="RESUELTO">RESUELTO</option><option value="DESCARTADO">DESCARTADO</option></select></label><button className="button primary small" type="submit">Aplicar filtros</button></form>{state === "error" ? <Unavailable /> : <><div className="operational-kpis"><Metric label="Pendientes abiertos" value={metrics?.open ?? "—"} detail="estado PENDIENTE" /><Metric label="Total accesible" value={count ?? "—"} detail="sin eliminar historial" /><Metric label="De correctivos" value={metrics?.bySource.CORRECTIVO ?? 0} detail="pendientes abiertos" /><Metric label="De preventivos" value={metrics?.bySource.PREVENTIVO ?? 0} detail="pendientes abiertos" /></div>{metrics && <div className="operational-breakdowns"><Breakdown title="Pendientes por origen" entries={metricEntries(metrics.bySource)} /><Breakdown title="Pendientes por sitio" entries={metricEntries(metrics.bySite)} /></div>}<section className="panel table-panel"><div className="table-toolbar"><div><p className="eyebrow">Fuente oficial · solo lectura</p><h2>Pendientes registrados</h2></div><span className="toolbar-spacer" /><span className="table-muted">{count ?? 0} accesibles</span></div><div className="data-table operational-table pending-table"><div className="data-table-head"><span>Sitio</span><span>Comentario</span><span>Origen</span><span>Formulario</span><span>Estado</span><span>Última edición</span></div>{state === "loading" ? <EmptyRow text="Consultando PostgreSQL…" /> : items.length === 0 ? <EmptyRow text="No hay pendientes para los filtros seleccionados." /> : items.slice(0, 200).map((row) => <div className="data-table-row" key={row.id}><span><strong>{show(row.siteName ?? row.siteCode)}</strong><small>{show(row.siteCode)}</small></span><span><strong>{show(row.comments ?? row.answer ?? row.question)}</strong><small>{show(row.question)}</small></span><span className="table-muted">{row.source}</span><span className="table-muted">{row.formulario}</span><span className="status-badge warning"><span className="status-dot" />{row.pendingStatus}</span><span className="table-muted">{show(row.editedAt)} <DetailButton title={`Pendiente ${row.formulario}`} fields={pendingDetail(row)} /></span></div>)}</div><div className="source-footnote"><ShieldCheck size={14} /> Relación de próxima visita por `codigo_sitio`. No se modifica el estado sincronizado desde esta pantalla.</div></section></>}</main>;
}

function OperationalHeader({ title, description, state, onRefresh }: { title: string; description: string; state: "loading" | "ready" | "error"; onRefresh: () => void }) {
  return <div className="standalone-resource-header"><div><p className="eyebrow">FNET System Tracker · fuente oficial</p><h1>{title}</h1><p className="page-subtitle">{description}</p></div><div className="operational-header-actions"><div className="data-source-tag"><span className="signal-dot" /> PostgreSQL · solo lectura</div><button className="button secondary small" onClick={onRefresh}><RefreshCw size={15} /> {state === "loading" ? "Consultando" : "Actualizar"}</button></div></div>;
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) { return <div className="summary-card accent-blue"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }
function Breakdown({ title, entries, valueKind = "count" }: { title: string; entries: Array<[string, number]>; valueKind?: "count" | "liters" }) { return <section className="panel breakdown-card"><div className="panel-heading"><h2>{title}</h2></div>{entries.length === 0 ? <p className="table-muted">Sin datos con litros/pedientes.</p> : entries.map(([key, value]) => <div className="breakdown-row" key={key}><span>{title === "Litros por mes" ? formatMonthLabel(key) : key}</span><strong>{valueKind === "liters" ? formatLiters(value) : formatNumber(value)}</strong></div>)}</section>; }
function DetailList({ fields }: { fields: Array<[string, unknown]> }) { return <dl className="detail-list">{fields.filter(([, value]) => value !== null && value !== undefined && value !== "").map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{show(value)}</dd></div>)}</dl>; }
function DetailButton({ title, fields }: { title: string; fields: Array<[string, unknown]> }) {
  const [open, setOpen] = useState(false);
  return <><button className="detail-trigger" type="button" onClick={() => setOpen(true)}><ChevronDown size={13} /> Detalle</button>{open && createPortal(<div className="detail-modal-backdrop" role="presentation" onClick={() => setOpen(false)}><section className="detail-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}><div className="detail-modal-header"><div><p className="eyebrow">Detalle completo</p><h3>{title}</h3></div><button className="icon-button" type="button" aria-label="Cerrar detalle" onClick={() => setOpen(false)}><X size={18} /></button></div><div className="detail-modal-body"><DetailList fields={fields} /></div></section></div>, document.body)}</>;
}
function EmptyRow({ text }: { text: string }) { return <div className="resource-empty">{text}</div>; }
function Unavailable() { return <div className="urgent-banner"><div className="urgent-symbol"><AlertTriangle size={20} /></div><div><strong>No se pudo consultar PostgreSQL</strong><span>La pantalla no incorpora mocks. Verificá la conectividad desde tu PC.</span></div></div>; }

export function OperationalDataPage({ resource }: { resource: Resource }) {
  return resource === "combustible" ? <FuelPage /> : <PendingPage />;
}
