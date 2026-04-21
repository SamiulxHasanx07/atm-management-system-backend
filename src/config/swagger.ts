import swaggerJSDoc from 'swagger-jsdoc';
import path from 'path';

const IS_VERCEL = process.env.VERCEL === '1';
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : `http://localhost:${process.env.PORT || 5000}`;

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ATM Management System API',
    version: '1.0.0',
    description:
      'RESTful API for ATM Management System built with Node.js, Express, TypeScript, and MySQL',
    license: {
      name: 'ISC',
      url: 'https://opensource.org/licenses/ISC',
    },
    contact: {
      name: 'API Support',
      url: BASE_URL,
    },
  },
  servers: [
    {
      url: BASE_URL,
      description: IS_VERCEL ? 'Production server (Vercel)' : 'Development server',
    },
    ...(IS_VERCEL
      ? []
      : [
          {
            url: 'http://localhost:5000',
            description: 'Local development',
          },
        ]),
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'Authentication and authorization endpoints',
    },
    {
      name: 'Accounts',
      description: 'Account management operations',
    },
    {
      name: 'Transactions',
      description: 'Transaction operations (deposit, withdraw, history)',
    },
  ],
  components: {
    schemas: {
      Account: {
        type: 'object',
        required: [
          'account_number',
          'card_number',
          'name',
          'phone_number',
          'gender',
          'profession',
          'nid',
          'address',
        ],
        properties: {
          account_number: {
            type: 'string',
            description: '12-digit account number',
          },
          card_number: {
            type: 'string',
            description: '16-digit card number',
          },
          name: {
            type: 'string',
            minLength: 2,
          },
          phone_number: {
            type: 'string',
            pattern: '^[0-9]{10,15}$',
          },
          email: {
            type: 'string',
            format: 'email',
          },
          gender: {
            type: 'string',
            enum: ['Male', 'Female', 'Other'],
          },
          profession: {
            type: 'string',
          },
          nationality: {
            type: 'string',
            default: 'Bangladeshi',
          },
          nid: {
            type: 'string',
            pattern: '^[0-9]+$',
          },
          address: {
            type: 'string',
          },
          balance: {
            type: 'number',
            minimum: 0,
          },
          blocked: {
            type: 'boolean',
            default: false,
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      AccountResponse: {
        type: 'object',
        properties: {
          account_number: { type: 'string' },
          card_number: { type: 'string' },
          name: { type: 'string' },
          phone_number: { type: 'string' },
          email: { type: 'string' },
          gender: { type: 'string' },
          profession: { type: 'string' },
          nationality: { type: 'string' },
          nid: { type: 'string' },
          address: { type: 'string' },
          balance: { type: 'number' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          card_number: { type: 'string' },
          amount: { type: 'number' },
          transaction_type: {
            type: 'string',
            enum: ['DEPOSIT', 'WITHDRAW', 'SEND_MONEY', 'RECEIVED_MONEY'],
          },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { type: 'object' },
          error: { type: 'string' },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

// Use __dirname-relative paths so it works in both src/ (ts-node) and dist/ (compiled)
const routesGlob = path.join(__dirname, '..', 'routes', '*.{ts,js}');
const controllersGlob = path.join(__dirname, '..', 'controllers', '*.{ts,js}');

const options = {
  swaggerDefinition,
  apis: [routesGlob, controllersGlob],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
