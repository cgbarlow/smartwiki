# SmartWiki Deployment Architecture

## 🌐 Overview

SmartWiki uses a hybrid cloud architecture with **Netlify** for frontend hosting and **AWS** for backend services and RAG functionality.

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Web Browser  │  Mobile App  │  Desktop App  │  API Clients   │
└─────────────────┬───────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│                     NETLIFY CDN                                │
├─────────────────────────────────────────────────────────────────┤
│  • Global Edge Locations                                       │
│  • Static Asset Caching                                        │
│  • SSL/TLS Termination                                         │
│  • DDoS Protection                                             │
└─────────────────┬───────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│                  NETLIFY HOSTING                               │
├─────────────────────────────────────────────────────────────────┤
│  • React SPA (Static Build)                                    │
│  • Client-side Routing                                         │
│  • Environment Management                                      │
│  • Serverless Functions (optional)                             │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTPS API Calls
┌─────────────────▼───────────────────────────────────────────────┐
│                   AWS API GATEWAY                              │
├─────────────────────────────────────────────────────────────────┤
│  • REST API Endpoints                                          │
│  • Authentication & Authorization                              │
│  • Rate Limiting & Throttling                                  │
│  • Request/Response Transformation                             │
└─────────────────┬───────────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐    ┌───▼───┐    ┌───▼─────────────────────────────────┐
│AWS    │    │AWS    │    │        AWS BEDROCK                  │
│LAMBDA │    │LAMBDA │    ├─────────────────────────────────────┤
│       │    │       │    │  • Knowledge Bases                  │
│Auth   │    │API    │    │  • LLM Models (Claude, etc.)       │
│Service│    │Service│    │  • Vector Search                    │
└───┬───┘    └───┬───┘    │  • RAG Pipeline                     │
    │            │        └─────────────────────────────────────┘
    │            │
    │        ┌───▼───────────────────────────────────────────────┐
    │        │             AWS S3                               │
    │        ├───────────────────────────────────────────────────┤
    │        │  • Document Storage                              │
    │        │  • File Uploads                                  │
    │        │  • Static Assets                                 │
    │        │  • Backup & Archive                              │
    │        └───┬───────────────────────────────────────────────┘
    │            │
┌───▼────────────▼───────────────────────────────────────────────┐
│                    AWS RDS POSTGRESQL                         │
├─────────────────────────────────────────────────────────────────┤
│  • Multi-tenant Data                                           │
│  • User Management                                             │
│  • Document Metadata                                           │
│  • Agent Configurations                                        │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Frontend Deployment (Netlify)

### Static Site Generation
- **Build Process**: Vite builds React app to static assets
- **Output Directory**: `dist/` contains all deployable files
- **Asset Optimization**: Minification, compression, and bundling
- **Environment Variables**: Secure config for different environments

### Netlify Features
- **Global CDN**: 300+ edge locations worldwide
- **Instant Cache Invalidation**: Immediate updates on deployment
- **Form Handling**: Built-in form processing for contact forms
- **Split Testing**: A/B testing capabilities
- **Deploy Previews**: Branch-based preview deployments

### Configuration Files

#### netlify.toml
```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

# SPA routing support
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.smartwiki.com"

# Cache control
[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

#### package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "build:staging": "NODE_ENV=staging vite build",
    "build:production": "NODE_ENV=production vite build"
  }
}
```

## ⚙️ Backend Deployment (AWS)

### AWS Lambda Functions
- **Runtime**: Node.js 18.x
- **Memory**: 1024MB (adjustable based on workload)
- **Timeout**: 30 seconds for API calls, 15 minutes for file processing
- **Environment Variables**: Secure parameter store integration

### API Gateway Configuration
- **Type**: REST API
- **Authentication**: JWT tokens from Auth0/Cognito
- **CORS**: Configured for Netlify domain
- **Rate Limiting**: 1000 requests per minute per user

### Infrastructure as Code

#### CDK Stack Example
```typescript
// infrastructure/SmartWikiStack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class SmartWikiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for file storage
    const documentBucket = new s3.Bucket(this, 'DocumentBucket', {
      bucketName: 'smartwiki-documents',
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // RDS PostgreSQL Database
    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_3,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      multiAz: false, // Enable for production
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: true,
    });

    // Lambda Functions
    const authFunction = new lambda.Function(this, 'AuthFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'auth.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        DATABASE_URL: database.instanceEndpoint.socketAddress,
      },
    });

    const apiFunction = new lambda.Function(this, 'ApiFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'api.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        DATABASE_URL: database.instanceEndpoint.socketAddress,
        BEDROCK_REGION: 'us-east-1',
        S3_BUCKET: documentBucket.bucketName,
      },
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'SmartWikiApi', {
      restApiName: 'SmartWiki API',
      description: 'API for SmartWiki application',
      defaultCorsPreflightOptions: {
        allowOrigins: ['https://smartwiki.netlify.app'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // API Routes
    const auth = api.root.addResource('auth');
    auth.addMethod('POST', new apigateway.LambdaIntegration(authFunction));

    const documents = api.root.addResource('documents');
    documents.addMethod('GET', new apigateway.LambdaIntegration(apiFunction));
    documents.addMethod('POST', new apigateway.LambdaIntegration(apiFunction));
  }
}
```

## 🔒 Security Configuration

### Netlify Security
- **HTTPS Enforcement**: Automatic SSL/TLS certificates
- **Security Headers**: CSP, HSTS, X-Frame-Options
- **Environment Variables**: Encrypted at rest
- **Access Control**: Team-based permissions

### AWS Security
- **IAM Roles**: Least privilege access
- **VPC**: Private subnets for database
- **Security Groups**: Restrictive firewall rules
- **Encryption**: At rest and in transit
- **Secrets Manager**: Secure credential storage

## 📊 Monitoring and Observability

### Netlify Analytics
- **Deploy Metrics**: Build times, success rates
- **Site Analytics**: Page views, performance
- **Form Analytics**: Submission tracking
- **Real User Monitoring**: Core Web Vitals

### AWS CloudWatch
- **Lambda Metrics**: Invocations, duration, errors
- **API Gateway**: Request count, latency, errors
- **RDS Metrics**: CPU, memory, connections
- **Custom Metrics**: Business KPIs

### Error Tracking
- **Sentry Integration**: Frontend and backend error tracking
- **Log Aggregation**: Centralized logging with CloudWatch
- **Alerting**: PagerDuty integration for critical issues

## 🚀 Deployment Pipeline

### Continuous Integration
```yaml
# .github/workflows/deploy.yml
name: Deploy to Netlify

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.API_URL }}
          REACT_APP_AWS_REGION: ${{ secrets.AWS_REGION }}
      
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=dist
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Environment Management
- **Production**: `main` branch → `smartwiki.netlify.app`
- **Staging**: `develop` branch → `staging--smartwiki.netlify.app`
- **Feature**: Feature branches → `deploy-preview--{id}--smartwiki.netlify.app`

## 🔧 Configuration Management

### Environment Variables

#### Netlify (Frontend)
```bash
# Production
REACT_APP_API_URL=https://api.smartwiki.com
REACT_APP_AWS_REGION=us-east-1
REACT_APP_AUTH0_DOMAIN=smartwiki.auth0.com
REACT_APP_AUTH0_CLIENT_ID=your_client_id
REACT_APP_SENTRY_DSN=your_sentry_dsn

# Staging
REACT_APP_API_URL=https://api-staging.smartwiki.com
REACT_APP_AWS_REGION=us-east-1
REACT_APP_AUTH0_DOMAIN=smartwiki-staging.auth0.com
REACT_APP_AUTH0_CLIENT_ID=your_staging_client_id
```

#### AWS (Backend)
```bash
# Lambda Environment Variables
DATABASE_URL=postgresql://user:pass@host:5432/smartwiki
BEDROCK_REGION=us-east-1
S3_BUCKET=smartwiki-documents
JWT_SECRET=stored_in_secrets_manager
AUTH0_DOMAIN=smartwiki.auth0.com
AUTH0_AUDIENCE=https://api.smartwiki.com
```

## 📈 Performance Optimization

### Netlify Optimizations
- **Gzip Compression**: Automatic compression
- **Brotli Compression**: Better compression ratios
- **Image Optimization**: Automatic WebP conversion
- **Prerendering**: For better SEO
- **Edge Functions**: Geolocation-based customization

### AWS Optimizations
- **CloudFront CDN**: Global content delivery
- **Lambda@Edge**: Request/response manipulation
- **RDS Read Replicas**: Improved read performance
- **ElastiCache**: Redis caching layer
- **Bedrock Provisioned Throughput**: Consistent performance

## 🔄 Disaster Recovery

### Backup Strategy
- **Database**: Daily automated backups (7-day retention)
- **S3 Cross-Region Replication**: Disaster recovery
- **Code Repository**: Git-based version control
- **Configuration**: Infrastructure as Code versioning

### Recovery Procedures
1. **Database Recovery**: Point-in-time restore from backups
2. **Application Recovery**: Redeploy from Git repository
3. **Data Recovery**: S3 cross-region replication restore
4. **DNS Failover**: Route 53 health checks and failover

## 📋 Cost Optimization

### Netlify Costs
- **Starter Plan**: Free for personal projects
- **Pro Plan**: $19/month for production sites
- **Business Plan**: $99/month for enterprise features

### AWS Costs (Estimated Monthly)
- **Lambda**: $5-20 (based on usage)
- **API Gateway**: $3-15 (per million requests)
- **RDS**: $15-50 (t3.micro to t3.small)
- **S3**: $5-25 (based on storage and transfer)
- **Bedrock**: Variable (based on usage)

### Cost Monitoring
- **AWS Cost Explorer**: Daily cost tracking
- **Budgets**: Alerts for cost thresholds
- **Resource Tagging**: Cost allocation by feature
- **Right-sizing**: Regular instance optimization

---

This architecture provides a robust, scalable, and cost-effective deployment strategy with **Netlify** handling the frontend delivery and **AWS Bedrock** powering the RAG functionality.