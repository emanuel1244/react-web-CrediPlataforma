# ADR-0001: Arquitectura multi-tenant por defecto

- Estado: Aceptada
- Fecha: 2026-11-11
- Requisitos relacionados: 13, 15

## Contexto
El primer despliegue puede operar con un único prestamista, pero el spec pide soportar varios prestamistas independientes sin mezclar datos ni movimientos.

## Decisión
Diseñar multi-tenant desde el MVP. Toda entidad de negocio lleva `tenant_id`. El backend valida `tenant_id`, ownership y asignación de cartera en cada operación sensible; no se confía en el frontend para autorizar.

## Alternativas consideradas
- Single-tenant ahora y migrar luego — más simple al inicio, pero la migración a multi-tenant es costosa y riesgosa sobre datos financieros existentes.
- Multi-tenant con base de datos por tenant — mayor aislamiento, pero sobrecosto operativo no justificado para el MVP.

## Consecuencias
- Esquema con `tenant_id` e índices por tenant; filtros obligatorios en repositorios.
- Pruebas de aislamiento (acceso cruzado entre tenants) como criterio de aceptación.
- Modelo de tenant compartido (shared schema) con aislamiento lógico.

## Pendiente / condiciones
Ninguna. Confirmada por el propietario.
