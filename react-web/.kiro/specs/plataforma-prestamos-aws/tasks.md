# Implementation Plan — Plataforma de préstamos y recaudo (AWS)

> Plan incremental por vertical slices. Cada tarea es pequeña, ordenada y testeable, y referencia los requisitos de `requirements.md`. No se despliega a AWS sin aprobación explícita; producción requiere aprobación manual. Cuando una decisión abierta bloquee una tarea, se usa interfaz/mock y se registra ADR.

## Fase 0 — Discovery y decisiones (gate previo a código)

- [ ] 0.1 Registrar decisiones abiertas como ADRs en `docs/decisions/`
  - Crear un ADR por cada decisión abierta (amortización, quincenal, firma electrónica, pagos parciales, refinanciación, reintentos, volumen/presupuesto/región/RPO-RTO, SMS/FCM/SES, Wompi/PSE, mora).
  - Confirmar diseño multi-tenant por defecto y glosario financiero.
  - _Requisitos: Decisiones abiertas, 13, 15_

- [ ] 0.2 Documentar reglas financieras aprobadas y ejemplos de cálculo
  - Tablas de amortización de referencia (francés/alemán), redondeo y calendario por frecuencia para pruebas.
  - _Requisitos: 6_

## Fase 1 — Spec y diseño (gate: revisión del propietario)

- [ ] 1.1 Generar OpenAPI `/v1` con schemas de cliente, backoffice, cobrador y webhooks
  - Publicar en `packages/contracts`; servir como fuente del cliente TypeScript.
  - _Requisitos: 15_

- [ ] 1.2 Crear diagramas C4 (contexto, contenedores, componentes) y flujo de pago en `docs/diagrams/`
  - _Requisitos: 7, 15_

- [ ] 1.3 Crear wireframes de administrador, cliente y cobrador en `docs/ux/`
  - _Requisitos: 10, 8 (UX)_

## Fase 2 — Fundación (gate: infra dev reproducible + smoke tests)

- [ ] 2.1 Inicializar monorepo con workspaces (`apps/web`, `apps/api`, `services/workers`, `packages/*`, `infra/cdk`)
  - Configurar TypeScript strict, lint/format, commits convencionales y scripts base.
  - _Requisitos: 15_

- [ ] 2.2 Configurar pipeline CI (lint, typecheck, tests, build React, build NestJS, `cdk synth`)
  - _Requisitos: 15_

- [ ] 2.3 Definir esqueleto hexagonal en `packages/domain` y `packages/application` (entidades base y puertos)
  - Puertos: `PaymentProvider`, `DocumentStore`, `NotificationPort`, `EventBus/QueuePort`, repositorios, `IdentityPort`.
  - _Requisitos: 14, 15_

- [ ] 2.4 Escribir stacks CDK base (VPC, RDS, Cognito, S3/CloudFront+OAC, API Gateway, Lambda, SQS/DLQ, SNS, EventBridge, Secrets, KMS, WAF, CloudWatch) con ambientes `dev/stage/prod`
  - No desplegar a cuentas reales sin aprobación; validar con `cdk synth`.
  - _Requisitos: 15_

- [ ] 2.5 Configurar Prisma y migración inicial del esquema (entidades con `tenant_id`, índices, restricciones únicas, UUID públicos)
  - _Requisitos: 13, 14_

- [ ] 2.6 Bootstrap NestJS + adaptador Lambda reutilizable y endpoint `GET /v1/health`
  - _Requisitos: 15_

## Fase 3 — Identidad y clientes (gate: seguridad y pruebas de permisos)

- [ ] 3.1 Integrar Cognito y JWT authorizer en API Gateway; resolver `tenant_id` y rol
  - _Requisitos: 1_

- [ ] 3.2 Implementar guards NestJS de rol, tenant, ownership y asignación de cartera
  - _Requisitos: 1, 8, 13_

- [ ] 3.3 Implementar registro, login, perfil de cliente y consentimientos versionados
  - Estados de cliente `PENDING/ACTIVE/REJECTED/BLOCKED` y revisión KYC manual con auditoría.
  - _Requisitos: 2_

- [ ] 3.4 Implementar CRUD y búsqueda de clientes en backoffice
  - _Requisitos: 2, 10_

- [ ] 3.5 Escribir pruebas de autorización y de acceso cruzado entre tenants
  - _Requisitos: 1, 13_

## Fase 4 — Productos, solicitudes y aprobación (gate: criterios financieros y UX)

- [ ] 4.1 Implementar productos y versiones (`loan_products`, `loan_product_versions`) con snapshot de condiciones
  - _Requisitos: 3_

- [ ] 4.2 Implementar simulador (capital, tasa definida por solicitud, cuotas, total, intereses, cargos, calendario)
  - _Requisitos: 3, 6_

- [ ] 4.3 Implementar solicitudes y máquina de estados `DRAFT→...→APPROVED/REJECTED/CANCELLED`
  - _Requisitos: 4_

- [ ] 4.4 Implementar evaluación, aprobación/rechazo con decisión registrada y auditoría; sin desembolso automático
  - _Requisitos: 4, 12_

- [ ] 4.5 Emitir evento `LoanApproved` y encolar notificación (72 horas hábiles, transferencia/efectivo)
  - _Requisitos: 4_

- [ ] 4.6 Implementar UI bandeja de solicitudes y pantalla de evaluación con confirmación explícita
  - _Requisitos: 4 (UX)_

## Fase 5 — Préstamos y ledger (gate: conciliación de saldo y amortización)

- [ ] 5.1 Implementar formalización (contrato/pagaré desde plantillas versionadas; evidencia/hash si hay firma)
  - _Requisitos: 5, 12_

- [ ] 5.2 Implementar desembolso (transferencia/efectivo) con medio, responsable, fecha, referencia y evidencia
  - _Requisitos: 5_

- [ ] 5.3 Implementar generación atómica de calendario de amortización + movimientos de ledger
  - Métodos francés/alemán, calendario por frecuencia, dinero en enteros COP.
  - _Requisitos: 5, 6, 14_

- [ ] 5.4 Implementar ledger de doble partida inmutable e invariantes de saldo
  - _Requisitos: 14_

- [ ] 5.5 Implementar abonos, pagos parciales y liquidación según reglas aprobadas (ADR)
  - _Requisitos: 6_

- [ ] 5.6 Emitir evento `LoanDisbursed` y notificar medio/fecha/comprobante
  - _Requisitos: 5_

- [ ] 5.7 Escribir pruebas de fórmulas, redondeos y casos límite contra ejemplos aprobados
  - _Requisitos: 6, 14_

## Fase 6 — Pagos PSE y recaudo manual (gate: sandbox certificado + conciliación)

- [ ] 6.1 Implementar adaptador Wompi (sandbox) tras la interfaz `PaymentProvider`
  - _Requisitos: 7_

- [ ] 6.2 Implementar intenciones de pago, checkout e idempotency key
  - _Requisitos: 7, 14_

- [ ] 6.3 Implementar endpoint de webhook con verificación de firma y deduplicación
  - _Requisitos: 7_

- [ ] 6.4 Implementar worker SQS/DLQ que aplica recaudo al ledger de forma atómica e idempotente
  - _Requisitos: 7, 14_

- [ ] 6.5 Implementar recaudo manual (efectivo/transferencia) con estado `PENDING_REVIEW`, recibo, caja y soporte
  - _Requisitos: 7_

- [ ] 6.6 Implementar conciliación diaria proveedor/pagos/ledger con resolución auditada
  - _Requisitos: 7, 14_

- [ ] 6.7 Implementar UI de pago y comprobante (sin marcar éxito por redirección)
  - _Requisitos: 7 (UX)_

- [ ] 6.8 Escribir pruebas de webhook duplicado, retrasado, inválido y fuera de orden
  - _Requisitos: 7_

## Fase 7 — Cobranza, dashboard y reportes (gate: métricas conciliadas contra ledger)

- [ ] 7.1 Implementar `loan_assignments` y endpoints de asignación/reasignación por `LENDER_ADMIN`
  - _Requisitos: 8_

- [ ] 7.2 Implementar `collection_activities`, compromisos y bitácora (sin borrado, solo correcciones auditadas)
  - _Requisitos: 8, 9_

- [ ] 7.3 Implementar vistas y endpoints del `COLLECTION_AGENT` filtrados en backend por tenant y cobrador
  - _Requisitos: 8_

- [ ] 7.4 Implementar job diario de vencimientos con EventBridge (mora desde el día siguiente, sin cargos automáticos)
  - _Requisitos: 9_

- [ ] 7.5 Implementar notificaciones SNS/SES y FCM worker (EventBridge/SNS → SQS → Lambda → FCM)
  - _Requisitos: 9, 4, 5_

- [ ] 7.6 Implementar dashboard del prestamista con separación capital/interés/recaudo/liquidez y KPIs
  - _Requisitos: 10_

- [ ] 7.7 Implementar score interno explicable, etiquetas no discriminatorias y corrección auditada
  - _Requisitos: 11_

- [ ] 7.8 Implementar exportación CSV/XLSX/PDF y plantillas de documentos (estado de cuenta, paz y salvo)
  - _Requisitos: 12_

- [ ] 7.9 Escribir pruebas de aislamiento de cartera por cobrador y de conciliación de métricas
  - _Requisitos: 8, 10_

## Fase 8 — Seguridad, calidad y producción (gate: checklist go-live)

- [ ] 8.1 Ejecutar threat modeling y revisión de permisos IAM (roles mínimos por Lambda)
  - _Requisitos: 15_

- [ ] 8.2 Integrar SAST, dependency scan, secret scan e IaC scan en CI
  - _Requisitos: 15_

- [ ] 8.3 Completar suites unitaria, integración, E2E y carga
  - _Requisitos: 6, 7, 14_

- [ ] 8.4 Configurar WAF, alarmas, dashboards, runbooks y prueba de restauración de backups
  - _Requisitos: 12, 14, 15, NFR_

- [ ] 8.5 Preparar checklist de go-live (revisión legal/privacidad/pasarela) y despliegue gradual con rollback
  - Producción solo con aprobación manual explícita.
  - _Requisitos: 15_

---

## Definition of Done (por tarea)
- Código y pruebas pasan.
- Validación de entrada y autorización implementadas.
- Logs sin datos sensibles.
- Métricas/errores observables.
- Documentación y OpenAPI actualizados.
- Revisión de código y seguridad completadas.
- Sin despliegue productivo implícito.
