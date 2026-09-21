# HOTFIX-DASHBOARD-MOBILE-01 — Plan de hoy / task row overflow

## Auditoría

Rama: `euge/hotfix-dashboard-task-row-mobile`.

La medición manual aportada confirmó en 390x844:

- `.day-plan-panel`: 358px.
- `.task-list`: 316.667px, `min-width: 0`, `display: grid`.
- Track calculado de `.task-list`: 384.458px.
- `.task-row`: 384.458px, `min-width: auto`, `display: flex`.
- El `.row-action` quedaba parcialmente fuera del panel.

La regla existente de `.task-list` era únicamente `display: grid`; al no
definir columnas, el grid usaba un track implícito con mínimo automático. El
item flex `.task-row` conservaba su mínimo automático y su contenido
intrínseco expandía ese track.

`ROOT_CAUSE=CSS_GRID_INTRINSIC_SIZING_IMPLICIT_AUTO_TRACK_AND_TASK_ROW_AUTO_MINIMUM`

`ROOT_CAUSE_LAYER=CSS_GRID_MOBILE_LAYOUT`

`ROOT_CAUSE_CONFIDENCE=HIGH_MANUAL_BROWSER_MEASUREMENT`

## Fix mínimo

Solo se agregó en el override responsive existente:

```css
@media (max-width: 820px) {
  .task-list { grid-template-columns: minmax(0, 1fr); }
  .task-row { min-width: 0; }
}
```

`TASK_LIST_RULE_BEFORE=display:grid; implicit auto track`

`TASK_LIST_RULE_AFTER=grid-template-columns:minmax(0, 1fr)`

`TASK_ROW_MIN_WIDTH_BEFORE=auto`

`TASK_ROW_MIN_WIDTH_AFTER=0`

No se usó `overflow-x:hidden`, `overflow-x:clip`, `100vw`,
`max-width:100vw` ni truncamiento artificial. El botón `+` permanece visible
y la información de la tarea no se eliminó.

## Validación

`HOTFIX_STATUS=CLOSED_TESTING_CERTIFIED`

`MOBILE_390_MANUAL=PASS`

`DOCUMENT_HORIZONTAL_OVERFLOW=NO`

`MOBILE_390_CLIENT_WIDTH=390`

`MOBILE_390_SCROLL_WIDTH=390`

`MOBILE_390_TASK_LIST_WIDTH=316.66668701171875px`

`MOBILE_390_TASK_LIST_TRACK=316.667px`

`MOBILE_390_TASK_ROW_WIDTH=316.66668701171875px`

`MOBILE_390_TASK_ROW_MIN_WIDTH=0px`

`MOBILE_390_ROW_ACTION_RIGHT=353.3333435058594px`

`TASK_LIST_WIDTH_BEFORE=316.667px`

`TASK_LIST_TRACK_BEFORE=384.458px`

`TASK_ROW_WIDTH_BEFORE=384.458px`

`BASELINE_TESTS=118/118`

`FINAL_TESTS=118/118`

`TSC=PASS`

`ESLINT=PASS`

`BUILD=PASS`

La certificación manual real en Chrome DevTools 390x844 confirmó que los
botones `+` quedan completamente visibles, `Plan de hoy` permanece contenido
dentro del panel y no existe scroll horizontal documental.

`P1_T02_STATUS=CLOSED_TESTING_CERTIFIED`

`P1_T03_TOUCHED=NO`

`DATABASE_WRITTEN=NO`

`MIGRATIONS_RUN=NO`

`LIVE_INTEGRATIONS_USED=NO`

`PRODUCTION_TOUCHED=NO`

`NEXT_ACTION=WAIT_FOR_MANUAL_MOBILE_RETEST`
