import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  service: {
    name: string;
    version: string;
    port: number;
    env: string;
  };
  aws: {
    region: string;
    accountId: string;
  };
  dynamodb: {
    productsTable: string;
    endpoint?: string;
  };
  secrets: {
    secretName: string;
  };
  logging: {
    level: string;
  };
  api: {
    version: string;
    basePath: string;
  };
  pagination: {
    defaultPageSize: number;
    maxPageSize: number;
  };
  cors: {
    origin: string;
  };
  xray: {
    enabled: boolean;
  };
}

const config: Config = {
  service: {
    name: process.env.SERVICE_NAME || 'product-catalog-service',
    version: process.env.SERVICE_VERSION || '1.0.0',
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accountId: process.env.AWS_ACCOUNT_ID || '',
  },
  dynamodb: {
    productsTable: process.env.DYNAMODB_PRODUCTS_TABLE || 'products',
    endpoint: process.env.DYNAMODB_ENDPOINT,
  },
  secrets: {
    secretName: process.env.SECRETS_MANAGER_SECRET_NAME || 'shopcart/product-catalog/prod',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  api: {
    version: process.env.API_VERSION || 'v1',
    basePath: process.env.API_BASE_PATH || '/api/v1',
  },
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  xray: {
    enabled: process.env.ENABLE_XRAY === 'true',
  },
};

export default config;
