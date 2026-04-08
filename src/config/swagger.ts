import swaggerJSDoc from 'swagger-jsdoc';

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
      url: 'http://localhost:3000',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development server',
    },
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
            enum: ['DEPOSIT', 'WITHDRAW'],
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

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
