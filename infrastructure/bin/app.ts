#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AgilePulseStack } from '../lib/agilepulse-stack';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION ?? 'us-east-1';

if (!account) {
  throw new Error(
    'CDK_DEFAULT_ACCOUNT is not set. Run: export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)'
  );
}

new AgilePulseStack(app, 'AgilePulseStack', {
  env: {
    account,
    region,
  },
});
