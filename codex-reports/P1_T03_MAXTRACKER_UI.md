# P1-T03-UI-R1 — MaxTracker vehículos y conducción

## Alcance

Implementación mock-first de la vista de vehículos y conducción en la rama
`euge/p1-t03-maxtracker-ui`. No se realizó integración live con MaxTracker y
no se modificaron PostgreSQL, Prisma, migraciones, n8n, Sytex, BizFlow,
Intraoperativa, Oppen, Railway ni producción.

La UI consume únicamente fixtures cuando `NEXT_PUBLIC_USE_MOCK_API` está
explícitamente activo. En modo real muestra un estado sin datos oficiales y no
mezcla registros demo con datos reales.

## Fuente y contratos

- MaxTracker es la fuente conceptual de vehículos, patente, modelo,
  kilometraje, conducción, reputación y eventos.
- Se agregó metadata explícita de organización/región/zona/base al contrato de
  `Vehicle` para autorizar vehículos sin conductor por jerarquía, sin usarla
  para inferir asignaciones.
- Se agregaron contratos de perfil de conducción y eventos, además de métodos
  equivalentes en `MaxTrackerAdapter`.
- El adapter mock implementa vehículos, perfiles y eventos con datos
  determinísticos y queda preparado para reemplazo por un adapter live.

## Roles y alcance

- Técnico: únicamente su vehículo asignado de forma determinística y su
  resumen/eventos; sin vehículo muestra `SIN VEHÍCULO ASIGNADO`.
- Coordinador: vehículos asignados y no asignados cuya jerarquía explícita
  está dentro de su `UserScope`.
- Manager: misma política dentro de sus regiones/zonas.
- Admin: alcance global del fixture.

Nunca se asigna conductor por zona, proximidad, último uso, tarea o guardia.
Un vehículo sin asignación conserva `assignedTechnicianId = null` y se muestra
como `SIN VEHÍCULO ASIGNADO`.

## UI implementada

- KPIs de vehículos visibles, asignados, sin asignar y score promedio.
- Filtros por búsqueda, estado, asignación y eventos.
- Cards de vehículo con patente, modelo, kilómetros, estado, conductor y
  eventos.
- Detalle contextual con score, faltas, excesos e historial de conducción.
- Estados vacíos para ausencia de vehículo y ausencia de datos live.
- CSS responsive con `minmax(0, 1fr)`/`min-width: 0` en los nuevos tracks; no
  se usó clipping global ni truncamiento como solución de overflow.

## Cambio de contratos compartidos

`SHARED_CONTRACT_CHANGE=YES`

Archivos: `src/contracts/vehicle.ts`, `src/contracts/maxtracker.ts`,
`src/contracts/source-adapters.ts`, `src/contracts/index.ts`.

`BACKEND_HANDOFF_REQUIRED=YES`: el adapter live futuro deberá proveer los
campos de jerarquía, vehículos, perfiles y eventos con los mismos contratos,
sin inventar asignaciones ni mezclar datos demo.

## Validación

`P1_T03_UI_R1_STATUS=IMPLEMENTED_MOCK_FIRST_WAITING_REVIEW`

`P1_T03_UI_STATUS=IMPLEMENTED_MOCK_FIRST_WAITING_REVIEW`

`BRANCH=euge/p1-t03-maxtracker-ui`

`TECHNICIAN_SCOPE=OWN_DETERMINISTIC_VEHICLE_AND_DRIVING_ONLY`

`COORDINATOR_SCOPE=USER_SCOPE_VEHICLES_AND_DRIVING`

`MANAGER_SCOPE=USER_SCOPE_VEHICLES_AND_DRIVING`

`ADMIN_SCOPE=GLOBAL_MOCK_SCOPE`

`UNASSIGNED_VEHICLE_BEHAVIOR=VISIBLE_ONLY_WHEN_EXPLICIT_HIERARCHY_IS_IN_SCOPE_DRIVER_NULL`

`UNKNOWN_LIVE_FIELDS=MAXTRACKER_ASSIGNMENT_SCORE_EVENT_PAYLOAD_AND_AUTHENTICATED_SCOPE_MAPPING`

`BASELINE_TESTS=118/118`

`FINAL_TESTS=122/122` en 21 archivos.

`TSC=PASS`

`ESLINT=PASS`

`BUILD=PASS`

La medición visual de viewport real no estuvo disponible en esta ejecución:

`MOBILE_VISUAL_CERTIFICATION=NOT_MEASURED_MANUAL_RETEST_REQUIRED`

Debe verificarse manualmente en 375x812, 390x844 y 412x915 antes de certificar
la ausencia de overflow visual.

`P1_T02_STATUS=CLOSED_TESTING_CERTIFIED`

`P1_T03_UI_STARTED=YES`

`MAXTRACKER_LIVE_USED=NO`

`DATABASE_WRITTEN=NO`

`MIGRATIONS_RUN=NO`

`PRODUCTION_TOUCHED=NO`

`NEXT_ACTION=WAIT_FOR_TECHNICAL_REVIEW`
