import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class AgilePulseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'entityType', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    sessionsTable.addGlobalSecondaryIndex({
      indexName: 'ByTeamStatus',
      partitionKey: { name: 'teamName', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'statusCreatedAt', type: dynamodb.AttributeType.STRING },
    });

    const votesTable = new dynamodb.Table(this, 'VotesTable', {
      partitionKey: { name: 'sessionStoryRound', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const users = new cognito.UserPool(this, 'AgilePulseUserPool', {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      mfa: cognito.Mfa.OPTIONAL,
    });

    const webClient = users.addClient('WebClient', {
      authFlows: {
        userSrp: true,
      },
    });

    const apiHandler = new lambda.Function(this, 'SessionApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/session-api'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(15),
      environment: {
        SESSIONS_TABLE: sessionsTable.tableName,
        VOTES_TABLE: votesTable.tableName,
      },
    });

    sessionsTable.grantReadWriteData(apiHandler);
    votesTable.grantReadWriteData(apiHandler);

    apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    const httpApi = new apigw.HttpApi(this, 'AgilePulseHttpApi', {
      apiName: 'agilepulse-http-api',
      createDefaultStage: true,
    });

    httpApi.addRoutes({
      path: '/agilepulse/{proxy+}',
      methods: [apigw.HttpMethod.ANY],
      integration: new apigwIntegrations.HttpLambdaIntegration('SessionApiIntegration', apiHandler),
    });

    const wsApi = new apigw.WebSocketApi(this, 'AgilePulseWsApi', {
      connectRouteOptions: {
        integration: new apigwIntegrations.WebSocketLambdaIntegration('WsConnectIntegration', apiHandler),
      },
      disconnectRouteOptions: {
        integration: new apigwIntegrations.WebSocketLambdaIntegration('WsDisconnectIntegration', apiHandler),
      },
      defaultRouteOptions: {
        integration: new apigwIntegrations.WebSocketLambdaIntegration('WsDefaultIntegration', apiHandler),
      },
    });

    const wsStage = new apigw.WebSocketStage(this, 'ProdStage', {
      webSocketApi: wsApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    new cdk.CfnOutput(this, 'HttpApiUrl', { value: httpApi.apiEndpoint });
    new cdk.CfnOutput(this, 'WebSocketUrl', { value: wsStage.url });
    new cdk.CfnOutput(this, 'UserPoolId', { value: users.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: webClient.userPoolClientId });

    // ── Frontend: Next.js standalone via Lambda Web Adapter ──────────────────

    const lwaLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'LambdaWebAdapterLayer',
      `arn:aws:lambda:${this.region}:753240598075:layer:LambdaAdapterLayerX86:23`,
    );

    const frontendFn = new lambda.Function(this, 'FrontendHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'run.sh',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../.next/standalone')),
      layers: [lwaLayer],
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        PORT: '8080',
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        NODE_ENV: 'production',
        HOSTNAME: '0.0.0.0',
        NEXT_PUBLIC_AGILEPULSE_API_BASE_URL: httpApi.apiEndpoint,
        // Set via: cdk deploy --context gaMeasurementId=G-XXXXXXXXXX
        ...(this.node.tryGetContext('gaMeasurementId')
          ? { NEXT_PUBLIC_GA_MEASUREMENT_ID: this.node.tryGetContext('gaMeasurementId') as string }
          : {}),
      },
    });

    frontendFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    const frontendUrl = frontendFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: new cloudfrontOrigins.FunctionUrlOrigin(frontendUrl),
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      },
      // Optional custom domain support.
      // Pass via CDK context:
      //   cdk deploy --context customDomain=agilepulse.example.com --context acmCertificateArn=arn:aws:acm:us-east-1:...
      ...(this.node.tryGetContext('customDomain') && this.node.tryGetContext('acmCertificateArn')
        ? {
            domainNames: [this.node.tryGetContext('customDomain') as string],
            certificate: acm.Certificate.fromCertificateArn(
              this,
              'CustomDomainCert',
              this.node.tryGetContext('acmCertificateArn') as string,
            ),
          }
        : {}),
    });

    new cdk.CfnOutput(this, 'AppUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'AgilePulse public application URL',
    });

    if (this.node.tryGetContext('customDomain')) {
      new cdk.CfnOutput(this, 'CustomDomainUrl', {
        value: `https://${this.node.tryGetContext('customDomain') as string}`,
        description: 'AgilePulse custom domain URL (point your DNS CNAME here)',
      });
    }
  }
}
