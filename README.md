# ATM Management System - Backend API

RESTful API for ATM Management System built with Node.js, Express, TypeScript, and MySQL.

## 🚀 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MySQL 8.x
- **ORM/Driver**: mysql2 (Promise-based)
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator, Joi
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS, Rate Limiting, bcrypt
- **Logging**: Winston, Morgan

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **MySQL Server** (v8.x recommended) - [Download](https://dev.mysql.com/downloads/mysql/)
- **npm** or **yarn** (comes with Node.js)

## 🛠️ Installation

### 1. Navigate to backend directory
```bash
cd backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
# Copy the example env file
copy .env.example .env

# Edit .env with your configuration
```

Edit `.env` file with your settings:
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=bangla_bank

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=24h

# Security
BCRYPT_ROUNDS=10
```

## 🗄️ Database Setup

### Option 1: Automatic (Recommended)
The server will automatically create the database and tables on startup.

### Option 2: Manual Migration
```bash
npm run migrate
```

### Option 3: Seed Sample Data
```bash
npm run seed
```

This creates:
- Database: `bangla_bank`
- Tables: `accounts`, `transactions`
- Sample accounts with PIN: `1234`

## 🏃 Running the Application

### Development Mode (with hot-reload)
```bash
npm run dev
```

### Production Mode
```bash
# Build TypeScript to JavaScript
npm run build

# Start the server
npm start
```

The server will start on `http://localhost:5000`

## 📚 API Documentation

### Swagger UI
Once the server is running, access the interactive API documentation at:
```
http://localhost:5000/api-docs
```

### Base URL
```
http://localhost:5000/api
```

## 🔐 API Endpoints

### Authentication
- `POST /api/accounts/login` - Authenticate with card number and PIN

### Accounts
- `POST /api/accounts` - Create new account
- `GET /api/accounts/:accountNumber` - Get account details
- `GET /api/accounts` - List all accounts (Admin, requires auth)
- `POST /api/accounts/:cardNumber/block` - Block account card
- `POST /api/accounts/:cardNumber/unblock` - Unblock account card (Admin)
- `PUT /api/accounts/:cardNumber/pin` - Update PIN (authenticated)
- `POST /api/accounts/:cardNumber/pin/reset` - Reset PIN (forgot PIN)
- `GET /api/accounts/:cardNumber/balance` - Get balance (authenticated)

### Transactions
- `POST /api/transactions/:cardNumber/deposit` - Deposit money (authenticated)
- `POST /api/transactions/:cardNumber/withdraw` - Withdraw money (authenticated)
- `GET /api/transactions/:cardNumber` - Get transaction history (authenticated)
- `GET /api/transactions` - Get all transactions (Admin, authenticated)
- `POST /api/transactions/cardless-deposit` - Cardless deposit

## 🔑 Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Example Login Flow
```bash
# 1. Login to get token
curl -X POST http://localhost:5000/api/accounts/login \
  -H "Content-Type: application/json" \
  -d '{"card_number":"4000000000000001","pin":"1234"}'

# 2. Use token in subsequent requests
curl http://localhost:5000/api/accounts/4000000000000001/balance \
  -H "Authorization: Bearer <token_from_login>"
```

## 💼 Business Rules

### Account Creation
- Minimum initial deposit: **100 TK**
- Phone, email, and NID must be unique

### PIN Security
- PIN is **4 digits**
- Stored as **bcrypt hash**
- **3 failed attempts** blocks the card permanently

### Deposit Limits
- Per transaction: **500 - 25,000 TK**
- Must be **multiple of 500**
- Daily limit: **50,000 TK** or **5 transactions**

### Withdrawal Limits
- Per transaction: **500 - 25,000 TK**
- Must be **multiple of 500**
- Must maintain **minimum balance of 500 TK**
- Daily limit: **50,000 TK** or **5 transactions**

### Cardless Deposit
- Verify by **account number** + **last 4 digits of NID**
- Same limits as regular deposit

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Database and Swagger configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, validation, error handling
│   ├── models/          # TypeScript interfaces
│   ├── routes/          # Express routers
│   ├── services/        # Business logic
│   ├── types/           # Custom TypeScript types
│   ├── utils/           # Helper functions (security, logging)
│   └── index.ts         # Application entry point
├── database/
│   ├── migrate.ts       # Database migration script
│   └── seed.ts          # Sample data seeder
├── logs/                # Application logs (auto-created)
├── .env.example         # Environment variables template
├── package.json
└── tsconfig.json
```

## 🧪 Testing

```bash
npm test
```

## 📝 Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm start` | Start production server |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Seed sample data |
| `npm test` | Run tests |
| `npm run lint` | Run linter |

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Token-based auth
- **Rate Limiting**: Prevents brute-force attacks
- **Helmet**: Sets secure HTTP headers
- **CORS**: Configurable cross-origin requests
- **Input Validation**: express-validator on all endpoints
- **SQL Injection Protection**: Parameterized queries via mysql2

## 🐛 Error Handling

All errors return a consistent JSON format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

## 📊 Logging

Logs are stored in the `logs/` directory:
- `logs/error.log` - Error-level logs only
- `logs/combined.log` - All logs

Console logging is enabled in development mode.

## 🤝 Sample Accounts (After Seeding)

| Card Number | PIN | Name | Balance |
|-------------|-----|------|---------|
| 4000000000000001 | 1234 | John Doe | 10,000 TK |
| 4000000000000002 | 1234 | Jane Smith | 25,000 TK |

## 📄 License

ISC

## 👨‍💻 Author

ATM Management System Backend

---

## 🚦 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
copy .env.example .env
# Edit .env with your MySQL credentials

# 3. Start server (auto-creates database)
npm run dev

# 4. Access Swagger UI
# http://localhost:5000/api-docs
```
