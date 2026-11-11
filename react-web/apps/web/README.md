# Web — Plataforma de préstamos y recaudo

Frontend React + TypeScript (Vite) con Tailwind CSS. Implementa el sistema de diseño fintech y las pantallas por rol (prestamista, cobrador, cliente) definidas en el spec `.kiro/specs/plataforma-prestamos-aws/`.

## Requisitos
- Node.js LTS (probado con Node 24)
- npm

## Scripts

```bash
npm install      # instalar dependencias
npm run dev      # servidor de desarrollo en http://localhost:5173
npm run build    # typecheck + build de producción en dist/
npm run preview  # previsualizar el build
npm run typecheck
```

> En PowerShell con políticas restringidas, ejecuta npm vía `cmd /c "npm ..."`.

## Estructura

```text
src/
  app/            # router y navegación por rol
  auth/           # sesión simulada (rol/portal); la autorización real la aplica el backend
  components/
    layout/       # AppShell (sidebar + topbar responsive)
    ui/           # Card, KpiCard, Table, StatusBadge, PageHeader
  data/           # datos de ejemplo (en producción vienen del API NestJS)
  lib/            # formato COP/fecha (America/Bogota), utilidades
  pages/
    admin/        # Dashboard, Clientes, Solicitudes, Préstamos
    collector/    # Mi cartera, Cobranza
    customer/     # Inicio, Pagar
  types/          # tipos de dominio (se generarán desde OpenAPI)
```

## Notas de diseño
- Paleta fintech: azul profundo (primario), verde (éxito), ámbar (alertas), rojo (mora).
- Estados con icono + texto, no solo color (WCAG 2.1 AA).
- Dinero formateado como entero COP; el frontend no realiza cálculos financieros.
- El selector "Vista" en la barra lateral permite alternar entre los tres portales para la demo.
