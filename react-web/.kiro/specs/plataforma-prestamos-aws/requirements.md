# Requirements — Plataforma de préstamos y recaudo (AWS)

## Introducción

Plataforma web responsive multi-tenant para administrar el ciclo de vida de préstamos: registro y validación de clientes, solicitud, evaluación, aprobación, formalización, desembolso, programación de cuotas, recaudo, gestión de mora, cierre y reportes.

La plataforma expone dos portales (backoffice del prestamista y portal del cliente) y un portal/vistas para el rol de cobrador. Opera en Colombia, moneda COP. Stack definitivo: React + TypeScript (Vite) en el frontend, NestJS + TypeScript en el backend, PostgreSQL/RDS con Prisma, AWS CDK para infraestructura, NestJS desplegado en AWS Lambda detrás de API Gateway.

### Alcance de este documento
Este es un artefacto de spec. No implementa código. Define requisitos funcionales y no funcionales con criterios de aceptación verificables en formato EARS. Las decisiones legales, financieras y de pasarela de pago pendientes se marcan explícitamente y bloquean producción hasta su resolución.

### Convenciones
- Dinero en COP representado como enteros (unidad mínima definida); nunca floating point para cálculos financieros.
- Fechas/timestamps almacenados en UTC; presentación en `America/Bogota`.
- Toda entidad de negocio tiene `tenant_id`. No se mezclan datos entre tenants.
- Autorización verificada siempre en backend (NestJS guards), nunca solo ocultando opciones en el frontend.

---

## Decisiones abiertas (bloquean implementación o producción)

Estas preguntas deben resolverse como ADR antes de implementar las áreas afectadas. No se asumen silenciosamente.

1. **Método de amortización por defecto**: francés (cuota fija), alemán (capital fijo) u otro. Configurable por producto.
2. **Quincenal**: cada 15 días vs. fechas 15 y fin de mes.
3. **Firma electrónica y pagaré**: proveedor y si entra en MVP.
4. **Pagos parciales/abonos anticipados**: habilitación y orden de aplicación (capital/interés) y recálculo (reducir plazo vs. reducir cuota).
5. **Refinanciación**: reglas, aprobación y recálculo.
6. **Reintentos de cobro automático**: solo si el proveedor soporta mandato; requiere autorización del cliente.
7. **Volumen inicial, crecimiento, presupuesto AWS, región, RPO/RTO.**
8. **Proveedor SMS y términos de uso de FCM/SES.**
9. **Wompi/PSE**: onboarding, contrato, tarifas, sandbox y capacidades (no asumir débitos recurrentes).
10. **Cargos/intereses de mora**: fórmula y validación legal antes de aplicarlos automáticamente.

---

## Requisitos

### Requisito 1 — Identidad, autenticación y roles

**Historia de usuario:** Como operador de la plataforma, quiero que cada usuario se autentique y actúe solo dentro de su rol y tenant, para proteger los datos y las operaciones financieras.

#### Criterios de aceptación
1. CUANDO un usuario inicia sesión ENTONCES el sistema DEBERÁ autenticarlo mediante Amazon Cognito (JWT) y resolver su `tenant_id` y rol.
2. EL sistema DEBERÁ soportar los roles `PLATFORM_ADMIN`, `LENDER_ADMIN`, `LENDER_OPERATOR`, `COLLECTION_AGENT` y `CUSTOMER`.
3. CUANDO un usuario solicita una operación ENTONCES el backend DEBERÁ validar rol, `tenant_id`, ownership y asignación de cartera antes de ejecutarla.
4. SI un usuario intenta acceder a datos de otro tenant ENTONCES el sistema DEBERÁ denegar la operación y registrar el intento en auditoría.
5. DONDE el acceso sea al backoffice EL sistema DEBERÁ permitir configurar MFA.
6. EL sistema DEBERÁ permitir recuperación de cuenta y verificación de email/teléfono.
7. EL sistema NO DEBERÁ confiar en el frontend para autorizar; toda comprobación de negocio se hace en NestJS.

### Requisito 2 — Perfil de cliente y consentimientos

**Historia de usuario:** Como cliente, quiero registrarme y completar mi perfil con consentimientos claros, para poder solicitar préstamos.

#### Criterios de aceptación
1. CUANDO un cliente se registra ENTONCES el sistema DEBERÁ crear un perfil con estado `PENDING`.
2. EL sistema DEBERÁ capturar nombres, identificación, contacto, dirección, ocupación/ingresos y referencias según política.
3. EL sistema DEBERÁ registrar consentimientos versionados (tratamiento de datos, consulta/reporte crediticio si aplica, comunicaciones y mandato de pago).
4. EL sistema DEBERÁ soportar los estados de cliente `PENDING`, `ACTIVE`, `REJECTED`, `BLOCKED`.
5. CUANDO un operador revisa KYC manualmente ENTONCES el sistema DEBERÁ permitir cambiar el estado y registrar auditoría del cambio.
6. EL sistema NO DEBERÁ consultar centrales de riesgo sin autorización y contrato aplicable.

### Requisito 3 — Productos y simulador

**Historia de usuario:** Como prestamista, quiero configurar productos de préstamo y ofrecer un simulador, para que el cliente conozca el costo antes de solicitar.

#### Criterios de aceptación
1. EL sistema DEBERÁ permitir configurar monto mínimo/máximo, plazo, frecuencia (`DAILY`, `WEEKLY`, `BIWEEKLY`, `MONTHLY`, `ANNUAL`), método de amortización, requisitos y reglas de elegibilidad por producto.
2. EL sistema NO DEBERÁ fijar la tasa de interés globalmente; la tasa se define por el prestamista al evaluar/aprobar cada solicitud.
3. CUANDO se define una tasa ENTONCES el sistema DEBERÁ registrar tasa, unidad/periodicidad, método, fecha y usuario que la definió.
4. CUANDO un cliente usa el simulador ENTONCES el sistema DEBERÁ mostrar capital, tasa, número de cuotas, cuota estimada, total, intereses, cargos y calendario.
5. CUANDO cambia un producto ENTONCES el sistema DEBERÁ conservar en el préstamo el snapshot de la versión aprobada (versionado de condiciones).
6. EL sistema DEBERÁ validar tasa y cargos contra límites legales vigentes antes de aceptar.

### Requisito 4 — Solicitud, evaluación y aprobación

**Historia de usuario:** Como prestamista, quiero evaluar y aprobar solicitudes con decisión registrada, para controlar el riesgo y dejar trazabilidad.

#### Criterios de aceptación
1. CUANDO un cliente crea una solicitud ENTONCES el sistema DEBERÁ registrar monto, plazo, frecuencia y propósito opcional con estado inicial `DRAFT`.
2. EL sistema DEBERÁ soportar los estados `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `CANCELLED`.
3. CUANDO un operador decide una solicitud ENTONCES el sistema DEBERÁ registrar decisión, usuario, fecha, motivo y condiciones.
4. CUANDO una solicitud es aprobada ENTONCES el sistema NO DEBERÁ desembolsar automáticamente; requiere una acción autorizada y confirmación explícita.
5. CUANDO una solicitud pasa a `APPROVED` ENTONCES el sistema DEBERÁ emitir el evento `LoanApproved` y encolar la notificación de forma asíncrona.
6. CUANDO se notifica la aprobación ENTONCES el mensaje DEBERÁ indicar que el desembolso se realizará en un plazo máximo de 72 horas hábiles y que puede ser por transferencia o efectivo.

### Requisito 5 — Formalización y desembolso

**Historia de usuario:** Como prestamista, quiero formalizar y desembolsar el préstamo de forma auditada y atómica, para garantizar consistencia contable.

#### Criterios de aceptación
1. EL sistema DEBERÁ generar contrato y pagaré desde plantillas versionadas.
2. DONDE exista firma electrónica EL sistema DEBERÁ guardar evidencia, versión, timestamps y hash del documento.
3. EL sistema DEBERÁ registrar el mandato de débito recurrente separado del pagaré.
4. EL sistema DEBERÁ permitir registrar el desembolso por transferencia o efectivo, seleccionado por el administrador, con medio, responsable, fecha, referencia/recibo y evidencia.
5. EL sistema DEBERÁ soportar los estados de préstamo `PENDING_DISBURSEMENT`, `ACTIVE`, `PAID_OFF`, `CANCELLED`, `DEFAULTED`.
6. CUANDO se ejecuta el desembolso ENTONCES el sistema DEBERÁ crear el calendario de amortización y los movimientos contables en una única transacción atómica.
7. CUANDO el desembolso se confirma ENTONCES el sistema DEBERÁ emitir `LoanDisbursed` y notificar medio, fecha y comprobante.
8. EL sistema NO DEBERÁ comunicar "dinero enviado" hasta que el desembolso esté confirmado y registrado.

### Requisito 6 — Cuotas y amortización

**Historia de usuario:** Como cliente y como prestamista, quiero un calendario de cuotas claro y correcto, para conocer y gestionar las obligaciones.

#### Criterios de aceptación
1. EL sistema DEBERÁ soportar frecuencias diaria, semanal, quincenal, mensual y anual.
2. EL sistema DEBERÁ definir regla explícita de calendario por préstamo: diaria +1 día; semanal +7 días; quincenal +15 días (configurable); mensual mismo día o último día válido; anual misma fecha o último día válido.
3. EL sistema DEBERÁ soportar métodos de amortización cuota fija (francés) y capital fijo (alemán), seleccionables por producto.
4. CADA cuota DEBERÁ registrar número, fecha de vencimiento, capital, interés, cargos autorizados, total, saldo, estado y días de mora.
5. EL sistema DEBERÁ soportar los estados de cuota `PENDING`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `WAIVED` (este último solo con permiso y auditoría).
6. EL sistema DEBERÁ recalcular el saldo desde los movimientos/ledger y NO DEBERÁ modificar pagos históricos.
7. EL sistema NO DEBERÁ inventar fórmulas financieras ni redondeos no definidos; las fórmulas deben validarse contra ejemplos aprobados.

### Requisito 7 — Pagos online (PSE/tarjeta) y recaudo manual

**Historia de usuario:** Como cliente, quiero pagar mis cuotas en línea o en efectivo/transferencia, y como prestamista quiero que el recaudo sea confiable e idempotente.

#### Criterios de aceptación
1. EL sistema DEBERÁ exponer una interfaz `PaymentProvider` desacoplada; la propuesta inicial es Wompi (PSE y tarjetas) sujeta a validación.
2. CUANDO se crea una intención de pago ENTONCES el sistema DEBERÁ registrar `providerReference`, importe, estado, canal y timestamps, con estados `CREATED`, `PENDING`, `APPROVED`, `DECLINED`, `EXPIRED`, `REFUNDED`, `REVERSED`.
3. EL sistema NO DEBERÁ marcar un pago como exitoso por redirección del navegador; DEBERÁ confirmarlo por webhook firmado y/o consulta server-to-server.
4. CUANDO llega un webhook ENTONCES el sistema DEBERÁ verificar firma/autenticidad, deduplicar por evento/`providerReference`, responder rápido y procesar asíncronamente vía SQS.
5. EL sistema DEBERÁ exigir idempotency key al crear pago y al aplicar recaudo.
6. CUANDO la misma notificación de pago se procesa varias veces ENTONCES el sistema DEBERÁ producir un único movimiento financiero.
7. CUANDO un operador o cobrador registra un pago manual (efectivo o transferencia) ENTONCES el sistema DEBERÁ dejarlo en `PENDING_REVIEW` hasta validación cuando corresponda, y solo después impactar el ledger.
8. CUANDO se registra efectivo ENTONCES el sistema DEBERÁ generar recibo y registrar caja/usuario; CUANDO es transferencia DEBERÁ registrar referencia y soporte.
9. EL sistema DEBERÁ ejecutar conciliación diaria de pagos contra proveedor y ledger, detectar diferencias y permitir resolución auditada.
10. EL sistema NO DEBERÁ almacenar PAN/CVV; DEBERÁ usar tokenización del proveedor certificado.

### Requisito 8 — Asignación de cartera y rol COLLECTION_AGENT

**Historia de usuario:** Como administrador del prestamista, quiero asignar cartera a cobradores con permisos restringidos y auditados, para gestionar la cobranza de forma controlada.

#### Criterios de aceptación
1. EL sistema DEBERÁ permitir a `LENDER_ADMIN` (o roles autorizados) asignar y reasignar préstamos/clientes a cobradores dentro del mismo tenant.
2. EL sistema DEBERÁ mantener historial de asignaciones mediante `loan_assignments` (responsable vigente, fechas inicio/fin, usuario que asigna, motivo opcional) sin sobrescribir asignaciones anteriores.
3. CUANDO un `COLLECTION_AGENT` consulta cartera ENTONCES el backend DEBERÁ filtrar por `tenant_id` y `collector_user_id` según asignaciones vigentes.
4. EL `COLLECTION_AGENT` DEBERÁ poder consultar clientes/préstamos asignados, cuotas, saldos, historial de pagos e indicadores de su cartera.
5. EL `COLLECTION_AGENT` DEBERÁ poder registrar gestiones (`collection_activities`: llamadas, mensajes, visitas, resultado, observaciones, próxima acción) y compromisos/promesas de pago.
6. EL `COLLECTION_AGENT` DEBERÁ poder registrar recaudos en efectivo/transferencia con soporte y recibo, aplicando el flujo de revisión/autorización configurado; NO DEBERÁ aprobarse automáticamente si requiere revisión.
7. EL `COLLECTION_AGENT` NO DEBERÁ aprobar/rechazar solicitudes, definir tasas, modificar condiciones, desembolsar, condonar, ajustar ledger, refinanciar, administrar caja global, usuarios, roles ni configuración.
8. EL `COLLECTION_AGENT` NO DEBERÁ consultar cartera de otros cobradores salvo permiso explícito de supervisor/administrador y con auditoría.
9. EL sistema NO DEBERÁ permitir borrar actividades de cobranza; solo correcciones auditadas.

### Requisito 9 — Mora y cobranza

**Historia de usuario:** Como prestamista, quiero identificar mora y gestionar cobranza con reglas configurables y legales, para recuperar cartera sin prácticas abusivas.

#### Criterios de aceptación
1. EL sistema DEBERÁ ejecutar un job diario que identifique cuotas vencidas, actualice métricas y genere eventos.
2. EL sistema DEBERÁ considerar una cuota vencida desde el día siguiente a su fecha de vencimiento si no está pagada completamente; la mora se calcula por cuota vencida.
3. EL sistema NO DEBERÁ aplicar automáticamente intereses/cargos de mora hasta definir y validar su legalidad y fórmula.
4. EL sistema DEBERÁ permitir reglas configurables de recordatorio (antes, el día y después del vencimiento).
5. EL sistema DEBERÁ enviar notificaciones vía SNS/SES/SMS según configuración y disponibilidad regional, y push por FCM cuando aplique.
6. EL sistema DEBERÁ registrar historial de gestiones (fecha, canal, agente, resultado, próxima acción).
7. EL sistema DEBERÁ respetar horarios, consentimientos y normativa; NO DEBERÁ habilitar prácticas de cobranza abusivas.

### Requisito 10 — Dashboard del prestamista

**Historia de usuario:** Como prestamista, quiero un dashboard con indicadores financieros correctos, para tomar decisiones sin confundir capital con utilidad.

#### Criterios de aceptación
1. EL sistema DEBERÁ mostrar, con filtros por período y tenant: capital disponible, capital colocado pendiente, capital recuperado, intereses recaudados (ganancia realizada), intereses proyectados/por cobrar, cartera por cobrar y vencida, recaudo por día/semana/mes, préstamos activos/liquidados/en mora, clientes puntuales/con retraso/morosos, flujo de caja y gráficas.
2. EL sistema DEBERÁ separar siempre capital, intereses, cargos, gastos, provisiones/pérdidas y liquidez.
3. EL sistema NO DEBERÁ sumar el capital recuperado como utilidad.
4. EL sistema NO DEBERÁ incluir intereses aún no cobrados dentro de las ganancias realizadas.

### Requisito 11 — Historial y perfil de riesgo interno

**Historia de usuario:** Como prestamista, quiero un score interno explicable, para informar decisiones sin aplicar criterios discriminatorios ni automáticos no auditables.

#### Criterios de aceptación
1. EL sistema DEBERÁ mantener historial de préstamos y cuotas por cliente y métricas (puntualidad %, retraso promedio, cuotas vencidas, refinanciaciones, créditos liquidados).
2. EL sistema DEBERÁ calcular un score interno explicable basado en reglas configurables.
3. EL sistema NO DEBERÁ usar el score como decisión única ni aplicar scoring discriminatorio.
4. EL sistema DEBERÁ permitir corregir datos inexactos y registrar auditoría de la corrección.

### Requisito 12 — Documentos, notificaciones y reportes

**Historia de usuario:** Como usuario, quiero acceder a documentos y reportes de forma segura, para gestionar mis obligaciones y la cartera.

#### Criterios de aceptación
1. EL sistema DEBERÁ almacenar contratos, pagarés, soportes y comprobantes en S3 privado con cifrado, versionado y políticas de retención.
2. CUANDO se accede a un documento ENTONCES el sistema DEBERÁ entregar URLs prefirmadas de corta duración.
3. SI un usuario no está autorizado ENTONCES el sistema NO DEBERÁ permitir acceso al documento privado.
4. EL sistema DEBERÁ ofrecer plantillas PDF para contrato, pagaré, estado de cuenta y paz y salvo.
5. EL sistema DEBERÁ permitir exportación CSV/XLSX/PDF de cartera, recaudo, vencimientos y movimientos.
6. EL sistema DEBERÁ auditar acciones críticas: aprobación, desembolso, cambio de tasa, ajustes, pago manual, refinanciación y cierre.

### Requisito 13 — Multi-tenant y aislamiento

**Historia de usuario:** Como operador de la plataforma, quiero aislamiento estricto entre prestamistas, para que ningún dato ni movimiento se cruce entre tenants.

#### Criterios de aceptación
1. CADA entidad de negocio DEBERÁ incluir `tenant_id`.
2. EL sistema DEBERÁ impedir que un cliente acceda a información de otro cliente o tenant.
3. EL sistema DEBERÁ validar que cobrador y préstamo pertenezcan al mismo tenant en toda asignación.
4. EL sistema DEBERÁ exponer identificadores públicos UUID y NO DEBERÁ exponer IDs internos.

### Requisito 14 — Ledger, integridad financiera e idempotencia

**Historia de usuario:** Como prestamista, quiero un ledger inmutable y consistente, para confiar en los saldos y la contabilidad operativa.

#### Criterios de aceptación
1. EL sistema DEBERÁ registrar movimientos en un ledger inmutable (doble partida recomendada); NO DEBERÁ modificarse ni eliminarse.
2. EL sistema DEBERÁ ejecutar operaciones financieras dentro de transacciones SQL, auditables e idempotentes.
3. CUANDO la suma de movimientos y saldos se calcula ENTONCES DEBERÁ coincidir con los saldos de cuotas y préstamo.
4. EL sistema DEBERÁ permitir soft delete solo para datos no financieros; ledger y pagos no se eliminan.
5. UN pago aprobado solo por webhook autenticado o consulta server-to-server DEBERÁ aplicarse al ledger.

### Requisito 15 — Arquitectura, infraestructura y seguridad (no funcional)

**Historia de usuario:** Como equipo técnico, quiero una arquitectura serverless modular y segura con IaC, para operar en ambientes separados con control de costos y auditoría.

#### Criterios de aceptación
1. EL sistema DEBERÁ usar arquitectura hexagonal/clean: dominio sin AWS SDK ni framework; adaptadores AWS en infraestructura.
2. EL sistema DEBERÁ exponer API REST versionada `/v1` documentada con OpenAPI/Swagger y validación de entrada.
3. EL frontend React DEBERÁ compilarse y publicarse en S3/CloudFront (bucket privado + OAC) sin incluir secretos.
4. EL backend NestJS DEBERÁ ejecutarse localmente y en Lambda detrás de API Gateway HTTP API con JWT authorizer Cognito.
5. EL sistema DEBERÁ definir ambientes separados `dev`, `stage`, `prod` desplegables desde cero por AWS CDK.
6. EL sistema NO DEBERÁ incluir secretos, tokens, datos de tarjeta ni PII sensible en logs.
7. EL sistema DEBERÁ gestionar secretos en AWS Secrets Manager y cifrado con KMS.
8. EL CI DEBERÁ ejecutar lint, typecheck, tests, build de React, build de NestJS y validación de CDK.
9. EL sistema NO DEBERÁ desplegar ni modificar recursos reales de AWS sin aprobación explícita; producción requiere aprobación manual.

---

## Requisitos no funcionales adicionales

- **Accesibilidad:** UI conforme a WCAG 2.1 AA; no depender solo del color para estados (incluir texto e icono).
- **Observabilidad:** logs estructurados, métricas, alarmas y tracing (CloudWatch, X-Ray/ADOT) para todas las funciones críticas.
- **Respaldos:** AWS Backup con políticas de retención; RDS Multi-AZ y PITR en producción; prueba de restauración.
- **Costos:** AWS Budgets / Cost Anomaly Detection habilitados.
- **Internacionalización de presentación:** COP y zona horaria `America/Bogota`.

## Fuera del MVP
Marketplace público; captación/inversión de terceros; open banking y consulta automática de centrales de riesgo; débitos automáticos antes de validar proveedor/mandato/marco legal; IA para aprobación automática; app nativa iOS/Android (MVP web responsive/PWA); contabilidad fiscal completa (el MVP tiene ledger operativo y reportes).
