# ADR-0003: Regla de calendario quincenal

- Estado: Propuesta
- Fecha: 2026-11-11
- Requisitos relacionados: 6

## Contexto
Para la frecuencia quincenal no está confirmado si debe ser "cada 15 días" o "días 15 y fin de mes".

## Decisión (propuesta)
Por defecto, quincenal = cada 15 días (vencimiento anterior + 15). La regla de calendario es explícita y configurable por préstamo. Otras frecuencias: diaria +1, semanal +7, mensual mismo día o último día válido, anual misma fecha o último día válido.

## Alternativas consideradas
- Días 15 y fin de mes — alinea con ciclos de nómina, pero complica el cálculo de días y la generación del calendario.

## Consecuencias
- El generador de calendario debe parametrizar la regla por préstamo.
- Pruebas de fechas consistentes para semanal, quincenal y mensual (criterio de aceptación).

## Pendiente / condiciones
Confirmar con el propietario si se prefiere 15/fin de mes antes de implementar la generación del calendario.
