import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),
  
  // Database
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  
  // AWS Configuration
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  
  // Bedrock Configuration
  BEDROCK_KNOWLEDGE_BASE_ID: z.string().optional(),
  BEDROCK_MODEL_ID: z.string().default('anthropic.claude-3-sonnet-20240229-v1:0'),
  BEDROCK_EMBEDDING_MODEL: z.string().default('amazon.titan-embed-text-v2:0'),
  
  // S3 Configuration
  S3_BUCKET_NAME: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  
  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Auth0 (Optional)
  AUTH0_DOMAIN: z.string().optional(),
  AUTH0_CLIENT_ID: z.string().optional(),
  AUTH0_CLIENT_SECRET: z.string().optional(),
  AUTH0_AUDIENCE: z.string().optional(),
  
  // Cognito (Optional)
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
  COGNITO_REGION: z.string().optional(),
  
  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default('0'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // File Upload
  MAX_FILE_SIZE: z.string().default('50MB'),
  ALLOWED_FILE_TYPES: z.string().default('pdf,doc,docx,txt,md,csv,json,png,jpg,jpeg,gif,svg'),
  UPLOAD_DIR: z.string().default('./uploads'),
  ENABLE_VIRUS_SCANNING: z.string().transform(val => val === 'true').default('false'),
  CLAMAV_HOST: z.string().default('localhost'),
  CLAMAV_PORT: z.string().transform(Number).default('3310'),
  
  // File Processing
  ENABLE_FILE_CONVERSION: z.string().transform(val => val === 'true').default('true'),
  ENABLE_THUMBNAIL_GENERATION: z.string().transform(val => val === 'true').default('true'),
  THUMBNAIL_SIZES: z.string().default('150x150,300x300,600x600'),
  PROCESSING_CONCURRENCY: z.string().transform(Number).default('3'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.string().default('combined'),
  
  // Security
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  API_KEY_HEADER: z.string().default('x-api-key'),
  API_KEY: z.string().optional(),
  
  // Monitoring
  ENABLE_METRICS: z.string().transform(val => val === 'true').default('true'),
  METRICS_PORT: z.string().transform(Number).default('9090'),
  HEALTH_CHECK_PATH: z.string().default('/health'),
  
  // Multi-tenancy
  DEFAULT_TENANT: z.string().default('default'),
  TENANT_HEADER: z.string().default('x-tenant-id'),
  
  // Performance
  CACHE_TTL: z.string().transform(Number).default('3600'),
  QUERY_TIMEOUT: z.string().transform(Number).default('30000'),
  MAX_CONCURRENT_QUERIES: z.string().transform(Number).default('10'),
  
  // Development
  DEBUG: z.string().optional(),
  ENABLE_SWAGGER: z.string().transform(val => val === 'true').default('true'),
  SWAGGER_PATH: z.string().default('/api-docs'),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

// Convert file size string to bytes
function parseFileSize(sizeStr: string): number {
  const units: { [key: string]: number } = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };
  
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
  if (!match) {
    throw new Error(`Invalid file size format: ${sizeStr}`);
  }
  
  const [, size, unit] = match;
  return Math.floor(parseFloat(size) * units[unit.toUpperCase()]);
}

// Configuration object
export const config = {
  // Environment
  env: env.NODE_ENV,
  port: env.PORT,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  
  // API
  api: {
    version: env.API_VERSION,
    prefix: `/api/${env.API_VERSION}`,
  },
  
  // Database
  database: {
    url: env.DATABASE_URL,
  },
  
  // AWS
  aws: {
    region: env.AWS_REGION,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  
  // Bedrock
  bedrock: {
    knowledgeBaseId: env.BEDROCK_KNOWLEDGE_BASE_ID,
    modelId: env.BEDROCK_MODEL_ID,
    embeddingModel: env.BEDROCK_EMBEDDING_MODEL,
    region: env.AWS_REGION,
  },
  
  // S3
  s3: {
    bucketName: env.S3_BUCKET_NAME,
    region: env.S3_REGION,
  },
  
  // Authentication
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  
  // Auth0
  auth0: {
    domain: env.AUTH0_DOMAIN,
    clientId: env.AUTH0_CLIENT_ID,
    clientSecret: env.AUTH0_CLIENT_SECRET,
    audience: env.AUTH0_AUDIENCE,
  },
  
  // Cognito
  cognito: {
    userPoolId: env.COGNITO_USER_POOL_ID,
    clientId: env.COGNITO_CLIENT_ID,
    region: env.COGNITO_REGION,
  },
  
  // Redis
  redis: {
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
  
  // File Upload
  upload: {
    maxFileSize: parseFileSize(env.MAX_FILE_SIZE),
    allowedTypes: env.ALLOWED_FILE_TYPES.split(',').map(type => type.trim()),
    uploadDir: env.UPLOAD_DIR,
    enableVirusScanning: env.ENABLE_VIRUS_SCANNING,
    clamavHost: env.CLAMAV_HOST,
    clamavPort: env.CLAMAV_PORT,
  },
  
  // File Processing
  processing: {
    enableFileConversion: env.ENABLE_FILE_CONVERSION,
    enableThumbnailGeneration: env.ENABLE_THUMBNAIL_GENERATION,
    thumbnailSizes: env.THUMBNAIL_SIZES.split(',').map(size => {
      const [width, height] = size.trim().split('x').map(Number);
      return { width, height };
    }),
    concurrency: env.PROCESSING_CONCURRENCY,
  },
  
  // Logging
  log: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },
  
  // Security
  security: {
    apiKeyHeader: env.API_KEY_HEADER,
    apiKey: env.API_KEY,
  },
  
  // CORS
  cors: {
    origins: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
  },
  
  // Monitoring
  monitoring: {
    enabled: env.ENABLE_METRICS,
    port: env.METRICS_PORT,
    healthCheckPath: env.HEALTH_CHECK_PATH,
  },
  
  // Multi-tenancy
  tenant: {
    default: env.DEFAULT_TENANT,
    header: env.TENANT_HEADER,
  },
  
  // Performance
  performance: {
    cacheTtl: env.CACHE_TTL,
    queryTimeout: env.QUERY_TIMEOUT,
    maxConcurrentQueries: env.MAX_CONCURRENT_QUERIES,
  },
  
  // Swagger
  swagger: {
    enabled: env.ENABLE_SWAGGER,
    path: env.SWAGGER_PATH,
  },
} as const;

// Export environment variables for direct access
export { env };

// Type for configuration
export type Config = typeof config;