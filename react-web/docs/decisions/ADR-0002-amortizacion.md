# ADR-0002: Método de amortización por producto

- Estado: Propuesta
- Fecha: 2026-11-11
- Requisitos relacionados: 3, 6

## Contexto
No está confirmado el método de amortización por defecto. El spec admite cuota fija (francés) y capital fijo (alemán), seleccionables por producto.

## Decisión (propuesta)
Soportar francés y alemán, configurables por producto. El préstamo guarda el snapshot del método aprobado. El cálculo (fórmulas y redondeo) lo hace exclusivamente el backend y se valida contra ejemplos aprobados; el frontend solo presenta.

## Alternativas consideradas
- Solo francés — más común, pero limita productos de capital fijo.
- Solo alemán — interés decreciente, menos habitual para el cliente final.

## Consecuencias
- El dominio necesita una estrategia de amortización por método.
- Pruebas unitarias de fórmulas, redondeo y casos límite obligatorias (gate Fase 5).
- No inventar fórmulas: deben estar documentadas y aprobadas (ver `docs/decisions` y reglas financieras).

## Pendiente / condiciones
Confirmar el método por defecto y las reglas de redondeo exactas con el propietario.
