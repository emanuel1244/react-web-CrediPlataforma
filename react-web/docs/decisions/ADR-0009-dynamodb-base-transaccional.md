# ADR-0009: DynamoDB como base de datos principal (reemplaza PostgreSQL del spec)

- Estado: Aceptada
- Fecha: 2026-11-11
- Requisitos relacionados: 14 (ledger/integridad), 13 (multi-tenant), 15 (infra)
- Reemplaza: la decisión del spec (secciones 6 e "Instrucción actualizada") que fijaba PostgreSQL en RDS/Aurora como fuente transaccional principal.

## Contexto
El propietario prioriza **costo mínimo** para la etapa actual. Con bajo tráfico (MVP),
DynamoDB on-demand tiene costo cercano a cero y sin servidor encendido 24/7, mientras
que RDS/Aurora implica un costo fijo mensual (~15-25 USD/mes la instancia más pequeña).

El spec original eligió PostgreSQL por las necesidades de transacciones ACID multi-registro,
ledger de doble partida, conciliación y reportes relacionales. Este ADR cambia esa decisión
asumiendo conscientemente el trabajo y los riesgos adicionales.

## Decisión
Usar **Amazon DynamoDB** (modo on-demand / pago por uso) como base de datos principal del
MVP, con diseño single-table y claves compuestas por `tenant_id`.

## Consecuencias y riesgos aceptados
- **Transaccionalidad:** las operaciones financieras (desembolso, aplicar pago) usarán
  `TransactWriteItems` (límite de 100 ítems por transacción y restricciones de DynamoDB).
  El dominio debe diseñarse para no exceder esos límites.
- **Ledger inmutable:** se modela como ítems append-only con condición de escritura
  (`attribute_not_exists`) para evitar sobrescrituras; el saldo se recalcula desde los ítems.
- **Idempotencia:** se implementa con una tabla/ítems de `idempotency_keys` y escrituras
  condicionales (encaja bien con DynamoDB).
- **Reportes/agregaciones:** no hay JOINs. Se resuelve con GSIs por patrón de acceso y/o
  materializando contadores; reportes complejos pueden requerir exportación posterior
  (p. ej. a S3/Athena) en una fase futura. NO está dentro del MVP.
- **Modelado por adelantado:** cada consulta requiere su índice (PK/SK o GSI) definido antes.
- **Migración futura a SQL:** la capa de persistencia queda detrás de puertos
  (arquitectura hexagonal), de modo que cambiar de DynamoDB a PostgreSQL sea posible
  sin tocar el dominio.

## Diseño single-table (propuesta inicial)
Una tabla principal `plataforma` con:
- `PK` (partition key) y `SK` (sort key) genéricos.
- GSIs para patrones de acceso (p. ej. por cliente, por estado, por fecha de vencimiento).

Ejemplos de claves:
- Tenant:            `PK=TENANT#<id>`                     `SK=META`
- Cliente:           `PK=TENANT#<id>`                     `SK=CUSTOMER#<customerId>`
- Préstamo:          `PK=TENANT#<id>`                     `SK=LOAN#<loanId>`
- Cuota:             `PK=LOAN#<loanId>`                   `SK=INSTALLMENT#<nnn>`
- Ledger (append):   `PK=LOAN#<loanId>`                   `SK=LEDGER#<ts>#<uuid>`
- Pago:              `PK=LOAN#<loanId>`                   `SK=PAYMENT#<paymentId>`
- Asignación:        `PK=LOAN#<loanId>`                   `SK=ASSIGNMENT#<ts>`
- Idempotencia:      `PK=IDEMPOTENCY#<key>`               `SK=IDEMPOTENCY#<key>`

GSIs sugeridos:
- GSI1 por cliente:  `GSI1PK=CUSTOMER#<id>`               `GSI1SK=<entidad>#<fecha>`
- GSI2 por estado/vencimiento para cartera y cobranza.

## Condiciones
- Mantener la interfaz de repositorios (puertos) agnóstica para permitir volver a SQL.
- Documentar límites de DynamoDB en las operaciones financieras.
- El despliegue a AWS sigue requiriendo aprobación explícita del propietario y se hará con CDK.
