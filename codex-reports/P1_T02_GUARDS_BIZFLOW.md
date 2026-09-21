# P1-T02 — Guardias, jornadas y BizFlow mock

## P1-T02-R1 — baseline histórico

La primera ronda implementó los contratos locales de guardias, jornadas,
licencias y clasificación operativa. Sus resultados quedan preservados como
histórico y pasan a `SUPERSEDED_BY_R2` después de la revisión técnica.

## Alcance certificado

P1-T02 implementa el flujo operativo local de guardias, jornadas, licencias y
clasificación de actividad fuera de horario. No conecta BizFlow en vivo y no
modifica PostgreSQL, Prisma, migraciones, n8n, sincronización Sytex, Railway ni
producción.

Las fuentes respetadas son:

- BizFlow: recursos, guardias, logueo, inicio/fin de jornada, vacaciones,
  licencias y situación laboral.
- Sytex: tareas, formularios, FO, sitios, estados y actividad de tareas.
- FNET: cruce de fuentes, planificación local y clasificación operativa.

## Modelo de guardias

`GuardDuty` representa el período operativo. `GuardDutySegment` representa el
par efectivo durante un intervalo `[startAt, endAt)`. `GuardDutyHistoryEntry`
conserva cada cambio con fecha/hora, actor, par anterior, par nuevo y motivo.

`buildGuardSegments` valida fechas, exige exactamente dos técnicos distintos,
ordena los cambios y no permite segmentos superpuestos. `getGuardAt` resuelve
el segmento vigente para un instante. Un reemplazo A+B → A+C conserva el tramo
anterior y agrega el tramo nuevo; no se fija una pareja permanente.

El servicio de planificación valida `UserScope`: Coordinador y Administrador
pueden crear/reemplazar; Gerente solo consulta; Técnico solo recibe su propio
alcance. En el caso de un reemplazo, el servicio no considera vigente para un
técnico un tramo efectivo en el que ya no participa.

## Jornada, licencias y horario operativo

`WorkdayRecord` contiene los campos canónicos `resourceId`, `date`, `loginAt`,
`workdayStartedAt`, `workdayEndedAt`, `status` y `source`. `LeaveRecord`
contiene `resourceId`, tipo, inicio, fin, estado y fuente. Se conservaron
aliases de compatibilidad para fixtures existentes.

La regla central de horario es lunes a viernes, 08:00 inclusive hasta 18:00
exclusive. El calendario de feriados se inyecta; no se hardcodea en los
componentes. Las clases posibles son:

- `WITHIN_WORKING_HOURS`
- `OUTSIDE_WORKING_HOURS_ON_GUARD`
- `OUTSIDE_WORKING_HOURS_NOT_ON_GUARD`
- `ON_LEAVE_CONFLICT`
- `UNASSIGNED`

Una actividad sin técnico determinístico queda `UNASSIGNED`. La UI muestra la
fuente de cada bloque y no presenta una integración BizFlow real.

## Persistencia demo

`GuardPlanningRepository` abstrae la persistencia. `LocalGuardPlanningRepository`
usa `localStorage` cuando existe y un fallback de memoria en ejecución server.
Los fixtures se usan únicamente cuando está activo `NEXT_PUBLIC_USE_MOCK_API`;
el flujo real de guardias queda bloqueado con estado no disponible.

## UI validada

- Coordinador: puede abrir Guardias, asignar una guardia y reemplazarla a mitad
  de período; la pantalla muestra el historial con actor y fecha.
- Técnico: ve `Mi guardia`, `Mi jornada` y la actividad fuera de horario de su
  alcance.
- Gerente: consulta la cobertura y el historial sin botones de modificación.
- Administrador: consulta el alcance global y dispone de las acciones demo.
- La vista incluye actividad Sytex demo cruzada con segmentos BizFlow demo y
  marca actividades sin técnico como `UNASSIGNED`.

La inspección de escritorio y flujo de roles se ejecutó con el servidor local
en modo demo explícito. La hoja de estilos incluye los breakpoints móviles y
el layout se mantiene en una sola columna para formularios, tarjetas y
actividad en pantallas angostas.

## Validación

`P1_T02_BASELINE_TESTS=97/97`
`P1_T02_FINAL_TESTS=103/103`
`TSC=PASS`
`ESLINT=PASS`
`BUILD=PASS`

Los tests cubren: alcance por rol, cambio de UserScope, segmentos efectivos,
historial de reemplazo, actor, ausencia de solapamiento, pares duplicados,
ventanas inválidas, persistencia local, jornada, licencias, horario laboral,
feriados, guardia/no guardia y técnico no asignado.

## Límites y siguientes pasos

`BIZFLOW_WRITE_CAPABILITY=UNKNOWN`. No se simuló capacidad de escritura live ni
se presentaron los roles demo como seguridad real. Para producción se requiere
autenticación FNET server-side, identidad confiable y enforcement server-side
de `UserScope`, además del contrato live de BizFlow.

`DATABASE_WRITTEN=NO`
`MIGRATIONS_RUN=NO`
`N8N_EXECUTED=NO`
`LIVE_INTEGRATIONS_USED=NO`
`PRODUCTION_TOUCHED=NO`
`COMMIT_SHA=NONE`
`DEPLOY_ID=NONE`
`RELEASE_ELIGIBLE=NO`
`CLOSED_PRODUCTION=NO`
`NEXT_ACTION=WAIT_FOR_TECHNICAL_REVIEW`

## P1-T02-R6 — corrección final de overflow horizontal mobile

R6 corrige la contención responsive sin iniciar P1-T03 ni tocar integraciones.
La causa identificada en el layout fue una fila `.content-breadcrumb` flexible
sin `min-width: 0`, sin wrap y sin límite para la etiqueta de fuente; en anchos
mobile esa fila podía conservar el ancho intrínseco de su contenido y empujar el
documento. El footer tenía el mismo riesgo de fila no contenida. El drawer y su
overlay son `position: fixed`, por lo que no son la causa primaria; se agregó
contención secundaria para que tampoco puedan ampliar el viewport.

La corrección está limitada a `src/app/globals.css`: breadcrumb con wrap y
truncamiento seguro, contención de top-level flex containers/footer y límites
mobile para overlay/drawer. `overflow-x: clip` en `html, body` es solo una
guardia secundaria; no reemplaza la corrección del elemento ofensivo.

El navegador CUA de este entorno no permite emular realmente los viewports
375x812, 390x844 o 412x915: sus ventanas observables fueron 864x790 y 1600x900.
Por eso no se falsifican métricas `scrollWidth/clientWidth` de esos viewports.
La certificación visual mobile real queda para revisión con un navegador que
exponga esos tamaños. La evidencia manual existente conserva menú abierto,
cierre y contenido dentro del drawer como PASS.

`P1_T02_R6_STATUS=READY_FOR_TECHNICAL_REVIEW`
`P1_T02_STATUS=READY_FOR_TECHNICAL_REVIEW`
`ROOT_CAUSE=.content-breadcrumb y app-footer sin contención de ancho intrínseco mobile`
`ROOT_CAUSE_LAYER=CSS responsive layout`
`ROOT_CAUSE_CONFIDENCE=HIGH_BY_CODE_AUDIT`
`OFFENDING_ELEMENT=.content-breadcrumb (primary); .app-footer (secondary risk)`
`OFFENDING_CSS_RULE=display:flex sin min-width:0/flex-wrap/overflow containment`
`VIEWPORT_375_SCROLLWIDTH=NOT_MEASURED_IN_CONFIGURED_CUA_BROWSER`
`VIEWPORT_375_CLIENTWIDTH=NOT_MEASURED_IN_CONFIGURED_CUA_BROWSER`
`VIEWPORT_390_SCROLLWIDTH=NOT_MEASURED_IN_CONFIGURED_CUA_BROWSER`
`VIEWPORT_390_CLIENTWIDTH=NOT_MEASURED_IN_CONFIGURED_CUA_BROWSER`
`VIEWPORT_412_SCROLLWIDTH=NOT_MEASURED_IN_CONFIGURED_CUA_BROWSER`
`VIEWPORT_412_CLIENTWIDTH=NOT_MEASURED_IN_CONFIGURED_CUA_BROWSER`
`DRAWER_OPEN_OVERFLOW=NOT_MEASURED_IN_CONFIGURED_CUA_BROWSER`
`DRAWER_CLOSED_OVERFLOW=NOT_MEASURED_IN_CONFIGURED_CUA_BROWSER`
`POST_DRAWER_HORIZONTAL_SCROLL=NOT_MEASURED_IN_CONFIGURED_CUA_BROWSER`
`MOBILE_NAV_OPEN=PASS_REPORTED_MANUAL`
`MOBILE_NAV_CLOSE=PASS_REPORTED_MANUAL`
`MOBILE_MENU_CONTENT=PASS_REPORTED_MANUAL`
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

## P1-T02-R4 — timezone operativo Argentina + certificación mobile manual

R4 corrigió el bug por el cual una hora operativa local, serializada con
`Z`, se mostraba tres horas antes en Argentina. La semántica queda separada:
un datetime sin zona es un `LOCAL_OPERATIONAL_DATETIME` y un datetime con `Z`
u offset explícito es un `UTC_INSTANT`. La capa central está en
`src/lib/operational-timezone.ts` y permite cambiar la zona por organización
en el futuro sin repartir conversiones por componentes.

El flujo `datetime-local` conserva la hora seleccionada en Argentina durante
la edición; al persistir la convierte a UTC y al volver a mostrarla la
convierte nuevamente a la zona operativa. Las guardias, jornadas y actividades
demo operativas ahora usan strings locales sin `Z`; los instantes externos
explícitamente zonificados mantienen su conversión real.

Casos certificados por tests: 08:00 se muestra 08:00, 18:00 se muestra 18:00,
el round-trip 08:00 local produce 11:00Z y vuelve a 08:00, los límites son
07:59 fuera, 08:00 dentro, 17:59 dentro y 18:01 fuera, y una actividad 19:31
durante guardia queda `OUTSIDE_WORKING_HOURS_ON_GUARD`.

La certificación visual mobile fue realizada manualmente por el coordinador
técnico en viewport 390x844: navegación, cards de guardia/jornada, resumen
semanal, actividad fuera de horario, scope y ausencia de overflow horizontal
quedaron aprobados.

`P1_T02_R4_STATUS=READY_FOR_TECHNICAL_REVIEW`
`P1_T02_STATUS=READY_FOR_TECHNICAL_REVIEW`
`ROOT_CAUSE=Horarios operativos locales serializados con Z y datetime-local convertido directamente con toISOString`
`ROOT_CAUSE_LAYER=Fixtures + límite de presentación/persistencia`
`ROOT_CAUSE_CONFIDENCE=HIGH`
`OPERATIONAL_TIMEZONE=America/Argentina/Buenos_Aires`
`LOCAL_OPERATIONAL_DATETIME_SEMANTICS=Sin sufijo de zona; reloj operativo local`
`UTC_INSTANT_SEMANTICS=Z u offset explícito; instante real`
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
`N8N_EXECUTED=NO`
`LIVE_INTEGRATIONS_USED=NO`
`PRODUCTION_TOUCHED=NO`
`NEXT_ACTION=WAIT_FOR_TECHNICAL_REVIEW`

## P1-T02-R5 — cierre de residuos timezone

R5 elimina los últimos residuos detectados en R4. Los defaults de nueva
guardia usan `DEFAULT_NEW_GUARD_START` y `DEFAULT_NEW_GUARD_END` como valores
locales operativos sin `Z`, y el formulario conserva 08:00 Argentina durante
el round-trip de `datetime-local`. Los cruces de actividades con licencia y
jornada usan `operationalDateKey`; por eso el instante explícito
`2026-08-18T01:30:00Z` pertenece al día operativo `2026-08-17`. Las fechas
civiles BizFlow se formatean con `formatOperationalDate` sin interpretarlas
como timestamps del navegador.

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
`N8N_EXECUTED=NO`
`LIVE_INTEGRATIONS_USED=NO`
`PRODUCTION_TOUCHED=NO`
`NEXT_ACTION=WAIT_FOR_TECHNICAL_REVIEW`

## P1-T02-R2 — corrección técnica

R2 no agrega un módulo nuevo ni inicia P1-T03. Corrige el histórico, la
elegibilidad y la clasificación visual/temporal sin tocar PostgreSQL, Prisma,
migraciones, n8n, Sytex live, BizFlow live, Railway, deploy, commit o push.

### Histórico inmutable

`GuardPlanningService.replace` conserva todos los cambios anteriores y agrega
el nuevo punto efectivo. La secuencia A+B → A+C → C+D produce tres segmentos y
dos entradas históricas. Un timestamp efectivo duplicado se rechaza comparando
epoch, incluyendo timestamps equivalentes con offsets distintos; el repository
queda sin mutación cuando la operación es rechazada.

La precarga de `GuardForm` resuelve la pareja efectiva del instante elegido y
usa el último tramo aplicable para un cambio nuevo. Ya no toma siempre el
primer segmento de la semana ni reutiliza silenciosamente la pareja inicial.

### Elegibilidad

La lista y el servicio usan `mockBizFlowResources`, derivado de los técnicos
con `primaryZoneId`/`onLoanZoneId`, como relación determinística de recurso a
zona. El servicio rechaza técnico inexistente, inactivo, fuera de
`UserScope`, no elegible para la zona seleccionada y pareja con técnicos
iguales. El selector se limita a técnicos habilitados para la zona actual; la
validación server/service no depende del orden del array.

### Clasificación horaria

`OutsideHoursPanel` excluye `WITHIN_WORKING_HOURS`. Presenta etiquetas
explícitas para `OUTSIDE_WORKING_HOURS_ON_GUARD`,
`OUTSIDE_WORKING_HOURS_NOT_ON_GUARD`, `ON_LEAVE_CONFLICT` y `UNASSIGNED`.
El resumen del técnico calcula solo su propio recurso para la semana demo:
fuera de horario, durante guardia, fuera de guardia y conflictos de licencia.

### Estados temporales

La UI evalúa segmentos contra `DEMO_NOW=2026-08-18T12:00:00.000Z` y muestra
`Finalizado`, `Vigente` o `Próximo`. Límites, orden, duplicados y solapamientos
usan `Date.parse`/epoch; no se utiliza orden lexicográfico para semántica
temporal.

### Certificación visual y límites

Coordinator desktop, Manager desktop y Admin desktop fueron revisados en modo
demo explícito. El navegador CUA configurado solo expone el viewport de la
aplicación y no permitió emulación móvil real; por eso
`TECHNICIAN_MOBILE_VISUAL=NOT_CERTIFIED` y no se marca PASS por la existencia
de media queries. La implementación mantiene los breakpoints responsive, pero
requiere una revisión posterior con viewport móvil real.

`P1_T02_R1_STATUS=SUPERSEDED_BY_R2`
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
`TSC=PASS`
`ESLINT=PASS`
`BUILD=PASS`
`FULL_CONTEXT_UPDATED=YES`
`FULL_CONTEXT_CONSISTENCY_CHECK=PASS`

`DATABASE_WRITTEN=NO`
`MIGRATIONS_RUN=NO`
`N8N_EXECUTED=NO`
`LIVE_INTEGRATIONS_USED=NO`
`PRODUCTION_TOUCHED=NO`
`RELEASE_ELIGIBLE=NO`
`CLOSED_PRODUCTION=NO`
`NEXT_ACTION=WAIT_FOR_TECHNICAL_REVIEW`

## P1-T02-R6B — rollback del fix fallido y diagnóstico de overflow

La auditoría identificó que R6 había agregado únicamente reglas en
`src/app/globals.css`: contención/truncamiento de `.content-breadcrumb`,
contención de `.app-footer`, límites para overlay/drawer y
`overflow-x: clip` en `html, body`. Esas reglas no eliminaban el elemento que
originara el ancho, sino que podían recortar contenido; por eso R6 fue tratado
como una corrección visual fallida.

Se retiraron quirúrgicamente esas reglas R6. No se revirtieron R5, timezone,
guardias, histórico ni tests funcionales anteriores. El diagnóstico disponible
posterior al rollback observó carga inicial, drawer abierto y drawer cerrado
con `scrollWidth=clientWidth=635` y `scrollLeft=0`; no observó elementos visibles
fuera de los límites en el viewport disponible. El entorno CUA no expone un
viewport real 390x844 ni permite abrir Chrome con emulación mobile, por lo que
la causa del overflow original en 390x844 queda pendiente de medición física.

`P1_T02_R6B_STATUS=READY_FOR_MANUAL_MOBILE_RETEST`
`P1_T02_STATUS=READY_FOR_MANUAL_MOBILE_RETEST`
`R6_FAILED_FIX_ROOT_CAUSE=reglas de clipping/overflow ocultaron contenido en lugar de eliminar la causa de layout`
`R6_ROLLBACK_DONE=YES`
`ROOT_CAUSE=NOT_REPRODUCED_IN_AVAILABLE_VIEWPORT_AFTER_ROLLBACK`
`ROOT_CAUSE_LAYER=UNVERIFIED_RESPONSIVE_LAYOUT`
`ROOT_CAUSE_CONFIDENCE=LOW_FOR_ORIGINAL_390PX_CASE`
`OFFENDING_ELEMENTS=NONE_OBSERVED_IN_AVAILABLE_VIEWPORT`
`OFFENDING_CSS_OR_LAYOUT_RULE=R6 .content-breadcrumb overflow:hidden y html/body overflow-x:clip (retirados)`
`INITIAL_HTML_CLIENTWIDTH=635`
`INITIAL_HTML_SCROLLWIDTH=635`
`INITIAL_HTML_SCROLLLEFT=0`
`DRAWER_OPEN_HTML_CLIENTWIDTH=635`
`DRAWER_OPEN_HTML_SCROLLWIDTH=635`
`DRAWER_OPEN_HTML_SCROLLLEFT=0`
`DRAWER_CLOSED_HTML_CLIENTWIDTH=635`
`DRAWER_CLOSED_HTML_SCROLLWIDTH=635`
`DRAWER_CLOSED_HTML_SCROLLLEFT=0`
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

La medición real de DevTools confirmó que `.schedule-layout` tenía un ancho
de 358 px, pero el override mobile `grid-template-columns: 1fr` permitía el
mínimo automático intrínseco del track. El track resolvía 425.792 px y sus
items heredaban `min-width: auto`, generando 52 px de overflow documental.

El cambio mínimo en `src/app/globals.css` reemplaza ese override por
`grid-template-columns: minmax(0, 1fr)` y agrega `min-width: 0` únicamente a
`.schedule-layout` y sus items directos relevantes. No se agregó
`overflow-x: hidden/clip` como solución y no se truncó contenido.

`R6` y `R6B` quedan superseded/failed respecto de este overflow; R5 y las
funcionalidades de guardias/timezone permanecen vigentes.

`P1_T02_R6C_STATUS=READY_FOR_MANUAL_MOBILE_RETEST`
`P1_T02_STATUS=READY_FOR_MANUAL_MOBILE_RETEST`
`ROOT_CAUSE=minimum automatico implicito de Grid con 1fr y min-width:auto en items`
`ROOT_CAUSE_LAYER=CSS Grid intrinsic sizing`
`ROOT_CAUSE_CONFIDENCE=HIGH_MANUAL_BROWSER_MEASUREMENT`
`SCHEDULE_LAYOUT_CSS_RULE=mobile 1fr -> minmax(0, 1fr)`
`SCHEDULE_GRID_TRACK_BEFORE=425.792px`
`SCHEDULE_GRID_TRACK_AFTER=<=358px_expected_by_constraint`
`GRID_ITEM_MIN_WIDTH_BEFORE=auto`
`GRID_ITEM_MIN_WIDTH_AFTER=0px`
`MOBILE_390_HTML_CLIENTWIDTH=390`
`MOBILE_390_HTML_SCROLLWIDTH_BEFORE=442`
`SCHEDULE_LAYOUT_WIDTH=358`
`ROOT_CAUSE_SOURCE=MANUAL_BROWSER_MEASUREMENT`
`VIEWPORT_375_RESULT=NOT_MEASURED_IN_CONFIGURED_BROWSER`
`VIEWPORT_390_RESULT=FIX_READY_FOR_MANUAL_RETEST`
`VIEWPORT_412_RESULT=NOT_MEASURED_IN_CONFIGURED_BROWSER`
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

La auditoría estática revisó las reglas `display: grid` y
`grid-template-columns` de las pantallas actuales. La evidencia manual
confirmó que el mismo patrón de sizing intrínseco de R6C aparece en
`.dashboard-grid`: el override mobile `grid-template-columns: 1fr` deja el
mínimo automático del track y `.day-plan-panel`/`.performance-panel` pueden
conservar un ancho intrínseco mayor que el contenedor.

El fix mínimo cambia únicamente el dashboard mobile a
`grid-template-columns: minmax(0, 1fr)` y permite contraerse a los items
directos. El fix R6C de `.schedule-layout` se conserva. No se agregaron reglas
globales de `overflow-x`, `width: 100vw`, clipping ni truncamiento.

Clasificación de la auditoría: `.dashboard-grid` y `.schedule-layout` quedan
en `NEEDS_MINMAX_ZERO` por medición; sus paneles directos quedan en
`NEEDS_ITEM_MIN_WIDTH_ZERO`. Los grids que ya usan `minmax(0, ...)`, tablas
con scroll interno o estructuras de iconos/listas fueron `SAFE` o
`NOT_APPLICABLE`; no hubo otros grids confirmados por medición física.

`P1_T02_R6D_STATUS=CLOSED_TESTING_CERTIFIED`
`P1_T02_STATUS=CLOSED_TESTING_CERTIFIED`
`ROOT_CAUSE_PATTERN=CSS Grid intrinsic sizing repeated across responsive layouts`
`ROOT_CAUSE_LAYER=CSS Grid minimum automatico de tracks/items`
`ROOT_CAUSE_CONFIDENCE=HIGH_MANUAL_BROWSER_MEASUREMENT`
`RESPONSIVE_GRIDS_AUDITED=display:grid y grid-template-columns en globals.css y pantallas actuales`
`GRIDS_NEEDING_MINMAX_ZERO=.dashboard-grid, .schedule-layout`
`GRID_ITEMS_NEEDING_MIN_WIDTH_ZERO=.dashboard-grid > *, .day-plan-panel, .performance-panel, .schedule-layout > * y items directos R6C`
`DASHBOARD_GRID_RULE_BEFORE=mobile 1fr`
`DASHBOARD_GRID_RULE_AFTER=mobile minmax(0, 1fr)`
`SCHEDULE_GRID_RULE_AFTER=mobile minmax(0, 1fr)`
`OTHER_AFFECTED_GRIDS=NONE_CONFIRMED_BY_MANUAL_MEASUREMENT`
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
