# FNET System Tracker

Prototipo de PWA interna para planificación, coordinación y seguimiento de operaciones de campo FNET.

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL Railway existente para la futura lectura de tablas sincronizadas

## Variables de entorno

Copiar `.env.example` a `.env.local`:

```env
NEXT_PUBLIC_USE_MOCK_API=true
DATABASE_URL=
AUTH_SECRET=
```

`DATABASE_URL` se mantiene del lado servidor. Con `NEXT_PUBLIC_USE_MOCK_API=false`, las vistas operativas consultan PostgreSQL Railway; con `true`, usan exclusivamente el modo demo explícito. Nunca se mezclan fuentes y la app no crea ni modifica las tablas oficiales `correctivos`, `preventivos`, `cotizaciones` e `insumos`.

## Instalación y desarrollo

```bash
npm ci
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

El acceso inicial abre la vista de Coordinador Demo. Desde el selector de perfil se pueden recorrer las vistas de Coordinador, Técnico y Administrador; cerrar sesión muestra nuevamente el acceso demo.

## Prisma y base de datos

`prisma/schema.prisma` contiene el esquema real introspectado de PostgreSQL: `correctivos`, `preventivos`, `cotizaciones` e `insumos`. `prisma.config.ts` carga `.env.local` solo para las operaciones CLI; el runtime usa el adapter PostgreSQL server-side.

La introspección inicial, únicamente cuando la conexión desde la PC esté disponible, se realiza con:

```bash
npx prisma db pull
npx prisma generate
```

No ejecutar migraciones destructivas sobre las tablas sincronizadas por n8n. Los contratos actuales mantienen las relaciones de tareas e insumos por identificadores confiables, no por coincidencia aproximada de nombres.

La app expone consultas read-only:

- `/correctivos`, `/preventivos`, `/cotizaciones`, `/insumos`: vistas reales sin mocks cuando el modo PostgreSQL está activo.
- `/combustible`: cargas reales de `cargas_combustible_ge`, filtros por fecha/sitio/origen/combustible/formulario y detalle de campos disponibles.
- `/pendientes`: pendientes reales de `pendientes_visita`, filtros por sitio/origen/formulario/estado y detalle completo.
- `/api/db/summary`: devuelve los cuatro totales consultados desde PostgreSQL.
- `/api/synced-data`: devuelve el read model consolidado para el dashboard.

Las cargas de combustible se agrupan únicamente en métricas sobre filas reales; no se interpreta el texto del combustible como litros. Las zonas no se inventan porque `cargas_combustible_ge` no tiene un campo de zona explícito. Los pendientes se relacionan al cronograma por igualdad exacta de código de sitio, incluso si la tarea actual es correctiva o preventiva.

En cotizaciones, `codigo_tarea` solo se considera relacionado cuando coincide con `correctivos.codigo`. En insumos se conserva `formulario + grupo + indice` como identidad lógica.

## PWA

La app incluye `public/manifest.webmanifest`, registro de service worker y viewport móvil. La navegación responsive funciona como sidebar en escritorio y menú lateral en celular.

## Validación

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

## Deploy

Configurar `DATABASE_URL` y `AUTH_SECRET` como secretos del entorno de deploy. Mantener las credenciales fuera del navegador y conservar el proceso n8n → PostgreSQL como capa de sincronización oficial con Sytex.

## Alcance futuro reservado

Los contratos `src/contracts/air-conditioner.ts` y `src/contracts/generator.ts` dejan preparado el modelado separado `site → equipos → mantenimientos`, sin crear tablas ni UI completa todavía. Los aires acondicionados y grupos electrógenos son equipamientos distintos; sus mantenimientos deberán relacionarse a formularios Sytex e insumos únicamente mediante claves determinísticas.
