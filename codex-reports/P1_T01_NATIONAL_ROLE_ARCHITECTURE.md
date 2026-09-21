# P1-T01 — Arquitectura operativa nacional y experiencia por rol

Fecha: 2026-09-18
Repositorio: `FNETSystemTracker`
Rama: `main`
Modo: contratos y fixtures locales; sin integraciones live.

## Alcance ejecutado

Se preparó una arquitectura extensible para operar por organización, región,
zona y base, con scopes server-side y adapters por fuente. Las zonas piloto
existentes son fixtures; no hay reglas de negocio condicionadas por nombres de
zona.

Se incorporaron contratos para:

- Organization, Region, Zone, Base, User, Role, UserScope y OperationalResource.
- Asset con asignación histórica a usuario, base, zona, región o sin asignar.
- GuardDuty, segmentos temporales e historial de cambios.
- Mantenimiento GE, AA y BATTERY, historial, insumos y cobertura de stock.
- Horarios laborales con dependencia inyectable de feriados.

## Ownership de fuentes

| Fuente | Responsabilidad | Adapter local |
|---|---|---|
| Sytex | tareas, formularios, FO, sitios, estados, mantenimiento e insumos declarados en tareas | `MockSytexAdapter` |
| BizFlow | recursos, guardias, logueo, jornada, vacaciones, licencias y situación laboral | `MockBizFlowAdapter` |
| MaxTracker | vehículos | `MockMaxTrackerAdapter` |
| Intraoperativa | stock, compras, entradas, egresos, entregas, movimientos y disponibilidad de materiales | `MockIntraoperativaAdapter` |
| Oppen | celulares, herramientas, indumentaria, equipamiento y activos asignables | `MockOppenAdapter` |

Cada adapter expone consultas con alcance (`get...ForScope`). La aplicación no
llama a ninguno de los sistemas externos en esta tarea. Los mocks devuelven
únicamente registros de su ownership y aplican `filterForScope` antes de
responder. FNET cruza los resultados, permisos, dashboards, alertas y
planificación.

## Scopes y roles

- `TECHNICIAN`: solamente tareas, vehículos y activos donde figura el técnico
  autenticado en la relación de alcance.
- `COORDINATOR`: sus zonas y bases asignadas.
- `MANAGER`: sus regiones, zonas y bases; no hereda toda la organización cuando
  existe una restricción inferior.
- `ADMIN`: alcance global.

El dashboard demo incorpora las cuatro experiencias y un selector de Gerente.
La autenticación sigue siendo demo: el scope está preparado, pero todavía no
es una barrera de seguridad real para una sesión autenticada.

## Modelos y helpers

- Jerarquía: `src/contracts/organization.ts` y extensión opcional de `Zone`.
- Scope: `src/lib/scope.ts`.
- Assets: `src/contracts/asset.ts`, `src/lib/asset-assignment.ts`.
- Guardias: `src/contracts/guard-duty.ts`, `src/lib/guard-duty-rules.ts`.
- Mantenimiento: `src/contracts/maintenance.ts`, `src/lib/maintenance-rules.ts`.
- Horarios: `src/lib/working-hours.ts`, con feriados inyectables.
- Intervalos de mantenimiento soportados: 6, 12 y 24 meses.

Los cambios de asignación de activos y segmentos de guardia conservan la
historia anterior, el momento del cambio y el actor. Son helpers puros locales;
no escriben PostgreSQL.

## Fixtures

Se agregaron organización Argentina, regiones norte/centro-sur, cinco bases,
scopes por rol, activos Oppen, mantenimientos GE/AA y requerimientos de stock.
Los IDs `tech-*`, `user-*@fnet.local` y zonas son explícitamente datos demo;
no representan identificadores productivos ni se presentan como autenticación
real.

## Corrección R2 — P1-T01-R2

La primera versión del reporte asignaba incorrectamente horarios a
Intraoperativa. La auditoría del código confirmó que `IntraoperativaAdapter` y
`MockIntraoperativaAdapter` exponían `getWorkingHoursForScope`; esa API fue
eliminada.

La responsabilidad quedó corregida así:

- BizFlow ahora expone recursos, guardias, `WorkdayRecord` para logueo/inicio/
  fin de jornada, `LeaveRecord` para vacaciones/licencias y
  `EmploymentRecord` para situación laboral.
- R2 había descrito Intraoperativa como limitada a requerimientos y cobertura
  de stock; esa definición queda corregida por R3. No expone jornadas,
  horarios, guardias, vacaciones, licencias ni RR. HH.
- Sytex continúa siendo dueño de tareas/formularios/FO/sitios/estados y de los
  insumos declarados en una tarea; no expone stock oficial.
- Oppen continúa separado como dueño de activos y sus asignaciones.

Se agregaron fixtures BizFlow y tests de ownership/no-exposición para las ocho
reglas solicitadas. No hubo integración live ni cambios en datos oficiales.

## P1-T01-R3 — cierre técnico

La auditoría R3 corrigió el ownership de necesidades de mantenimiento:

- `INTRAOPERATIVA = STOCK/MOVIMIENTOS`: `MockIntraoperativaAdapter` ahora solo
  expone `getStockRecordsForScope` y `getStockMovementsForScope`.
- `FNET = REQUERIMIENTOS/COBERTURA/FALTANTES`: la aplicación calcula
  `MaintenanceRequirement` desde `EquipmentSupplyProfile` y luego calcula
  `StockCoverage` y faltantes contra la existencia de Intraoperativa.
- `SYTEX` aporta tareas, formularios, FO, sitios y mantenimiento registrado;
  no es fuente del stock actual.
- `BizFlow` mantiene ownership de recursos, guardias, jornada, vacaciones,
  licencias y situación laboral.
- `Oppen` y `MaxTracker` permanecen separados para activos y vehículos.

El reporte R2 decía que Intraoperativa cubría “requerimientos y cobertura de
stock”; esa frase queda corregida históricamente por esta sección: los
requerimientos y la cobertura son cálculos FNET, y la existencia/movimientos
son datos Intraoperativa.

### Auditoría de tests R2

- `R2_TEST_FILES_ADDED=0`.
- `R2_TEST_FILES_MODIFIED=1`: `src/lib/source-ownership.test.ts`.
- `R2_TEST_CASES_ADDED=5`: ownership BizFlow jornada/guardias, BizFlow
  vacaciones/licencias, no exposición Intraoperativa de jornada/guardias,
  tareas Sytex sin stock oficial y separación Oppen/Intraoperativa.
- `R2_TEST_CASES_MODIFIED=1`: el caso de stock dejó de pedir cobertura a
  Intraoperativa y pasó a validar stock/movimientos.

R3 agregó `src/server/services/supply-coverage.test.ts` con dos casos para
demostrar cálculo FNET de necesidad y faltantes/cobertura.

### Baseline y validación R3

- `R3_BASELINE_TESTS=90/90`.
- `R3_BASELINE_TSC=PASS`.
- `R3_BASELINE_LINT=PASS`.
- `R3_BASELINE_BUILD=PASS`.
- Resultado final: `92/92` tests, TypeScript PASS, ESLint PASS y build PASS.

R3 dejó explícitamente separado su resultado del histórico R1/R2: el baseline
R3 fue `90/90` y su resultado final fue `92/92`.

## P1-T01-R4 — certificación final

R4 certifica el cierre técnico de P1-T01 sin iniciar P1-T02. Se revisaron los
adapters, contratos, fixtures, dashboards y tests de ownership contra la
definición final de responsabilidades. La corrección live-mode aplicada en
`src/app/page.tsx` evita mostrar el resumen fixture de roles cuando
`NEXT_PUBLIC_USE_MOCK_API=false`; si PostgreSQL no está disponible, el shell
real muestra estado no disponible y no contadores demo.

### Ownership final certificado

- `SYTEX`: tareas, formularios, FO, sitios, estados, mantenimiento registrado
  en formularios e insumos declarados/usados/comprados en una tarea.
- `BIZFLOW`: recursos, guardias, logueo, inicio y fin de jornada, vacaciones,
  licencias y situación laboral.
- `INTRAOPERATIVA`: stock, compras, entradas, egresos, entregas, movimientos y
  disponibilidad de materiales.
- `MAXTRACKER`: vehículos, patente, modelo, kilómetros, conducción, reputación,
  faltas y excesos.
- `OPPEN`: celulares, herramientas, indumentaria, equipamiento, activos
  asignables y asignaciones/devoluciones.
- `FNET`: cruces, permisos, dashboards, alertas, planificación y cálculo de
  requerimientos/cobertura de stock; no es fuente oficial de los registros de
  los sistemas anteriores.

### Baseline y resultado R4

- `R4_BASELINE_TESTS=92/92`.
- `R4_BASELINE_TSC=PASS`.
- `R4_BASELINE_LINT=PASS`.
- `R4_BASELINE_BUILD=PASS`.
- `R4_FINAL_TESTS=92/92`.
- `R4_CURRENT_FINAL_TESTS=92/92`.
- `R4_FINAL_TSC=PASS`.
- `R4_FINAL_LINT=PASS`.
- `R4_FINAL_BUILD=PASS`.

La inspección visual responsive se realizó sobre el shell real disponible en
desarrollo, con modo PostgreSQL sin datos oficiales: no hubo overflow
horizontal en móvil y no se presentaron KPIs demo como reales. La experiencia
por rol queda cubierta por los contratos, scopes, fixtures explícitos y
componentes de TECHNICIAN, COORDINATOR, MANAGER y ADMIN; la autenticación real
continúa fuera de este cierre.

### Contexto maestro

Se creó `PROJECT_FULL_CONTEXT_LATEST.md` con información verificada del código,
reportes y validaciones locales. El archivo distingue información
`VERIFIED`, `UNVERIFIED`, `HISTORICAL_CLAIM` y `UNKNOWN`, y no contiene secretos.

## Validación

### Línea base R1 (histórica)

- `git status -sb`: limpio sobre `main`.
- `git branch --show-current`: `main`.
- `git remote -v`: remotos `leo` y `origin` existentes.
- `PROJECT_FULL_CONTEXT_LATEST.md`: ausente en R1.
- `codex-reports/`: ausente.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm test`: PASS — 74/74.
- `npm run build`: PASS.

### Resultado final R1 (histórico)

- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm test`: PASS — 85/85 en 17 archivos (`R1_FINAL_TESTS=85/85`).
- `npm run build`: PASS.

Los tests cubren scopes por técnico/coordinador/gerente/admin, aislamiento de
stock, ownership de adapters, horarios y feriados, intervalos 6/12/24,
reasignación histórica de activos y cambios históricos de guardia.

## Límites y próximos pasos

No se inició P1-T02 ni ninguna tarea posterior. No se implementó autenticación
server-side real, por lo que P0-T05 continúa `BLOCKED_EXTERNAL_AUTH`. Para
producción se deberá reemplazar el selector demo por una sesión verificada y
derivar el `UserScope` en servidor antes de ejecutar cada adapter o servicio.

No se modificaron PostgreSQL, Prisma schema, migraciones, n8n, Sytex, BizFlow,
MaxTracker, Intraoperativa, Oppen ni despliegues.

## Estado requerido

```text
P1_T01_R3_STATUS=READY_FOR_TECHNICAL_REVIEW
P1_T01_RELEASE_STATUS=READY_FOR_TECHNICAL_REVIEW
SOURCE_OWNERSHIP_FINAL=PASS
BIZFLOW_RESOURCE_OWNER=YES
BIZFLOW_GUARD_OWNER=YES
BIZFLOW_WORKDAY_OWNER=YES
BIZFLOW_LEAVE_OWNER=YES
INTRAOPERATIVA_STOCK_OWNER=YES
INTRAOPERATIVA_MOVEMENT_OWNER=YES
INTRAOPERATIVA_REQUIREMENT_OWNER=NO
FNET_REQUIREMENT_OWNER=YES
FNET_STOCK_COVERAGE_OWNER=YES
SYTEX_TASK_OWNER=YES
MAXTRACKER_VEHICLE_OWNER=YES
OPPEN_ASSET_OWNER=YES
R3_BASELINE_TESTS=90/90
R3_FINAL_TESTS=92/92
R2_FINAL_TESTS=90/90
R2_TEST_FILES_ADDED=0
R2_TEST_FILES_MODIFIED=1
R2_TEST_CASES_ADDED=5
R2_TEST_CASES_MODIFIED=1
P1_T01_R2_STATUS=READY_FOR_TECHNICAL_REVIEW
SOURCE_OWNERSHIP_CORRECTED=YES
BIZFLOW_RESOURCE_OWNER=YES
BIZFLOW_GUARD_OWNER=YES
BIZFLOW_WORKDAY_OWNER=YES
BIZFLOW_LEAVE_OWNER=YES
INTRAOPERATIVA_STOCK_OWNER=YES
INTRAOPERATIVA_WORKDAY_FIELDS_REMOVED=YES
SYTEX_TASK_OWNER=YES
MAXTRACKER_VEHICLE_OWNER=YES
OPPEN_ASSET_OWNER=YES
R1_P1_T01_STATUS=READY_FOR_TECHNICAL_REVIEW
R1_FULL_CONTEXT_PRESENT=NO
R1_FULL_CONTEXT_UPDATED=NO
R1_FULL_CONTEXT_CONSISTENCY_CHECK=NOT_APPLICABLE_CONTEXT_FILE_ABSENT
ARCHITECTURE_NATIONAL_READY=YES
MODEL_ORGANIZATION=YES
MODEL_REGION=YES
MODEL_ZONE=YES
MODEL_BASE=YES
MODEL_USER_SCOPE=YES
MODEL_OPERATIONAL_RESOURCE=YES
MODEL_ROLE=YES
MODEL_ASSET_ASSIGNMENT_HISTORY=YES
MODEL_GUARD_DUTY_SEGMENTS_HISTORY=YES
MODEL_MAINTENANCE=YES
MODEL_SUPPLY_STOCK=YES
ROLE_TECHNICIAN_SCOPE=YES
ROLE_COORDINATOR_SCOPE=YES
ROLE_MANAGER_SCOPE=YES
ROLE_ADMIN_SCOPE=YES
ADAPTERS_DEFINED=YES
MOCK_ADAPTERS_DEFINED=YES
SOURCE_OWNERSHIP_DOCUMENTED=YES
WORKING_HOURS_HELPER=YES
MAINTENANCE_INTERVALS=6,12,24
LIVE_INTEGRATIONS_USED=NO
DATABASE_MODIFIED=NO
PRISMA_SCHEMA_MODIFIED=NO
MIGRATIONS_EXECUTED=NO
N8N_MODIFIED=NO
PRODUCTION_DEPLOYED=NO
REAL_AUTH_REQUIRES_SERVER_SIDE_SCOPE_ENFORCEMENT=SI
P0_T05_STATUS=BLOCKED_EXTERNAL_AUTH
R1_BASELINE_TSC=PASS
R1_BASELINE_LINT=PASS
R1_BASELINE_TESTS=74/74
R1_BASELINE_BUILD=PASS
R1_FINAL_TSC=PASS
R1_FINAL_LINT=PASS
R1_FINAL_TESTS=85/85
R1_FINAL_BUILD=PASS
COMMIT_SHA=NONE
DEPLOY_ID=NONE
INCIDENTAL_FINDINGS=Los IDs tech-* y los usuarios fnet.local son fixtures demo; no son identidad productiva. El contexto maestro no estaba presente.
NEXT_ACTION=WAIT_FOR_TECHNICAL_REVIEW
```

## P1-T01-R5 — corrección final de scope nacional

R5 corrigió los hallazgos detectados después de R4 sin iniciar P1-T02.
La visibilidad de tareas demo y de las tareas oficiales disponibles para el
shell se deriva ahora mediante `mockScopeForRole` + `filterTasksForScope`; no
hay listas de `zoneId` embebidas en `page.tsx` para autorizar o filtrar roles.
La jerarquía de una tarea usa los campos opcionales de organización, región y
base cuando la fuente los entrega, y no infiere regiones a partir del nombre
de una zona.

La presentación de alcance resuelve los nombres desde el scope activo y las
fixtures. Se centralizó `roleLabel`, incluyendo correctamente MANAGER =
`Gerente`, y se eliminaron los valores visuales fijos `NOA/NEA` de la lógica de
scope. Los porcentajes de cuadrilla quedaron como datos de fixture explícitos,
no como una regla basada en IDs.

### Tests R5

Se agregaron casos para coordinator/manager con `UserScope` alternativo,
scopes de técnico y admin, zona fixture desconocida autorizada por su scope,
y el mapa completo de `roleLabel`. La evidencia visual demo se realizó con
`NEXT_PUBLIC_USE_MOCK_API=true`: desktop a 1280×720 y móvil a 637×790; no hubo
overflow horizontal. Se inspeccionaron TECHNICIAN, COORDINATOR, MANAGER y ADMIN;
el técnico mostró solo tareas propias y sin Cotizaciones en navegación, el
manager mostró cuatro zonas y el admin mostró scope Global. El selector
confirmó el toast `Vista cambiada a Gerente`.

### Contexto P0-T05 / AUTH_FNET

R5 separa explícitamente dos deudas distintas:

- `P0-T05`: `BLOCKED_EXTERNAL_AUTH` por Basic Auth live de Sytex no certificada
  fuera de Power Query/n8n; el dry-run TypeScript continúa sin certificación
  live.
- `AUTH_FNET`: `UNVERIFIED` para autenticación real de usuarios, identity
  provider y enforcement server-side de `UserScope`.

### Estado R5 histórico, superado por R6

```text
P1_T01_R5_STATUS=SUPERSEDED_BY_R6
P1_T01_STATUS=SUPERSEDED_BY_R6
HARDCODED_ZONE_SCOPE_REMOVED=YES
HARDCODED_ZONE_PRESENTATION_REMOVED=YES
ROLE_SCOPE_DERIVED_FROM_USER_SCOPE=YES
MANAGER_ROLE_LABEL_FIXED=YES
TECHNICIAN_DESKTOP_VISUAL=PASS
TECHNICIAN_MOBILE_VISUAL=PASS
COORDINATOR_VISUAL=PASS
MANAGER_VISUAL=PASS
ADMIN_VISUAL=PASS
R5_BASELINE_TESTS=92/92
R5_FINAL_TESTS=95/95
R5_CURRENT_FINAL_TESTS=95/95
TSC=PASS
ESLINT=PASS
BUILD=PASS
FULL_CONTEXT_UPDATED=YES
FULL_CONTEXT_CONSISTENCY_CHECK=PASS
P0_T05_BLOCKER_CONTEXT_CORRECTED=YES
FNET_AUTH_BLOCKER_SEPARATED=YES
DATABASE_WRITTEN=NO
MIGRATIONS_RUN=NO
N8N_EXECUTED=NO
LIVE_INTEGRATIONS_USED=NO
PRODUCTION_TOUCHED=NO
RELEASE_ELIGIBLE=NO
CLOSED_PRODUCTION=NO
INCIDENTAL_FINDINGS=Se corrigió el scope nacional basado en listas de zonas y el label de MANAGER; no se iniciaron funcionalidades nuevas.
NEXT_ACTION=SEE_R6_STATUS
```

## P1-T01-R6 — cierre de scope transversal por rol

R6 corrigió la última inconsistencia de alcance transversal sin iniciar
P1-T02. La interfaz demo ya no decide la visibilidad de vehículos, guardias,
zonas o cuadrillas por posición de fixture ni por recortes dependientes del
rol. Todas esas colecciones se derivan del `UserScope` activo mediante helpers
compartidos; los adapters mock reutilizan la misma política. Los vehículos
resuelven además la zona de préstamo vigente del técnico cuando existe.

El dashboard usa métricas por `zoneId`, las cuadrillas visibles dependen del
scope, y Cronograma muestra el alcance del usuario en lugar de "Todas las
zonas" para roles no administradores. En modo demo, el técnico queda aislado
en tareas, guardias, vehículos, zonas y cuadrilla; las cotizaciones siguen
fuera de su navegación. La certificación visual local cubrió desktop para
COORDINATOR, MANAGER, ADMIN y TECHNICIAN, y móvil para TECHNICIAN.

### Estado vigente R6

```text
P1_T01_R6_STATUS=CLOSED_TESTING_CERTIFIED
P1_T01_STATUS=CLOSED_TESTING_CERTIFIED
TASK_SCOPE=PASS
VEHICLE_SCOPE=PASS
GUARD_SCOPE=PASS
ZONE_DASHBOARD_SCOPE=PASS
CREW_SCOPE=PASS
SCOPE_DERIVED_FROM_USER_SCOPE=YES
TECHNICIAN_TASK_ISOLATION=PASS
TECHNICIAN_VEHICLE_ISOLATION=PASS
TECHNICIAN_GUARD_ISOLATION=PASS
TECHNICIAN_CREW_ISOLATION=PASS
COORDINATOR_SCOPE=PASS
MANAGER_SCOPE=PASS
ADMIN_SCOPE=PASS
MOCK_SCOPE_IS_PRODUCTION_SECURITY=NO
AUTH_FNET_STATUS=UNVERIFIED
TECHNICIAN_DESKTOP_VISUAL=PASS
TECHNICIAN_MOBILE_VISUAL=PASS
COORDINATOR_VISUAL=PASS
MANAGER_VISUAL=PASS
ADMIN_VISUAL=PASS
R6_BASELINE_TESTS=95/95
R6_FINAL_TESTS=97/97
TSC=PASS
ESLINT=PASS
BUILD=PASS
FULL_CONTEXT_UPDATED=YES
FULL_CONTEXT_CONSISTENCY_CHECK=PASS
DATABASE_WRITTEN=NO
MIGRATIONS_RUN=NO
N8N_EXECUTED=NO
LIVE_INTEGRATIONS_USED=NO
PRODUCTION_TOUCHED=NO
RELEASE_ELIGIBLE=NO
CLOSED_PRODUCTION=NO
INCIDENTAL_FINDINGS=La autenticación FNET server-side continúa sin verificar; los fixtures de roles siguen siendo solo demo.
NEXT_ACTION=WAIT_FOR_TECHNICAL_REVIEW
```

## Estado R4 histórico, superado por R5

```text
P1_T01_R4_STATUS=CLOSED_TESTING_CERTIFIED
P1_T01_STATUS=CLOSED_TESTING_CERTIFIED
SOURCE_OWNERSHIP_FINAL=PASS
TECHNICIAN_DESKTOP_VISUAL=PASS
TECHNICIAN_MOBILE_VISUAL=PASS
COORDINATOR_VISUAL=PASS
MANAGER_VISUAL=PASS
ADMIN_VISUAL=PASS
R4_BASELINE_TESTS=92/92
R4_FINAL_TESTS=92/92
R4_CURRENT_FINAL_TESTS=92/92
TSC=PASS
ESLINT=PASS
BUILD=PASS
PROJECT_FULL_CONTEXT_CREATED=YES
FULL_CONTEXT_CONSISTENCY_CHECK=PASS
DATABASE_WRITTEN=NO
MIGRATIONS_RUN=NO
N8N_EXECUTED=NO
LIVE_INTEGRATIONS_USED=NO
PRODUCTION_TOUCHED=NO
RELEASE_ELIGIBLE=NO
CLOSED_PRODUCTION=NO
INCIDENTAL_FINDINGS=Se corrigió la exposición de RoleExperienceSummary con fixtures cuando el modo real está activo; no se agregaron funcionalidades nuevas.
NEXT_ACTION=WAIT_FOR_TECHNICAL_REVIEW
```
