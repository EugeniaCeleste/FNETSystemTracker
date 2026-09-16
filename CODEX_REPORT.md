# CODEX Report — FNET System Tracker

- Fecha: 2026-09-15
- Rama: `main`
- Repositorio local: checkout Git completo de `FNETSystemTracker`
- Remoto: `https://github.com/LeoCampos2504/FNETSystemTracker.git`

## Diagnóstico y stack

El repositorio era una base Next.js mínima con contratos, mocks de dominio, repositorios de memoria y health check. Stack encontrado y conservado:

- Next.js 16.3.1, App Router y TypeScript
- React 19
- Tailwind CSS 4
- Prisma 7 (infraestructura mínima existente)
- Recharts, Zod, lucide-react, Vitest

En el diagnóstico inicial todavía no había una conexión utilizable desde este entorno. Posteriormente se verificó el `schema.prisma` ya introspectado por el usuario desde su PC y se trabajó exclusivamente sobre ese schema; no se volvió a ejecutar `prisma db pull` desde Codex.

El checkout actual contiene `.env.local` en su raíz, está ignorado por Git y tiene configurada la conexión server-side; el modo de mocks está desactivado para la ejecución real. El valor secreto no se imprimió ni se registró.

## Arquitectura final del prototipo

- Una sola PWA con experiencia por rol.
- `src/app/page.tsx`: shell de aplicación, login demo, navegación y vistas operativas.
- `src/components/live-dashboard.tsx`: dashboard real de coordinación, métricas operativas, alertas y drill-down.
- `src/app/globals.css`: sistema visual responsive, sidebar, cards, tablas, mapas y estados.
- Contratos y mocks existentes reutilizados como read-model demo.
- Fuentes Sytex presentadas como solo lectura; las acciones de planificación son internas.
- `public/manifest.webmanifest` y `public/sw.js` para base instalable/offline-ready.

## Tablas oficiales y datos

El schema introspectado contiene los cuatro modelos reales:

- `correctivos`: `id`, `codigo` único, estado, proyecto, sitios afectados, fechas de ciclo Sytex, rechazos, enlace y metadatos de sincronización.
- `preventivos`: `id`, `codigo` único, estado, proyecto, sitios afectados, fechas de ciclo Sytex, rechazos, enlace y metadatos de sincronización.
- `cotizaciones`: `id`, `codigo` único, estado, `codigo_tarea`, proyecto, sitio, proveedor, importes, fechas y enlace.
- `insumos`: `id`, `formulario`, `grupo`, `indice`, cantidad, descripción, proveedor, sitio, estado e imagen; la clave única introspectada es `formulario + grupo + indice`.

La actualización del schema agregó además:

- `cargas_combustible_ge`: `formulario`, `codigo_tarea`, sitio, `origen`, combustible, tanque, litros, niveles, horómetro, GE en marcha, fechas y clave única `formulario + origen + clave_origen`.
- `pendientes_visita`: `formulario`, `origen_fuente`, sitio, grupo, índice, pregunta, respuesta, comentarios, estado y clave única `formulario + origen_fuente + clave_origen`.

Se implementó un read model server-side con Prisma 7 + adapter PostgreSQL. Las rutas consultan esas tablas con `count`/`findMany` y no contienen operaciones de escritura, migraciones ni `db push`. `DATABASE_URL` no se envía al cliente ni aparece en variables `NEXT_PUBLIC_*`.

El modo real (`NEXT_PUBLIC_USE_MOCK_API=false`) no incorpora mocks si PostgreSQL no responde: muestra estado de indisponibilidad. El modo demo es explícito (`NEXT_PUBLIC_USE_MOCK_API=true`) y queda separado.

La relación de cotizaciones valida únicamente `cotizaciones.codigo_tarea = correctivos.codigo`; las coincidencias ausentes se presentan como “Sin coincidencia exacta”. Insumos conservan formulario, grupo e índice sin asociaciones inventadas.

Se agregaron `/combustible` y `/pendientes` como pantallas PostgreSQL read-only. Combustible calcula litros/cargas por período, origen, sitio y mes usando `litros_cargados`; no interpreta nombres de combustible ni inventa zonas. Pendientes muestra todos los campos disponibles y se vincula a una tarea del cronograma solamente por igualdad exacta de `codigo_sitio`, sin depender del formulario anterior. El badge del cronograma y el detalle “PENDIENTES DE VISITAS ANTERIORES” usan esa misma relación.

Para verificar desde la PC con Railway accesible:

```powershell
Invoke-RestMethod http://localhost:3000/api/db/summary
```

La respuesta devuelve los totales reales de `correctivos`, `preventivos`, `cotizaciones` e `insumos`. También están disponibles las vistas `/correctivos`, `/preventivos`, `/cotizaciones` e `/insumos`.

No se consultaron filas remotas desde el entorno Codex porque su conectividad TCP a Railway no está disponible; la consulta queda preparada para ejecutarse en la PC del usuario, donde la conexión ya fue validada.

## Páginas y funcionalidades implementadas

- Dashboard real de estado operativo del día con KPI clickeables, alertas priorizadas, plan por cuadrilla, pendientes por sitio, QO relacionadas y combustible mensual.
- Login demo con roles centralizados `TECHNICIAN`, `COORDINATOR` y `ADMIN`.
- Selector de roles para demostrar el cambio de experiencia.
- Cronograma diario con tareas, prioridades, urgencias, asignación/quita de planificación y cuadrillas.
- Vista Técnico filtrada a sus tareas, zona y cuadrilla; sin acciones de coordinación ni cotizaciones globales.
- Tareas separadas en correctivos/preventivos, búsqueda y estados Sytex.
- Insumos con búsqueda, proveedores, formularios, sitios y regla de relación determinística documentada.
- Cotizaciones con estados, zonas, proyectos y enlace de seguimiento.
- Guardias semanales con responsables, colaboradores y horario laboral.
- Vehículos demo preparados para futura fuente MaxTracker.
- Mapa operativo visual con sitios, urgencias, ruta sugerida no óptima y enlace a Google Maps.
- Centro de actividad/notificaciones en el shell y feedback toast para cambios internos.

## KPI y cálculos del dashboard real

- Tareas del día, completadas y pendientes: únicamente `fecha_plan` y estados oficiales de `correctivos`/`preventivos`; si no hay fecha planificada, la tarea no se presenta como tarea del día.
- Correctivos y preventivos abiertos: registros activos, excluyendo `APROBADO`, `APROBADO_CON_PENDIENTES` y `CANCELADO`; `RECHAZADO` permanece activo/pending porque puede corregirse y reenviarse.
- TA vencidas `> 21 días`: `abierto_el` (fallback `creado_el`) de correctivos activos, incluyendo `RECHAZADO`; si no existe fecha, no se cuenta.
- Criticidad urgente: `prioridad`/`criticidad` cuando están disponibles dentro de `atributos`; si no existe ese dato, no se inventa.
- Cuadrillas del dashboard: únicamente `asignado_a` y `usuario_colaborador`; `contratista_asignado` se muestra como empresa cuando corresponde, pero nunca como técnico.
- QO pendientes: `ABIERTA`/`OPEN`, `EN PROCESO`/`IN_PROGRESS`/`PROCESSING`, `EN ESPERA`/`WAITING` y `COMPLETADA CON PENDIENTES`/`COMPLETED_WITH_PENDING`; únicamente `COMPLETADA`/`COMPLETED` es final. La normalización está centralizada en `src/lib/quote-status.ts` y las alertas relacionadas usan únicamente `cotizaciones.codigo_tarea = correctivos.codigo`.
- Pendientes de visitas anteriores: `pendientes_visita.estado_pendiente = PENDIENTE`, relacionados únicamente por `codigo_sitio`.
- Combustible mensual: `cargas_combustible_ge.litros_cargados` y `fecha_evento`, con formato `es-AR`.

## Analítica de preventivos

- `/preventivos` consulta `preventivos` mediante `/api/preventivos/analytics`, siempre server-side y en modo solo lectura.
- La vista agrupa formularios por `codigos_sitios_afectados` y solo relaciona pendientes de visitas anteriores cuando existe ese código y coincide con `pendientes_visita.codigo_sitio`.
- Un sitio es `Completo` únicamente cuando todos los formularios del conjunto filtrado tienen estado canónico `APPROVED`; `APPROVED_WITH_PENDING` no completa el sitio.
- Estados considerados equivalentes a `APROBADO`: valores fuente que contienen `APROBADO` y valores fuente que contienen `COMPLETADO`. Si además contienen `PENDIENTE`, se clasifican separadamente como `APROBADO_CON_PENDIENTES` y no cuentan como aprobados completos.
- Estados canónicos adicionales: `PROCESO` → `EN_PROCESO`, `REVISION` → `EN_REVISION`, `RECHAZADO` → `RECHAZADO`, `CANCELADO` → `CANCELADO`; cualquier valor no reconocido queda como `ABIERTO` para no inventar un estado final.
- Los filtros de fecha usan exclusivamente `fecha_plan`; proyecto, sitio, estado y plantilla usan los valores reales presentes en la tabla.
- El detalle de sitio muestra solo responsables, fechas, plantilla, enlace Sytex y pendientes cuando esos campos existen.

Cuando PostgreSQL no está disponible, estos KPI muestran `—` y no se mezclan con datos demo. El modo demo continúa aislado y requiere activación explícita.

## Analítica de correctivos

- `/correctivos` consulta el read model server-side `/api/correctivos/analytics`; no usa mocks ni realiza escrituras.
- La fecha de origen de una TA se toma de `correctivos.abierto_el`; si está vacía, se usa `correctivos.creado_el`. Sin ninguna de esas fechas, la antigüedad queda como “Sin fecha” y no se cuenta como vencida.
- Las bandas de antigüedad son `0-7`, `8-14`, `15-21` y `>21 días`. “TA >21 días” se calcula únicamente sobre estados activos y exige una fecha de origen válida.
- Estados terminales excluidos de TA activas: `APROBADO`, `APROBADO_CON_PENDIENTES` y `CANCELADO`. `RECHAZADO` permanece activo porque puede corregirse y reenviarse; los valores fuente `COMPLETADO` se normalizan a `APROBADO` por la regla existente de estados.
- La clasificación operativa `AA`, `GE`, `ALTURA`, `COTA 0` y `OTROS` está centralizada en `src/lib/corrective-rules.ts` y se deriva de `nombre`, `descripcion`, `tarea` y `plantilla`, sin modificar el dato oficial. En la consulta real validada, los 770 correctivos quedaron en `OTROS` porque esos campos no contienen una coincidencia de las categorías disponibles.
- Los KPI y el desglose por tipo respetan el conjunto filtrado. Los KPI de urgencia, asignación y QO se calculan sobre TA activas; la criticidad solo se marca cuando existe en `atributos`.
- Las cotizaciones se relacionan exclusivamente por igualdad exacta `cotizaciones.codigo_tarea = correctivos.codigo`. El detalle muestra cantidad, estados, monto solo cuando los importes son numéricos y la moneda no es ambigua, además del enlace real si existe.
- El detalle también muestra sitio, proyecto, fecha de origen, responsables informados, enlace Sytex y pendientes de visitas anteriores únicamente cuando existe `codigo_sitio` y coincide exactamente.
- La validación real de la vista devolvió 770 correctivos, 1 TA activa, 0 TA con más de 21 días, 0 urgentes, 0 sin asignación, 1 con QO y 0 sin QO en el conjunto disponible al momento de la consulta.

## KPI de productividad de técnicos

- `/kpi/tecnicos` consulta correctivos y preventivos reales mediante `/api/kpi/tecnicos`; el endpoint es server-side, read-only y no guarda puntuaciones en PostgreSQL.
- El período usa exclusivamente `fecha_plan`, que está disponible en ambas tablas. La pantalla permite todo el período, día, mes y rango personalizado.
- La configuración única de puntos vive en `src/lib/technician-scoring.ts`: correctivos `15`; AA `5`; BO `7`; DT preventivo `6`; ECP `15`; Entorno y energía `3`; Entorno y energía reducido `1`; GE `5`; Movilidad al sitio `1`; Torre `8`; Torre reducido `5`; Sin clasificar `0`.
- `normalizePreventiveTemplate` normaliza mayúsculas, minúsculas, acentos y separadores, pero devuelve `SIN_CLASIFICAR` si no encuentra una firma única. No clasifica por coincidencias ambiguas.
- Las tareas/formularios con código y estado distinto de `CANCELLED` cuentan como trabajo asignado; solo `APPROVED` y `APPROVED_WITH_PENDING` otorgan puntos. `OPEN`, `IN_PROGRESS`, `IN_REVIEW`, `SENT`, `REJECTED` y `CANCELLED` otorgan 0 puntos. `REJECTED` permanece activo, cuenta como rechazo y usa `cantidad_rechazos` cuando está disponible, sin penalización. `APPROVED_WITH_PENDING` conserva sus puntos y cuenta como pendiente operativo.
- La analítica de técnicos usa únicamente `asignado_a` y `usuario_colaborador`; `usuarios_responsables_proveedor` se consulta solo en el diagnóstico y no se usa como respaldo automático. Se deduplican los integrantes por registro antes de agregar; una cuadrilla confiable suma una vez a cada integrante. `contratista_asignado` no se presenta como técnico.
- Si no existe técnico individual, el registro permanece visible y se informa como no asignado; no se atribuye a una persona inventada. En la consulta real validada quedaron 779 registros sin técnico individual directo confiable.
- El ranking separa tareas asignadas, aprobados, formularios rechazados, rechazos históricos, puntos, preventivos, correctivos y cumplimiento (`aprobados / tareas`). El promedio de puntos por día usa días distintos con `fecha_plan`. El detalle muestra tareas por categoría, cuántas fueron aprobadas y `aprobadas × tarifa = puntos obtenidos`; los registros no finales no generan puntos.
- El ranking de cuadrillas deriva la pareja por tarea desde `asignado_a` + `usuario_colaborador`, normaliza ambos integrantes sin importar el orden y acumula una sola producción por tarea. Cada integrante recibe la puntuación completa; nunca se divide entre dos.
- Las cuadrillas con menos o más de dos integrantes quedan como `CUADRILLA_DATOS_INCOMPLETOS`: no ingresan al ranking de cuadrillas, no se inventa un segundo técnico y el integrante directo informado continúa visible en el ranking individual mientras se revisa la calidad de fuente. Los cambios de compañero generan otra identidad histórica.
- La comparativa de cuadrillas muestra puntos, tareas, preventivos, correctivos, aprobados, aprobados con pendientes, rechazos, cumplimiento, promedio diario y tiempo medio cuando existen `abierto_el`/`creado_el` y `aprobado_el`. El detalle permite abrir las tareas realizadas juntos; el detalle individual muestra compañeros y cantidad de cuadrillas completas distintas.
- La fuente real actual no informa zona ni coordinador como campos confiables en estas tablas; ambos filtros quedan explícitamente no disponibles y no se derivan desde sitio, proyecto o correo.
- La vista no se presenta como control de seguridad: los roles del prototipo siguen siendo demo hasta implementar autenticación real y autorización server-side.

## Diagnóstico real de asignaciones y correctivos

- El endpoint read-only `/api/kpi/tecnicos/diagnostico` y el panel de `/kpi/tecnicos` analizan la fuente sin devolver nombres, emails ni valores sensibles. El diagnóstico observa `usuarios_responsables_proveedor`, pero nunca lo convierte en técnico o cuadrilla.
- Consulta real realizada: 2.089 registros en total; 1.204 con ambos campos directos, 103 solo con `asignado_a`, 0 solo con `usuario_colaborador`, 779 sin ninguno de los tres campos y 11 con `usuarios_responsables_proveedor`.
- Por fuente: correctivos 770, todos sin `asignado_a`, `usuario_colaborador` ni `usuarios_responsables_proveedor`; preventivos 1.319, con 1.204 parejas directas, 103 solo principal, 9 sin campos y 11 con responsables proveedor.
- Formato real: `asignado_a`, `usuario_colaborador` y `usuarios_responsables_proveedor` aparecen como emails individuales cuando están informados; no se observaron listas, JSON ni texto separado en esos campos.
- En correctivos, `nombre`, `descripcion`, `tarea` y `plantilla` están vacíos en los 770 registros; `proyecto` está informado como texto de varias palabras. `atributos` está poblado en los 770 casos, pero los 770 fallaron al parsearse como JSON y no presentaron señales determinísticas de AA, GE, altura o COTA 0. Por eso la clasificación continúa en `OTROS` y no se agregaron palabras arbitrarias.

## Arquitectura futura de mantenimiento

Se agregaron contratos, sin persistencia ni UI completa:

- `AirConditioner`: relación independiente sitio → múltiples aires.
- `AirConditionerMaintenance`: historial por equipo, tipo, fechas, formulario Sytex, tarea y `supplyIds`.
- `GeneratorEquipment`: equipo separado de aires, con horómetro, service, batería e intervalos.
- Estados calculables: `AL_DIA`, `PROXIMO`, `VENCE_ESTE_MES`, `VENCIDO`.

No se modeló “último filtro” como un único dato del sitio. No se inventan relaciones equipo/formulario por nombre, orden o aproximación.

## Seguridad y límites

- `DATABASE_URL` queda en servidor; no se envía al navegador ni se imprime en logs.
- Los estados oficiales de Sytex no se editan desde la app.
- Las cuatro tablas oficiales son read-only desde la app.
- `cargas_combustible_ge` y `pendientes_visita` también son read-only desde la app; no se implementó resolución ni escritura de pendientes.
- El shell conserva el selector de roles demo del prototipo. La política de filtrado server-side para técnicos requiere conectar una sesión autenticada real; sin esa identidad, las nuevas pantallas no deben considerarse un mecanismo de autenticación.
- La interfaz filtra la experiencia por rol; al pasar a datos reales, los mismos límites deben validarse server-side en endpoints/repositorios.
- BizFlow, MaxTracker, Web Push, autenticación empresarial y mantenimiento completo quedan fuera del prototipo.

## Comandos ejecutados y resultados

- `git rev-parse --show-toplevel`: OK
- `git status -sb`: OK, cambios locales únicamente
- `git branch --show-current`: `main`
- `git remote -v`: remoto FNETSystemTracker verificado
- `npm ci`: OK usando caché aislada del workspace; la caché temporal no forma parte de la entrega
- `npx tsc --noEmit`: OK
- `npm run lint`: OK
- `npm test`: OK — 9 archivos, 67 tests; incluye estados de productividad, rechazos históricos, estados de QO en español/inglés y reglas de cuadrillas
- `npm run build`: OK — rutas `/`, `/correctivos`, `/preventivos`, `/cotizaciones`, `/insumos`, `/combustible`, `/pendientes`, `/kpi/tecnicos` y sus endpoints read-only
- Verificación navegador local: dashboard, cronograma, selector de roles, vista restringida de Técnico y ranking/detalle real de `/kpi/tecnicos` comprobados.

## Estado Git al cierre

Se debe consultar con `git status -sb` y `git diff --name-status` antes de cualquier commit o push. No se ejecutó push automático.
