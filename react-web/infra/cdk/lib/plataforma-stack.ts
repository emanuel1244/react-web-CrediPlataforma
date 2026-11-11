import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { HttpApi, HttpMethod, CorsHttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';

export interface PlataformaStackProps extends cdk.StackProps {
  envName: string;
}

/**
 * Stack serverless del MVP: DynamoDB single-table + Lambda del API + HTTP API.
 * Todo on-demand/serverless (sin recursos encendidos 24/7) para minimizar costo.
 */
export class PlataformaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PlataformaStackProps) {
    super(scope, id, props);
    const { envName } = props;

    // ---------------- DynamoDB (single-table) ----------------
    const table = new dynamodb.Table(this, 'Table', {
      tableName: `plataforma-${envName}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // on-demand: pago por uso
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      // En dev permitimos destruir la tabla con el stack; en prod cambiar a RETAIN.
      removalPolicy: envName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // GSI1: patrones de acceso por cliente / entidad relacionada.
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ---------------- Lambda del API ----------------
    const apiLogGroup = new logs.LogGroup(this, 'ApiFnLogs', {
      logGroupName: `/aws/lambda/plataforma-api-${envName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const apiFn = new lambda.Function(this, 'ApiFn', {
      functionName: `plataforma-api-${envName}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/api'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      environment: {
        TABLE_NAME: table.tableName,
        ENV_NAME: envName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      logGroup: apiLogGroup,
      description: `API handler de la plataforma (${envName})`,
    });

    // Permisos mínimos: solo acceso a la tabla (y su índice).
    table.grantReadWriteData(apiFn);

    // ---------------- Cognito (identidad) ----------------
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `plataforma-${envName}`,
      selfSignUpEnabled: false, // altas gestionadas por el backoffice en el MVP
      signInAliases: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: envName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Grupos = roles del spec. La autorización de negocio la refuerza el backend.
    for (const role of ['PLATFORM_ADMIN', 'LENDER_ADMIN', 'LENDER_OPERATOR', 'COLLECTION_AGENT', 'CUSTOMER']) {
      new cognito.CfnUserPoolGroup(this, `Group${role}`, {
        userPoolId: userPool.userPoolId,
        groupName: role,
      });
    }

    // App client público (SPA): sin secreto, con USER_PASSWORD_AUTH para la demo.
    const userPoolClient = userPool.addClient('WebClient', {
      userPoolClientName: `plataforma-web-${envName}`,
      authFlows: { userPassword: true, userSrp: true },
      generateSecret: false,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    const authorizer = new HttpJwtAuthorizer('JwtAuthorizer', userPool.userPoolProviderUrl, {
      jwtAudience: [userPoolClient.userPoolClientId],
      identitySource: ['$request.header.Authorization'],
    });

    // ---------------- HTTP API Gateway ----------------
    const httpApi = new HttpApi(this, 'HttpApi', {
      apiName: `plataforma-http-${envName}`,
      description: `HTTP API /v1 (${envName})`,
      corsPreflight: {
        allowOrigins: ['*'], // restringir por ambiente en una fase posterior
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.PATCH,
          CorsHttpMethod.DELETE,
          CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
      },
    });

    const integration = new HttpLambdaIntegration('ApiIntegration', apiFn);

    // Rutas PÚBLICAS (sin authorizer): health, webhooks de pago (firma propia) y
    // el seed de datos de demo (solo útil en dev).
    httpApi.addRoutes({ path: '/v1/health', methods: [HttpMethod.GET], integration });
    httpApi.addRoutes({ path: '/v1/webhooks/{proxy+}', methods: [HttpMethod.POST], integration });
    if (envName !== 'prod') {
      httpApi.addRoutes({ path: '/v1/dev/seed', methods: [HttpMethod.POST], integration });
    }

    // Rutas PROTEGIDAS con JWT authorizer de Cognito. El handler enruta internamente.
    httpApi.addRoutes({
      path: '/v1/{proxy+}',
      methods: [HttpMethod.ANY],
      integration,
      authorizer,
    });

    // ---------------- Salidas ----------------
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint,
      description: 'URL base del HTTP API (añadir /v1/health para probar)',
    });
    new cdk.CfnOutput(this, 'TableNameOut', {
      value: table.tableName,
      description: 'Nombre de la tabla DynamoDB',
    });
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID (SPA)',
    });
  }
}
