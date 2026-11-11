# infra/cdk — Infraestructura AWS (CDK)

Stack serverless del MVP desplegado con AWS CDK en **us-east-2**. Todo on-demand
(sin recursos encendidos 24/7) para minimizar costo.

## Recursos (stack `Plataforma-dev`)
- **DynamoDB** `plataforma-dev`: tabla single-table (PK/SK + GSI1), on-demand, PITR y cifrado.
- **Lambda** `plataforma-api-dev`: handler del API (Node 20), permisos mínimos a la tabla.
- **API Gateway HTTP API** `plataforma-http-dev`: expone `/v1/*` hacia la Lambda.
- **CloudWatch LogGroup**: logs de la Lambda (retención 1 semana).

## Endpoint desplegado (dev)
```
https://95sc3qnpxd.execute-api.us-east-2.amazonaws.com
```
Rutas de la iteración inicial:
- `GET  /v1/health`
- `POST /v1/tenants/{tenantId}/customers`  (crea cliente en DynamoDB)
- `GET  /v1/tenants/{tenantId}/customers`  (lista clientes del tenant)

## Comandos

```bash
npm install
npm run build            # compila TypeScript a dist/
npx cdk synth            # sintetiza el template
npx cdk diff             # muestra cambios vs. lo desplegado
npx cdk deploy Plataforma-dev --require-approval never
npx cdk destroy Plataforma-dev   # BORRA todos los recursos del stack
```

> En PowerShell con políticas restringidas, ejecuta vía `cmd /c "..."`.

## Costos y limpieza
- Con poco tráfico el costo es prácticamente **cero** (DynamoDB/Lambda/API Gateway on-demand).
- Para no dejar nada corriendo: `npx cdk destroy Plataforma-dev`. En `dev` la tabla tiene
  `removalPolicy: DESTROY`, así que se elimina con el stack.

## Autenticación (Cognito)
- **User Pool:** `us-east-2_6jr9ZaxsH` · **App client (SPA):** `5jsaa5peabemi0a4nd8q94lif9`
- Grupos = roles (PLATFORM_ADMIN, LENDER_ADMIN, LENDER_OPERATOR, COLLECTION_AGENT, CUSTOMER).
- Las rutas `/v1/*` están protegidas por un JWT authorizer. Públicas: `/v1/health`,
  `/v1/webhooks/*` y `/v1/dev/seed` (solo dev).
- **Usuario demo:** `admin@demo.co` / `Demo1234` (grupo LENDER_ADMIN).
- Crear más usuarios:
  ```bash
  aws cognito-idp admin-create-user --user-pool-id us-east-2_6jr9ZaxsH --username <email> --user-attributes Name=email,Value=<email> Name=email_verified,Value=true --message-action SUPPRESS
  aws cognito-idp admin-set-user-password --user-pool-id us-east-2_6jr9ZaxsH --username <email> --password <pass> --permanent
  aws cognito-idp admin-add-user-to-group --user-pool-id us-east-2_6jr9ZaxsH --username <email> --group-name LENDER_ADMIN
  ```

## Notas
- La cuenta/región fue "bootstrapeada" (stack `CDKToolkit`). Su costo es mínimo.
- Runtime `nodejs20.x`: AWS lo marca deprecado a futuro; migrar a `nodejs24.x` en una fase próxima.
- La autorización de negocio fina (ownership por tenant, filtro de cartera del cobrador)
  se refuerza en el handler usando los claims del JWT; está parcialmente implementada.
