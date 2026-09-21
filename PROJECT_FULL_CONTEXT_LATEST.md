# FNET System Tracker — Verified Project Context

`FULL_CONTEXT_STATUS=VERIFIED_CONTEXT_UPDATED_P1_T02_CLOSED_TESTING_CERTIFIED`
`GENERATED_AT=2026-09-18`
`SOURCE=code audit, local reports, local validation`

This file is the current compact context for the project. It records verified
architecture and known limits; it is not a production deployment declaration.

## Active roadmap

| Item | Status | Evidence / limit |
|---|---|---|
| P0-T05 | `BLOCKED_EXTERNAL_AUTH` | Sytex live Basic Auth is not certified outside Power Query/n8n; the TypeScript dry-run remains without live certification. |
| P1-T01 | `CLOSED_TESTING_CERTIFIED` | R6 corrected cross-module role scope for tasks, vehicles, guards, zones and crews; demo visuals certified locally. |
| P1-T02 | `CLOSED_TESTING_CERTIFIED` | R5 timezone and R6D Grid intrinsic-sizing corrections are accepted as the certified local testing baseline; live BizFlow/auth remain out of scope. |
| P1-T03 | `PLANNED` | MaxTracker, vehicles and conducción live integration are not started. |
| P1-T04 | `PLANNED` | Oppen and assets live integration are not started. |
| P1-T05 | `PLANNED` | GE, AA and batteries live maintenance module is not started. |
| P1-T06 | `PLANNED` | Intraoperativa live stock integration is not started; ownership contracts exist. |
| P1-T07 | `PLANNED` | Monthly planning and purchase views are not started. |
| P1-T08 | `PLANNED` | Prototype polish is not started as a separate roadmap item. |

`P1_T02_STARTED=YES`
`P1_T02_R2_STATUS=READY_FOR_TECHNICAL_REVIEW`
`P1_T02_LIVE_BIZFLOW=NO`
`LIVE_INTEGRATIONS_USED=NO`

## P0-T05 and FNET authentication are separate

`P0_T05_STATUS=BLOCKED_EXTERNAL_AUTH`
`P0_T05_BLOCKER=Sytex live Basic Auth no certificada fuera de Power Query/n8n`
`P0_T05_TYPESCRIPT_DRY_RUN=UNVERIFIED_LIVE`

`AUTH_FNET_STATUS=UNVERIFIED`
`AUTH_FNET_GAPS=autenticación real de usuarios; identity provider; server-side scope enforcement`

## Final source ownership

- `SYTEX` — tasks, forms, FO, sites, states, maintenance recorded in forms,
  and supplies declared/used/purchased in a task.
- `BIZFLOW` — resources, guards, login, workday start/end, vacations, leaves,
  and employment situation.
- `INTRAOPERATIVA` — consumable stock, purchases, entries, egress, deliveries,
  movements, material availability and maintenance stock.
- `MAXTRACKER` — vehicles, plate, model, kilometres, driving, reputation,
  faults and excesses.
- `OPPEN` — phones, tools, clothing, equipment, assignable assets and
  assignment/return records.
- `FNET` — cross-source views, permissions, dashboards, alerts, planning and
  calculated maintenance requirements/stock coverage.

The adapters and contracts are local/demo adapters. They do not establish a
live connection to any of these systems.

`SOURCE_OWNERSHIP_FINAL=VERIFIED`
`INTRAOPERATIVA_WORKDAY_FIELDS=NOT_EXPOSED`
`SYTEX_OFFICIAL_STOCK_OWNER=NO`
`FNET_REQUIREMENT_AND_COVERAGE_CALCULATOR=YES`

## Roles and national scope

The current role model contains `TECHNICIAN`, `COORDINATOR`, `MANAGER` and
`ADMIN`. The contracts model organization, region, zone, base, user, role,
user scope and operational resources. The local fixtures demonstrate scoped
experiences; they are not production identities or authorization.

`REAL_AUTH=UNVERIFIED`
`SERVER_SIDE_SCOPE_ENFORCEMENT=UNVERIFIED`
`ROLE_FILTERING_IS_SECURITY=NO`

## Maintenance context

Maintenance interval rules currently support 6, 12 and 24 months. Maintenance
requirements and stock coverage are application calculations; stock existence
and movements belong to Intraoperativa. No official maintenance tables are
created or modified by P1-T01.

`MAINTENANCE_INTERVALS=6,12,24`
`MAINTENANCE_LIVE_INTEGRATION=NO`

## Verified R4 state

- The final ownership tests pass and cover BizFlow guard/workday/leave
  ownership, Intraoperativa stock isolation, Sytex task ownership and Oppen
  separation.
- Demo role-experience counters are rendered only when explicit mock mode is
  active. Real mode does not silently substitute those fixtures.
- PostgreSQL, Prisma schema, migrations, n8n, Sytex sync and production were
  not modified or executed in R4.
- No commit or push was performed.

`R4_BASELINE_TESTS=92/92`
`R4_FINAL_TESTS=92/92`
`R4_CURRENT_FINAL_TESTS=92/92`
`TSC=PASS`
`ESLINT=PASS`
`BUILD=PASS`

## R5 historical correction state, superseded by R6

The application now derives demo task visibility through `UserScope` and the
shared scope helper. Zone IDs remain fixture data only; they are not embedded
in page-level authorization or presentation rules. The centralized role label
returns the correct text for TECHNICIAN, COORDINATOR, MANAGER and ADMIN.

`P1_T01_R5_STATUS=SUPERSEDED_BY_R6`
`P1_T01_STATUS=SUPERSEDED_BY_R6`
`HARDCODED_ZONE_SCOPE_REMOVED=YES`
`HARDCODED_ZONE_PRESENTATION_REMOVED=YES`
`ROLE_SCOPE_DERIVED_FROM_USER_SCOPE=YES`
`MANAGER_ROLE_LABEL_FIXED=YES`
`TECHNICIAN_DESKTOP_VISUAL=PASS`
`TECHNICIAN_MOBILE_VISUAL=PASS`
`COORDINATOR_VISUAL=PASS`
`MANAGER_VISUAL=PASS`
`ADMIN_VISUAL=PASS`
`R5_BASELINE_TESTS=92/92`
`R5_FINAL_TESTS=95/95`
`CURRENT_FINAL_TESTS=97/97`
`R5_TSC=PASS`
`R5_ESLINT=PASS`
`R5_BUILD=PASS`
`FULL_CONTEXT_UPDATED=YES`
`FULL_CONTEXT_CONSISTENCY_CHECK=PASS`

## P1-T02-R1 — guardias, jornadas y BizFlow mock (superseded by R2)

P1-T02 implements the operational contracts without connecting to live BizFlow
or changing PostgreSQL, Prisma, n8n, Sytex sync or production. BizFlow owns
resources, guard duties, login, workday start/end, vacations, leaves and
employment status. Sytex remains the source for tasks/forms and FNET derives
the operational outside-hours classification by crossing Sytex activities with
effective guard segments and the injectable holiday calendar.

Guard planning uses immutable effective segments. A mid-week replacement closes
the previous segment, creates the new effective segment, and records the actor,
timestamp, previous pair, new pair and reason in history. The local demo
repository persists through `localStorage` behind `GuardPlanningRepository`;
there is no live write capability. The service enforces the active `UserScope`,
requires two different known technicians, permits create/replace only for
Coordinator/Admin, and keeps Manager read-only and Technician own-scope only.

Workday and leave records use canonical fields (`resourceId`, `date`, login,
start/end, status, source; and `resourceId`, type, start/end, status, source),
with compatibility aliases for the existing fixtures. Operational classes are
`WITHIN_WORKING_HOURS`, `OUTSIDE_WORKING_HOURS_ON_GUARD`,
`OUTSIDE_WORKING_HOURS_NOT_ON_GUARD`, `ON_LEAVE_CONFLICT` and `UNASSIGNED`.
Working hours remain centralized at Monday-Friday 08:00 inclusive to 18:00
exclusive, with an injectable holiday calendar.

`P1_T02_STATUS=SUPERSEDED_BY_R2`
`GUARD_MODEL=GuardDuty+GuardDutySegment`
`GUARD_SEGMENT_HISTORY=GuardDutyHistoryEntry`
`MIDWEEK_REPLACEMENT=PASS`
`GUARD_AT_DATETIME_HELPER=PASS`
`TECHNICIAN_GUARD_SCOPE=OWN_TECHNICIAN_ONLY`
`COORDINATOR_GUARD_SCOPE=OWN_ZONES_READ_WRITE`
`MANAGER_GUARD_SCOPE=OWN_REGIONAL_ZONES_READ_ONLY`
`ADMIN_GUARD_SCOPE=GLOBAL_READ_WRITE`
`WORKDAY_MODEL=WorkdayRecord`
`LEAVE_MODEL=LeaveRecord`
`OUTSIDE_HOURS_CLASSIFIER=operational-time.ts`
`ON_GUARD_CLASSIFICATION=OUTSIDE_WORKING_HOURS_ON_GUARD`
`OFF_GUARD_CLASSIFICATION=OUTSIDE_WORKING_HOURS_NOT_ON_GUARD`
`GUARD_DEMO_PERSISTENCE=LOCAL_STORAGE_REPOSITORY`
`BIZFLOW_WRITE_CAPABILITY=UNKNOWN`
`BIZFLOW_LIVE_USED=NO`
`P1_T02_BASELINE_TESTS=97/97`
`P1_T02_FINAL_TESTS=103/103`
`P1_T02_TSC=PASS`
`P1_T02_ESLINT=PASS`
`P1_T02_BUILD=PASS`
`P1_T02_VISUAL=PASS_DESKTOP_AND_ROLE_FLOWS`
`P1_T02_FULL_CONTEXT_UPDATED=YES`
`P1_T02_FULL_CONTEXT_CONSISTENCY_CHECK=PASS`

## P1-T02-R2 — corrección técnica

R2 preserves the R1 implementation as history and corrects the findings from
technical review. Guard history is append-only: a new effective timestamp is
added, previous entries are never filtered out, and equivalent instants with
different ISO offsets are rejected. The service now rebuilds A+B → A+C → C+D
as three segments and two history entries without mutating the repository on a
duplicate timestamp.

Technician eligibility is resolved through the BizFlow resource fixture and its
effective zone (`onLoanZoneId` when present, otherwise `primaryZoneId`). The
service rejects unknown, inactive, out-of-scope and zone-ineligible technicians
in addition to the UI selector. A pair still requires two distinct technicians.

Outside-hours presentation now excludes `WITHIN_WORKING_HOURS` and gives
explicit labels to on-guard, off-guard, leave-conflict and unassigned states.
The technician summary is limited to the authenticated/demo technician and
shows weekly outside-hours, on-guard, off-guard and leave-conflict counts.

Segment badges use the explicit `DEMO_NOW` fixture instant and epoch-based
comparisons: `PAST` → Finalizado, `CURRENT` → Vigente, `FUTURE` → Próximo.
Temporal ordering, bounds, duplicate detection and overlap checks use parsed
epoch values rather than lexical ISO ordering.

`P1_T02_R2_STATUS=READY_FOR_TECHNICAL_REVIEW`
`P1_T02_STATUS=READY_FOR_TECHNICAL_REVIEW`
`IMMUTABLE_GUARD_HISTORY=PASS`
`MULTIPLE_MIDWEEK_REPLACEMENTS=PASS`
`DUPLICATE_EFFECTIVE_AT_REJECTED=PASS`
`TECHNICIAN_EXISTS_VALIDATION=PASS`
`TECHNICIAN_SCOPE_VALIDATION=PASS`
`TECHNICIAN_ZONE_ELIGIBILITY=PASS`
`OUTSIDE_HOURS_UI_FILTER=PASS`
`WITHIN_HOURS_NOT_MISLABELED=PASS`
`LEAVE_CONFLICT_LABEL=PASS`
`UNASSIGNED_LABEL=PASS`
`SEGMENT_PAST_STATUS=PASS`
`SEGMENT_CURRENT_STATUS=PASS`
`SEGMENT_FUTURE_STATUS=PASS`
`TEMPORAL_COMPARISON_USES_EPOCH=PASS`
`TECHNICIAN_WEEKLY_SUMMARY=PASS`
`TECHNICIAN_MOBILE_VISUAL=NOT_CERTIFIED`
`MOBILE_VIEWPORT=UNAVAILABLE_IN_CONFIGURED_CUA_BROWSER`
`COORDINATOR_VISUAL=PASS`
`MANAGER_VISUAL=PASS`
`ADMIN_VISUAL=PASS`
`R2_BASELINE_TESTS=103/103`
`R2_FINAL_TESTS=108/108`
`R2_TSC=PASS`
`R2_ESLINT=PASS`
`R2_BUILD=PASS`
`R2_FULL_CONTEXT_UPDATED=YES`
`R2_FULL_CONTEXT_CONSISTENCY_CHECK=PASS`

## P1-T02-R4 — corrección de timezone operativo Argentina + certificación mobile manual

R4 corrige una ambigüedad de representación: los valores sin sufijo de zona
son fecha/hora operativa local de `America/Argentina/Buenos_Aires`; los valores
con `Z` u offset explícito son instantes UTC/zonificados reales. Los fixtures
de guardias, jornadas y actividades operativas dejaron de serializar horas
locales como UTC. La capa `src/lib/operational-timezone.ts` centraliza la
conversión, el formateo y el round-trip de `datetime-local`, con diseño
reutilizable para una futura zona por organización/región.

`P1_T02_R4_STATUS=READY_FOR_TECHNICAL_REVIEW`
`P1_T02_STATUS=READY_FOR_TECHNICAL_REVIEW`
`ROOT_CAUSE=Horarios operativos locales serializados con Z y datetime-local convertido directamente con toISOString`
`ROOT_CAUSE_LAYER=Fixtures + límite de presentación/persistencia`
`ROOT_CAUSE_CONFIDENCE=HIGH`
`OPERATIONAL_TIMEZONE=America/Argentina/Buenos_Aires`
`LOCAL_OPERATIONAL_DATETIME_SEMANTICS=String sin zona; representa reloj operativo Argentina`
`UTC_INSTANT_SEMANTICS=String con Z u offset; representa un instante real`
`DATETIME_LOCAL_ROUNDTRIP=PASS`
`GUARD_0800_DISPLAY=08:00`
`WORKDAY_0800_DISPLAY=08:00`
`WORKING_HOURS_BOUNDARIES=07:59 fuera; 08:00 dentro; 17:59 dentro; 18:01 fuera`
`ON_GUARD_CLASSIFICATION=19:31 durante guardia -> OUTSIDE_WORKING_HOURS_ON_GUARD`
`TECHNICIAN_MOBILE_VISUAL=PASS`
`MOBILE_VIEWPORT=390x844`
`MOBILE_HORIZONTAL_OVERFLOW=NO`
`MOBILE_NAVIGATION=PASS`
`MOBILE_GUARD_CARD=PASS`
`MOBILE_WORKDAY_CARD=PASS`
`MOBILE_WEEKLY_SUMMARY=PASS`
`MOBILE_OUTSIDE_HOURS=PASS`
`MOBILE_SCOPE_ISOLATION=PASS`
`BASELINE_TESTS=108/108`
`FINAL_TESTS=114/114`
`TSC=PASS`
`ESLINT=PASS`
`BUILD=PASS`
`DATABASE_WRITTEN=NO`
`MIGRATIONS_RUN=NO`
`LIVE_INTEGRATIONS_USED=NO`
`PRODUCTION_TOUCHED=NO`

## P1-T02-R5 — cierre de residuos timezone

R5 elimina los últimos residuos de R4. Los defaults de nueva guardia usan
`DEFAULT_NEW_GUARD_START` y `DEFAULT_NEW_GUARD_END` como valores locales
operativos, sin `Z`. Los cruces de actividades con licencia/jornada usan
`operationalDateKey`, por lo que `2026-08-18T01:30:00Z` se resuelve como
`2026-08-17` en Argentina. Las fechas civiles BizFlow se formatean con
`formatOperationalDate` sin convertirlas en timestamps del navegador.

`P1_T02_R5_STATUS=READY_FOR_TECHNICAL_REVIEW`
`P1_T02_STATUS=READY_FOR_TECHNICAL_REVIEW`
`NEW_GUARD_DEFAULT_LOCAL_TIME=08:00`
`ACTIVITY_OPERATIONAL_DATE=2026-08-17`
`UTC_CROSS_MIDNIGHT_CASE=2026-08-18T01:30:00Z -> 2026-08-17`
`DATE_ONLY_SEMANTICS=Fecha civil sin conversión de timezone del host`
`DATETIME_LOCAL_ROUNDTRIP=PASS`
`BASELINE_TESTS=114/114`
`FINAL_TESTS=118/118`
`TSC=PASS`
`ESLINT=PASS`
`BUILD=PASS`
`DATABASE_WRITTEN=NO`
`MIGRATIONS_RUN=NO`
`LIVE_INTEGRATIONS_USED=NO`
`PRODUCTION_TOUCHED=NO`

## P1-T02-R6 — cierre de overflow horizontal mobile

R6 corrigió únicamente la contención responsive en `src/app/globals.css`. La
causa primaria auditada fue `.content-breadcrumb`: su fila flex no tenía
`min-width: 0`, `flex-wrap` ni truncamiento de la etiqueta de fuente, por lo
que el ancho intrínseco podía empujar el documento en mobile. Se protegió
además `.app-footer` y se acotaron overlay/drawer; el `overflow-x: clip` global
mobile queda como guardia secundaria y no como reemplazo de la corrección.

El CUA disponible no expone emulación real de 375/390/412 px, así que las
métricas `scrollWidth/clientWidth` de esos viewports no se inventan y requieren
validación manual en un navegador mobile real. La evidencia manual reportada
mantiene `MOBILE_NAV_OPEN=PASS`, `MOBILE_NAV_CLOSE=PASS` y
`MOBILE_MENU_CONTENT=PASS`.

`P1_T02_R6_STATUS=READY_FOR_TECHNICAL_REVIEW`
`P1_T02_STATUS=READY_FOR_TECHNICAL_REVIEW`
`BASELINE_TESTS=118/118`
`FINAL_TESTS=118/118`
`TSC=PASS`
`ESLINT=PASS`
`BUILD=PASS`
`DATABASE_WRITTEN=NO`
`MIGRATIONS_RUN=NO`
`LIVE_INTEGRATIONS_USED=NO`
`PRODUCTION_TOUCHED=NO`
`NEXT_ACTION=WAIT_FOR_TECHNICAL_REVIEW`

## HOTFIX-DASHBOARD-MOBILE-01 — Plan de hoy / task row overflow

Se auditó y corrigió exclusivamente el overflow mobile de las filas de tarea
dentro de `Plan de hoy`. La evidencia manual de 390x844 mostró un `.task-list`
de 316.667px con un track implícito de 384.458px y `.task-row` de 384.458px,
causando que el botón `+` quedara parcialmente fuera del panel.

La causa fue el mínimo automático intrínseco del track implícito de CSS Grid y
el `min-width:auto` del item flex. El hotfix agrega únicamente
`grid-template-columns:minmax(0, 1fr)` para `.task-list` y `min-width:0` para
`.task-row` en el override responsive de hasta 820px. No se agregaron reglas
globales de overflow, `100vw`, clipping ni truncamiento.

`HOTFIX_STATUS=CLOSED_TESTING_CERTIFIED`

`MOBILE_390_MANUAL=PASS`

`DOCUMENT_HORIZONTAL_OVERFLOW=NO`

La certificación manual real en Chrome DevTools para 390x844 confirmó después
del fix: `clientWidth=390`, `scrollWidth=390`, `.task-list` de
`316.66668701171875px`, track de `316.667px`, `.task-row` de
`316.66668701171875px`, `min-width=0px` y `rowActionRight=353.3333435058594px`.
Los botones `+` quedaron completamente visibles y `Plan de hoy` permanece
contenido dentro del panel.

`TASK_LIST_RULE_AFTER=grid-template-columns:minmax(0, 1fr)`

`TASK_ROW_MIN_WIDTH_AFTER=0`

`BASELINE_TESTS=118/118`

`FINAL_TESTS=118/118`

`TSC=PASS`

`ESLINT=PASS`

`BUILD=PASS`

`P1_T02_STATUS=CLOSED_TESTING_CERTIFIED`

`P1_T03_TOUCHED=NO`

`DATABASE_WRITTEN=NO`

`MIGRATIONS_RUN=NO`

`LIVE_INTEGRATIONS_USED=NO`

`PRODUCTION_TOUCHED=NO`

`NEXT_ACTION=WAIT_FOR_MANUAL_MOBILE_RETEST`

## R6 current cross-module scope state

R6 closed the last role-scope inconsistency before P1-T02. Vehicles,
guards, zones and crews are filtered with shared helpers from the active
`UserScope`, and the mock adapters reuse that policy. The dashboard resolves
zone metrics by `zoneId`; Cronograma shows the active scope for non-admins; and
the technician is isolated in tasks, vehicles, guards, zones and crews. The
demo selector remains a presentation fixture and is not production security.

`P1_T01_R6_STATUS=CLOSED_TESTING_CERTIFIED`
`P1_T01_STATUS=CLOSED_TESTING_CERTIFIED`
`TASK_SCOPE=PASS`
`VEHICLE_SCOPE=PASS`
`GUARD_SCOPE=PASS`
`ZONE_DASHBOARD_SCOPE=PASS`
`CREW_SCOPE=PASS`
`SCOPE_DERIVED_FROM_USER_SCOPE=YES`
`TECHNICIAN_TASK_ISOLATION=PASS`
`TECHNICIAN_VEHICLE_ISOLATION=PASS`
`TECHNICIAN_GUARD_ISOLATION=PASS`
`TECHNICIAN_CREW_ISOLATION=PASS`
`COORDINATOR_SCOPE=PASS`
`MANAGER_SCOPE=PASS`
`ADMIN_SCOPE=PASS`
`MOCK_SCOPE_IS_PRODUCTION_SECURITY=NO`
`AUTH_FNET_STATUS=UNVERIFIED`
`TECHNICIAN_DESKTOP_VISUAL=PASS`
`TECHNICIAN_MOBILE_VISUAL=PASS`
`COORDINATOR_VISUAL=PASS`
`MANAGER_VISUAL=PASS`
`ADMIN_VISUAL=PASS`
`R6_BASELINE_TESTS=95/95`
`R6_FINAL_TESTS=97/97`
`TSC=PASS`
`ESLINT=PASS`
`BUILD=PASS`
`FULL_CONTEXT_UPDATED=YES`
`FULL_CONTEXT_CONSISTENCY_CHECK=PASS`

## Known blockers and markers

### VERIFIED

- Ownership contracts and local adapters listed above exist in the repository.
- R4 and R5 validation were run from the local checkout.
- R4 did not write database data or execute migrations.

### UNVERIFIED

- FNET production authentication, identity provider integration and
  server-side scope enforcement.
- Sytex live Basic Auth outside Power Query/n8n and the TypeScript dry-run
  against that live authentication path.
- Availability and exact contracts of future live BizFlow, Intraoperativa,
  MaxTracker and Oppen endpoints.

### HISTORICAL_CLAIM

- R1, R2 and R3 report sections preserve their historical baselines and final
  counts. R4 reports them with explicit prefixes so they are not confused with
  the current final result.

### UNKNOWN

- Production release eligibility and operational approval.
- Any external system behavior not represented by the current local adapters.

## P1-T02-R6B — rollback del fix fallido y diagnóstico de overflow

R6B retiró únicamente las reglas responsive agregadas por R6 en
`src/app/globals.css`: clipping del documento, overflow oculto del breadcrumb,
truncamiento forzado de la fuente y contención adicional del footer/overlay.
Esas reglas podían recortar contenido sin eliminar la causa real del ancho, por
lo que R6 no queda certificada como solución.

Después del rollback, el navegador disponible observó `clientWidth=635`,
`scrollWidth=635` y `scrollLeft=0` en carga inicial, drawer abierto y drawer
cerrado, sin elementos visibles fuera del viewport disponible. No se pudo
emular 375x812, 390x844 ni 412x915 en esta sesión; la causa del caso mobile
original requiere retest manual con medición real.

`P1_T02_R6B_STATUS=READY_FOR_MANUAL_MOBILE_RETEST`
`P1_T02_STATUS=READY_FOR_MANUAL_MOBILE_RETEST`
`R6_ROLLBACK_DONE=YES`
`VIEWPORT_375_RESULT=NOT_MEASURABLE_IN_CONFIGURED_BROWSER`
`VIEWPORT_390_RESULT=NOT_MEASURABLE_IN_CONFIGURED_BROWSER`
`VIEWPORT_412_RESULT=NOT_MEASURABLE_IN_CONFIGURED_BROWSER`
`BASELINE_TESTS=118/118`
`FINAL_TESTS=118/118`
`TSC=PASS`
`ESLINT=PASS`
`BUILD=PASS`
`DATABASE_WRITTEN=NO`
`MIGRATIONS_RUN=NO`
`LIVE_INTEGRATIONS_USED=NO`
`PRODUCTION_TOUCHED=NO`
`NEXT_ACTION=WAIT_FOR_MANUAL_MOBILE_RETEST`

## P1-T02-R6C — fix quirúrgico del grid mobile

La medición manual real confirmó el overflow en `.schedule-layout`: el
contenedor medía 358 px, pero `grid-template-columns: 1fr` resolvía un track
de 425.792 px por el mínimo automático intrínseco de Grid y los items con
`min-width: auto`. R6C cambia únicamente ese override a
`minmax(0, 1fr)` y fija `min-width: 0` en el grid y sus items directos.

No se usa `overflow-x: hidden/clip` como solución primaria ni se trunca
contenido. R6 y R6B quedan superseded/failed para este problema; R5 y las
reglas de timezone/guardias siguen vigentes.

`P1_T02_R6C_STATUS=READY_FOR_MANUAL_MOBILE_RETEST`
`P1_T02_STATUS=READY_FOR_MANUAL_MOBILE_RETEST`
`MOBILE_390_HTML_CLIENTWIDTH=390`
`MOBILE_390_HTML_SCROLLWIDTH_BEFORE=442`
`SCHEDULE_LAYOUT_WIDTH=358`
`SCHEDULE_GRID_TRACK_BEFORE=425.792`
`ROOT_CAUSE_SOURCE=MANUAL_BROWSER_MEASUREMENT`
`BASELINE_TESTS=118/118`
`FINAL_TESTS=118/118`
`TSC=PASS`
`ESLINT=PASS`
`BUILD=PASS`
`DATABASE_WRITTEN=NO`
`MIGRATIONS_RUN=NO`
`LIVE_INTEGRATIONS_USED=NO`
`PRODUCTION_TOUCHED=NO`
`NEXT_ACTION=WAIT_FOR_MANUAL_MOBILE_RETEST`

## P1-T02-R6D — auditoría global del patrón Grid mobile

La evidencia manual confirmó que el patrón de sizing intrínseco de R6C se
repite en `.dashboard-grid`: el override mobile `grid-template-columns: 1fr`
permite que el mínimo automático del track conserve el ancho intrínseco de
`.day-plan-panel` y `.performance-panel`. R6D aplica el mismo fix semántico:
`minmax(0, 1fr)` y `min-width: 0` en los items directos. El fix R6C de
`.schedule-layout` se conserva.

La auditoría estática revisó los grids actuales y no encontró otro caso
confirmado por medición física. No se agregaron `overflow-x: hidden/clip`,
`100vw`, clipping ni truncamiento.

`P1_T02_R6D_STATUS=CLOSED_TESTING_CERTIFIED`
`P1_T02_STATUS=CLOSED_TESTING_CERTIFIED`
`ROOT_CAUSE_PATTERN=CSS Grid intrinsic sizing repeated across responsive layouts`
`GRIDS_NEEDING_MINMAX_ZERO=.dashboard-grid, .schedule-layout`
`GRID_ITEMS_NEEDING_MIN_WIDTH_ZERO=.dashboard-grid > * y items directos de .schedule-layout`
`DASHBOARD_GRID_RULE_BEFORE=mobile 1fr`
`DASHBOARD_GRID_RULE_AFTER=mobile minmax(0, 1fr)`
`SCHEDULE_GRID_RULE_AFTER=mobile minmax(0, 1fr)`
`MOBILE_390_CLIENTWIDTH=390`
`MOBILE_390_SCROLLWIDTH_BEFORE_R6D=442`
`DASHBOARD_GRID_WIDTH=358`
`DASHBOARD_GRID_TRACK_BEFORE=425.792`
`DAY_PLAN_PANEL_WIDTH_BEFORE=425.792`
`SCHEDULE_GRID_ROOT_CAUSE_CONFIRMED=YES`
`DASHBOARD_GRID_ROOT_CAUSE_CONFIRMED=YES`
`R6=FAILED_FIX_SUPERSEDED`
`R6B=DIAGNOSTIC_SUPERSEDED`
`R6C=PARTIAL_FIX_SUPERSEDED_BY_R6D`
`BASELINE_TESTS=118/118`
`FINAL_TESTS=118/118`
`TSC=PASS`
`ESLINT=PASS`
`BUILD=PASS`
`DATABASE_WRITTEN=NO`
`MIGRATIONS_RUN=NO`
`LIVE_INTEGRATIONS_USED=NO`
`PRODUCTION_TOUCHED=NO`
`NEXT_ACTION=WAIT_FOR_TECHNICAL_REVIEW`

`RELEASE_ELIGIBLE=NO`
`CLOSED_PRODUCTION=NO`
`NEXT_ACTION=WAIT_FOR_TECHNICAL_REVIEW`
