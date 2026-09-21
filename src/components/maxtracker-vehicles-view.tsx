"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Gauge, Search, Truck, UserRound, X } from "lucide-react";
import type { MaxTrackerDrivingEvent, MaxTrackerDrivingProfile, UserScope, Vehicle } from "@/contracts";
import { UserRole, VehicleStatus } from "@/contracts";
import { mockTechnicians, scopedResourceForZone } from "@/mocks";
import { filterVehiclesForScope } from "@/lib/scope";

type Props = {
  scope: UserScope;
  vehicles: readonly Vehicle[];
  drivingProfiles: readonly MaxTrackerDrivingProfile[];
  drivingEvents: readonly MaxTrackerDrivingEvent[];
  mockMode: boolean;
};

function statusLabel(status: VehicleStatus): string {
  if (status === VehicleStatus.MAINTENANCE) return "Mantenimiento";
  if (status === VehicleStatus.OUT_OF_SERVICE) return "Fuera de servicio";
  return "Activo";
}

function statusClass(status: VehicleStatus): string {
  if (status === VehicleStatus.MAINTENANCE) return "maintenance";
  if (status === VehicleStatus.OUT_OF_SERVICE) return "out";
  return "active";
}

function scoreClass(profile: MaxTrackerDrivingProfile | undefined): string {
  if (!profile) return "unknown";
  if (profile.reputationLabel === "ALTO") return "high";
  if (profile.reputationLabel === "BAJO") return "low";
  return "medium";
}

function formatDate(value: string | null): string {
  if (!value) return "Sin eventos";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function technicianName(id: string | null): string {
  if (!id) return "SIN VEHÍCULO ASIGNADO";
  return mockTechnicians.find((technician) => technician.id === id)?.name ?? "Técnico no disponible";
}

export function MaxTrackerVehiclesView({ scope, vehicles, drivingProfiles, drivingEvents, mockMode }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | VehicleStatus>("ALL");
  const [assignment, setAssignment] = useState<"ALL" | "ASSIGNED" | "UNASSIGNED">("ALL");
  const [eventFilter, setEventFilter] = useState<"ALL" | "WITH_EVENTS" | "WITHOUT_EVENTS">("ALL");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const scopedVehicles = useMemo(() => filterVehiclesForScope(vehicles, mockTechnicians, scope, scopedResourceForZone), [scope, vehicles]);
  const scopedProfiles = useMemo(() => {
    const technicianIds = new Set(scopedVehicles.flatMap((vehicle) => vehicle.assignedTechnicianId ? [vehicle.assignedTechnicianId] : []));
    return drivingProfiles.filter((profile) => technicianIds.has(profile.technicianId));
  }, [drivingProfiles, scopedVehicles]);
  const filteredVehicles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return scopedVehicles.filter((vehicle) => {
      const vehicleEvents = drivingEvents.filter((event) => event.vehicleId === vehicle.id);
      const matchesQuery = !normalizedQuery || [vehicle.plate, vehicle.brand, vehicle.model, vehicle.id, technicianName(vehicle.assignedTechnicianId)].some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesStatus = status === "ALL" || vehicle.status === status;
      const matchesAssignment = assignment === "ALL" || (assignment === "ASSIGNED" ? Boolean(vehicle.assignedTechnicianId) : !vehicle.assignedTechnicianId);
      const matchesEvents = eventFilter === "ALL" || (eventFilter === "WITH_EVENTS" ? vehicleEvents.length > 0 : vehicleEvents.length === 0);
      return matchesQuery && matchesStatus && matchesAssignment && matchesEvents;
    });
  }, [assignment, drivingEvents, eventFilter, query, scopedVehicles, status]);
  const selectedVehicle = filteredVehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? filteredVehicles[0] ?? null;
  const selectedProfile = selectedVehicle?.assignedTechnicianId ? scopedProfiles.find((profile) => profile.technicianId === selectedVehicle.assignedTechnicianId) : undefined;
  const selectedEvents = selectedVehicle ? drivingEvents.filter((event) => event.vehicleId === selectedVehicle.id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)) : [];
  const averageScore = scopedProfiles.length > 0 ? Math.round(scopedProfiles.reduce((sum, profile) => sum + profile.score, 0) / scopedProfiles.length) : null;

  if (!mockMode) {
    return <div className="empty-state live-unavailable"><Gauge size={28} /><h2>Vehículos: sin datos oficiales</h2><p>MaxTracker todavía no tiene una integración live. El modo real no muestra registros demo.</p></div>;
  }

  return <>
    <div className="page-heading maxtracker-heading">
      <div><p className="eyebrow">MaxTracker · mock-first</p><h1>{scope.role === UserRole.TECHNICIAN ? "Mi vehículo y conducción" : "Vehículos y conducción"}</h1><p className="page-subtitle">Vista preparada para reemplazar el adapter demo por la fuente oficial de MaxTracker.</p></div>
      <span className="source-tag"><Truck size={13} /> MAXTRACKER <small>demo explícito</small></span>
    </div>

    <section className="maxtracker-kpis" aria-label="Resumen de vehículos">
      <div className="summary-card"><span>Vehículos en alcance</span><strong>{scopedVehicles.length}</strong><small>{scope.role === UserRole.TECHNICIAN ? "Asignación determinística" : "Según UserScope"}</small></div>
      <div className="summary-card"><span>Asignados</span><strong>{scopedVehicles.filter((vehicle) => vehicle.assignedTechnicianId).length}</strong><small>Con conductor conocido</small></div>
      <div className="summary-card"><span>Sin asignar</span><strong>{scopedVehicles.filter((vehicle) => !vehicle.assignedTechnicianId).length}</strong><small>No se infiere conductor</small></div>
      <div className="summary-card"><span>Score promedio</span><strong>{averageScore ?? "—"}</strong><small>{scopedProfiles.length} perfiles visibles</small></div>
    </section>

    <section className="panel maxtracker-filter-panel">
      <div className="maxtracker-filter-row">
        <label><span>Buscar</span><div className="maxtracker-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Patente, modelo o técnico" /></div></label>
        <label><span>Estado</span><select value={status} onChange={(event) => setStatus(event.target.value as "ALL" | VehicleStatus)}><option value="ALL">Todos</option><option value={VehicleStatus.ACTIVE}>Activo</option><option value={VehicleStatus.MAINTENANCE}>Mantenimiento</option><option value={VehicleStatus.OUT_OF_SERVICE}>Fuera de servicio</option></select></label>
        <label><span>Asignación</span><select value={assignment} onChange={(event) => setAssignment(event.target.value as typeof assignment)}><option value="ALL">Todos</option><option value="ASSIGNED">Asignados</option><option value="UNASSIGNED">Sin asignar</option></select></label>
        <label><span>Conducción</span><select value={eventFilter} onChange={(event) => setEventFilter(event.target.value as typeof eventFilter)}><option value="ALL">Todos</option><option value="WITH_EVENTS">Con eventos</option><option value="WITHOUT_EVENTS">Sin eventos</option></select></label>
      </div>
    </section>

    {scope.role === UserRole.TECHNICIAN && scopedVehicles.length === 0 && <div className="empty-state maxtracker-empty"><UserRound size={28} /><h2>SIN VEHÍCULO ASIGNADO</h2><p>No existe una asignación determinística de MaxTracker para este técnico.</p></div>}
    {scope.role !== UserRole.TECHNICIAN && filteredVehicles.length === 0 && <div className="empty-state maxtracker-empty"><Search size={28} /><h2>Sin vehículos para este filtro</h2><p>Ajustá la búsqueda o los filtros dentro de tu alcance operativo.</p></div>}

    {filteredVehicles.length > 0 && <section className="maxtracker-content-grid">
      <div className="panel maxtracker-vehicle-panel"><div className="panel-heading"><div><p className="eyebrow">{filteredVehicles.length} visibles</p><h2>{scope.role === UserRole.TECHNICIAN ? "Mi unidad" : "Flota visible"}</h2></div></div><div className="maxtracker-vehicle-list">{filteredVehicles.map((vehicle) => { const events = drivingEvents.filter((event) => event.vehicleId === vehicle.id); const profile = vehicle.assignedTechnicianId ? scopedProfiles.find((item) => item.technicianId === vehicle.assignedTechnicianId) : undefined; return <button className={`maxtracker-vehicle-card ${selectedVehicle?.id === vehicle.id ? "selected" : ""}`} key={vehicle.id} onClick={() => setSelectedVehicleId(vehicle.id)}><span className="vehicle-icon"><Truck size={17} /></span><span className="maxtracker-vehicle-main"><strong>{vehicle.brand} {vehicle.model}</strong><small>{vehicle.plate} · {vehicle.mileageKm.toLocaleString("es-AR")} km</small><small>{technicianName(vehicle.assignedTechnicianId)}</small></span><span className={`fleet-status ${statusClass(vehicle.status)}`}><span className="status-dot" />{statusLabel(vehicle.status)}</span><span className={`maxtracker-score ${scoreClass(profile)}`}>{profile ? `${profile.score} pts` : "—"}</span><span className="maxtracker-event-count">{events.length} {events.length === 1 ? "evento" : "eventos"}</span></button>; })}</div></div>
      {selectedVehicle && <aside className="panel maxtracker-detail-panel"><div className="panel-heading"><div><p className="eyebrow">Detalle contextual</p><h2>{selectedVehicle.plate}</h2></div><button className="icon-button" aria-label="Cerrar detalle" onClick={() => setSelectedVehicleId(null)}><X size={16} /></button></div><div className="maxtracker-detail-vehicle"><strong>{selectedVehicle.brand} {selectedVehicle.model}</strong><span>{selectedVehicle.mileageKm.toLocaleString("es-AR")} km · {statusLabel(selectedVehicle.status)}</span><span>Zona {selectedVehicle.zoneId ?? "no informada"}</span></div><div className="maxtracker-assignment"><span className="eyebrow">Conductor conocido</span><strong>{technicianName(selectedVehicle.assignedTechnicianId)}</strong>{!selectedVehicle.assignedTechnicianId && <small>No se asigna por inferencia.</small>}</div>{selectedProfile && <div className="maxtracker-driving-summary"><div><span>Score</span><strong className={`maxtracker-score ${scoreClass(selectedProfile)}`}>{selectedProfile.score}</strong></div><div><span>Faltas</span><strong>{selectedProfile.faultsCount}</strong></div><div><span>Excesos</span><strong>{selectedProfile.speedingCount}</strong></div></div>}<div className="maxtracker-events"><div className="panel-heading"><div><p className="eyebrow">Historial</p><h3>Eventos de conducción</h3></div></div>{selectedEvents.length === 0 ? <p className="maxtracker-muted">No hay eventos registrados para esta unidad.</p> : selectedEvents.map((event) => <div className="maxtracker-event" key={event.id}><span className={`maxtracker-event-icon ${event.severity.toLowerCase()}`}><AlertTriangle size={14} /></span><span><strong>{event.title}</strong><small>{event.detail}</small><small>{formatDate(event.occurredAt)}</small></span></div>)}</div></aside>}
    </section>}
  </>;
}
