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
    cartsTable: string;
    endpoint?: string;
  };
  secrets: {
    secretName: string;
  };
  productCatalog: {
    serviceUrl: string;
  };
  logging: {
    level: string;
  };
  api: {
    version: string;
    basePath: string;
  };
  cart: {
    ttlSeconds: number;
  };
  circuitBreaker: {
    timeout: number;
    errorThresholdPercentage: number;
    resetTimeout: number;
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
    name: process.env.SERVICE_NAME || 'cart-service',
    version: process.env.SERVICE_VERSION || '1.0.0',
    port: parseInt(process.env.PORT || '3001', 10),
    env: process.env.NODE_ENV || 'development',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accountId: process.env.AWS_ACCOUNT_ID || '',
  },
  dynamodb: {
    cartsTable: process.env.DYNAMODB_CARTS_TABLE || 'carts',
    endpoint: process.env.DYNAMODB_ENDPOINT,
  },
  secrets: {
    secretName: process.env.SECRETS_MANAGER_SECRET_NAME || 'shopcart/cart/prod',
  },
  productCatalog: {
    serviceUrl: process.env.PRODUCT_CATALOG_SERVICE_URL || 'http://product-catalog-service:3000',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  api: {
    version: process.env.API_VERSION || 'v1',
    basePath: process.env.API_BASE_PATH || '/api/v1',
  },
  cart: {
    ttlSeconds: parseInt(process.env.CART_TTL_SECONDS || '2592000', 10), // 30 days
  },
  circuitBreaker: {
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '3000', 10),
    errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD || '50', 10),
    resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  xray: {
    enabled: process.env.ENABLE_XRAY === 'true',
  },
};

export default config;
