#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PlataformaStack } from '../lib/plataforma-stack';

const app = new cdk.App();

// Ambiente objetivo. La cuenta se toma de las credenciales del CLI;
// la región se fija en us-east-2 (ADR de costos).
const envName = app.node.tryGetContext('env') ?? 'dev';

const stack = new PlataformaStack(app, `Plataforma-${envName}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-2',
  },
  envName,
  description: `Plataforma de préstamos — stack serverless (${envName})`,
});

cdk.Tags.of(stack).add('project', 'plataforma-prestamos');
cdk.Tags.of(stack).add('env', envName);
cdk.Tags.of(stack).add('managedBy', 'cdk');
