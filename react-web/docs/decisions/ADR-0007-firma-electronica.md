# ADR-0007: Firma electrónica y pagaré

- Estado: Propuesta
- Fecha: 2026-11-11
- Requisitos relacionados: 5, 12

## Contexto
No está confirmado el proveedor de firma electrónica ni si entra en el MVP. El contrato y el pagaré requieren revisión legal.

## Decisión (propuesta)
Generar contrato y pagaré desde plantillas versionadas. Integrar firma electrónica mediante un proveedor detrás de una interfaz; guardar evidencia, versión, timestamps y hash del documento. El mandato de débito recurrente se registra separado del pagaré. Si no hay proveedor en el MVP, la formalización se registra manualmente y la firma queda como fase posterior.

## Alternativas consideradas
- Firma manuscrita escaneada — válida como evidencia inicial, menor trazabilidad.
- Proveedor de firma certificada — mayor validez; depende de contratación.

## Consecuencias
- `DocumentStore` (S3) con versionado, cifrado y URLs prefirmadas.
- Interfaz de firma desacoplada para no bloquear el resto del flujo.

## Pendiente / condiciones
Selección del proveedor de firma y confirmación de alcance en MVP; revisión legal de plantillas.
