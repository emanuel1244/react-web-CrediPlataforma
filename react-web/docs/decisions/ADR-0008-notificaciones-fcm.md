# ADR-0008: Canal de notificaciones push (FCM)

- Estado: Aceptada
- Fecha: 2026-11-11
- Requisitos relacionados: 4, 5, 9

## Contexto
Se necesita push al cliente (p. ej. aprobación con desembolso en máx. 72h hábiles) y notificaciones por email/SMS. SNS no envía directamente a FCM.

## Decisión
Usar Firebase Cloud Messaging (FCM) como canal de push móvil/web. El flujo recomendado es EventBridge/SNS → SQS → Lambda (Firebase Admin SDK) → FCM. SNS se usa para fan-out/eventos y SMS cuando aplique. SES para emails transaccionales. No guardar tokens de dispositivo en logs; registrar estado/intentos/errores de notificación.

## Alternativas consideradas
- SNS directo a push — no cubre FCM genérico de forma directa; descartado.
- Solo email — insuficiente para la experiencia esperada.

## Consecuencias
- Worker Lambda con Firebase Admin SDK y credenciales en Secrets Manager.
- Eventos `LoanApproved`/`LoanDisbursed` disparan notificaciones asíncronas.
- No comunicar "dinero enviado" hasta que el desembolso esté confirmado.

## Pendiente / condiciones
Confirmar términos de uso de FCM/SES y proveedor de SMS para la región.
